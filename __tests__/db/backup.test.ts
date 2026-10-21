import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { getTableColumns } from 'drizzle-orm';
import {
  backupSpec,
  exportAllUserData,
  FIRST_BACKUP_SCHEMA_VERSION,
  isLiteralDefault,
  JSON_ARRAY_COLUMNS,
  restoreAllUserData,
  TABLE_INTRODUCED_IN,
} from '@/db/backup';
import { MIGRATIONS } from '@/db/migrations.generated';
import { settingsRepo } from '@/db/repos/settingsRepo';
import { programRepo } from '@/db/repos/programRepo';
import { USER_TABLE_NAMES, USER_TABLES, type UserTableName } from '@/db/schema';
import { parseBackup, serializeBackup, type BackupFile } from '@/domain/backup';
import { draftRepo } from '@/features/onboarding/draft';
import { setClockForTests } from '@/utils/clock';
import { freshEnv } from '../helpers/env';
import { dumpUserTables, liveUserRows, populateRichData } from '../helpers/richData';

const META = { appVersion: '1.0.0', exportedAt: new Date('2026-10-09T09:30:00').getTime() };

function parseOrThrow(text: string): BackupFile {
  const r = parseBackup(text, backupSpec());
  if (!r.ok) throw new Error(`backup rejected: ${r.reason} ${r.detail ?? ''}`);
  return r.backup;
}

describe('backup export / restore against real SQLite (D82)', () => {
  beforeEach(() => {
    setClockForTests(() => new Date('2026-10-09T09:00:00').getTime());
    freshEnv('lifetime');
  });
  afterEach(() => setClockForTests(null));

  it('spec follows the schema: one entry per user table, schemaVersion = migration count', () => {
    const spec = backupSpec();
    expect(spec.schemaVersion).toBe(MIGRATIONS.length);
    expect(Object.keys(spec.tables)).toEqual(USER_TABLE_NAMES);
    expect(spec.tables.week_plan.columns.days).toEqual({
      kind: 'array',
      items: 'number',
      nullable: false,
      default: [],
    });
    expect(spec.tables.routine_exercise.columns.customWeeks).toEqual({
      kind: 'array',
      items: 'object',
      nullable: true,
    });
    expect(spec.tables.session_set.columns.done).toEqual({
      kind: 'boolean',
      nullable: false,
      default: false,
    });
    expect(spec.tables.profile.columns.age).toEqual({ kind: 'number', nullable: true });
  });

  it('round-trips a rich data set onto a fresh phone (export → wipe → restore → identical)', () => {
    const { deletedIds } = populateRichData();
    const before = liveUserRows();
    for (const name of USER_TABLE_NAMES) expect([name, before[name].length > 0]).toEqual([name, true]);

    const backup = exportAllUserData(META);
    expect(backup.schemaVersion).toBe(MIGRATIONS.length);
    expect(backup.settings).toEqual({ onboardingDone: true });
    // แถวที่ถูกลบไม่ติดไปกับไฟล์ และไม่มี ownerId
    expect(backup.tables.custom_exercise.map((r) => r.id)).not.toEqual(expect.arrayContaining(deletedIds));
    expect(backup.tables.profile[0]).not.toHaveProperty('ownerId');
    const text = serializeBackup(backup);

    // เครื่องใหม่: ฐานข้อมูลว่าง
    freshEnv('lifetime');
    expect(Object.values(dumpUserTables()).every((rows) => rows.length === 0)).toBe(true);
    restoreAllUserData(parseOrThrow(text));

    expect(dumpUserTables()).toEqual(before);
    expect(settingsRepo.get('onboardingDone')).toBe(true);
    // JSON/boolean คืนเป็นชนิดเดิม
    const re = dumpUserTables().routine_exercise.find((r) => r.progressionMode === 'custom')!;
    expect(re.customWeeks).toEqual([
      { reps: 8, percent: 100 },
      { reps: 6, percent: 105 },
    ]);
  });

  it('replaces everything already on the phone, including soft-deleted rows and the onboarding draft', () => {
    populateRichData();
    const backup = parseOrThrow(serializeBackup(exportAllUserData(META)));
    const expected = liveUserRows();

    // ข้อมูลเปลี่ยนไปหลังสำรอง
    programRepo.create('Made after the backup');
    draftRepo.save({ age: 99 });
    restoreAllUserData(backup);

    expect(dumpUserTables()).toEqual(expected);
    expect(programRepo.list().map((p) => p.name)).not.toContain('Made after the backup');
    expect(draftRepo.get()).toBeNull();
  });

  it('sets the last backup date to the restored file’s date (the old date belonged to the replaced data)', () => {
    populateRichData();
    settingsRepo.set('lastBackupAt', META.exportedAt + 5_000);
    const older = parseOrThrow(
      serializeBackup(exportAllUserData({ ...META, exportedAt: META.exportedAt - 86_400_000 })),
    );
    restoreAllUserData(older);
    expect(settingsRepo.get('lastBackupAt')).toBe(META.exportedAt - 86_400_000);
  });

  it('rejects a damaged file whose json array columns have the wrong shape (nothing restored)', () => {
    populateRichData();
    const backup = exportAllUserData(META);
    const damaged = (table: string, col: string, value: unknown) =>
      JSON.stringify({
        ...backup,
        tables: {
          ...backup.tables,
          [table]: backup.tables[table].map((r, i) => (i === 0 ? { ...r, [col]: value } : r)),
        },
      });
    for (const [table, col, value] of [
      ['week_plan', 'days', { a: 1 }],
      ['week_plan', 'days', ['1']],
      ['custom_exercise', 'secondaryMuscles', 'chest'],
      ['routine_exercise', 'customWeeks', [8, 6]],
      ['workout_session', 'progression', { sessionExerciseId: 'x' }],
    ] as const) {
      expect([table, col, parseBackup(damaged(table, col, value), backupSpec())]).toEqual([
        table,
        col,
        { ok: false, reason: 'badRows', detail: expect.stringContaining(`.${col}`) },
      ]);
    }
  });

  it('never resets a finished setup back to onboarding', () => {
    populateRichData();
    const backup = parseOrThrow(serializeBackup(exportAllUserData(META)));
    restoreAllUserData({ ...backup, settings: { onboardingDone: false } });
    expect(settingsRepo.get('onboardingDone')).toBe(true);
  });

  it('rolls back completely when any insert fails (nothing changes)', () => {
    populateRichData();
    const before = dumpUserTables();
    const good = parseOrThrow(serializeBackup(exportAllUserData(META)));
    // ตารางท้ายๆ มีแถวที่ใส่ไม่ได้ (ขาดคอลัมน์บังคับ) → ตารางก่อนหน้าถูกลบ/ใส่ไปแล้วต้องย้อนคืนทั้งหมด
    const broken: BackupFile = {
      ...good,
      tables: { ...good.tables, daily_log: [{ id: 'bad', createdAt: 1, updatedAt: 1 }] },
    };
    expect(() => restoreAllUserData(broken)).toThrow();
    expect(dumpUserTables()).toEqual(before);
  });

  it('accepts a backup from an older schema version (missing columns get their defaults)', () => {
    populateRichData();
    const backup = exportAllUserData(META);
    const old = {
      ...backup,
      schemaVersion: MIGRATIONS.length - 1,
      tables: {
        ...backup.tables,
        // สมมุติคอลัมน์ที่เพิ่มทีหลังยังไม่มีในไฟล์เก่า
        routine_exercise: backup.tables.routine_exercise.map(
          ({ failStreak: _f, restSec: _r, ...rest }) => rest,
        ),
      },
    };
    freshEnv('lifetime');
    restoreAllUserData(parseOrThrow(JSON.stringify(old)));
    const rows = dumpUserTables().routine_exercise;
    expect(rows.length).toBe(backup.tables.routine_exercise.length);
    expect(rows.every((r) => r.failStreak === 0 && r.restSec === null)).toBe(true);
  });
});

const ROW = ['id', 'ownerId', 'createdAt', 'updatedAt', 'deletedAt'];
/**
 * schema ของตารางผู้ใช้ ณ FIRST_BACKUP_SCHEMA_VERSION (แอปเวอร์ชันแรกที่สำรองข้อมูลได้) — ห้ามแก้รายการนี้
 * ไฟล์สำรองทุกไฟล์มีอย่างน้อยตาราง/คอลัมน์เหล่านี้ ส่วนที่เพิ่มทีหลังต้องเข้ากับไฟล์เก่าได้ (CLAUDE.md, D82)
 */
// prettier-ignore
const BASELINE: Record<string, string[]> = {
  profile: [...ROW, 'sex', 'age', 'heightCm', 'weightKg', 'activityLevel', 'goal', 'weightUnit', 'lengthUnit', 'deficitPct', 'surplusPct', 'proteinPerKg', 'fatPct', 'metLight', 'metModerate', 'metHard', 'restTimerEnabled', 'restTimerSec', 'weekStart', 'weightStepKg', 'activeProgramId'],
  custom_exercise: [...ROW, 'name', 'primaryMuscle', 'secondaryMuscles', 'equipment', 'notes'],
  program: [...ROW, 'name', 'templateKey', 'sortOrder'],
  routine: [...ROW, 'programId', 'name', 'type', 'sortOrder'],
  routine_exercise: [...ROW, 'routineId', 'exerciseId', 'sortOrder', 'sets', 'repMin', 'repMax', 'progressionMode', 'weightStepKg', 'rir', 'rpe', 'restSec', 'customWeeks', 'baseWeightKg', 'targetWeightKg', 'targetReps', 'failStreak', 'progressionStartedAt'],
  week_plan: [...ROW, 'programId', 'routineId', 'days', 'enabled', 'sortOrder'],
  day_override: [...ROW, 'date', 'kind', 'routineId'],
  workout_session: [...ROW, 'date', 'routineId', 'programId', 'programName', 'routineName', 'routineType', 'startedAt', 'endedAt', 'durationSec', 'intensity', 'kcal', 'bodyWeightKg', 'status', 'backfilled', 'progression'],
  session_exercise: [...ROW, 'sessionId', 'exerciseId', 'exerciseName', 'muscleGroup', 'routineExerciseId', 'sortOrder', 'restSec'],
  session_set: [...ROW, 'sessionId', 'sessionExerciseId', 'exerciseId', 'muscleGroup', 'setIndex', 'weightKg', 'reps', 'targetWeightKg', 'targetReps', 'prevWeightKg', 'prevReps', 'done', 'completedAt'],
  daily_log: [...ROW, 'date', 'kcalExpenditureOverride', 'kcalIntake', 'bodyWeightKg'],
};

describe('schema changes keep older backup files restorable (D82)', () => {
  it('the first backup-capable schema version is in the past', () => {
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(FIRST_BACKUP_SCHEMA_VERSION);
  });

  it('every user table added after the baseline declares introducedIn (> baseline)', () => {
    for (const name of USER_TABLE_NAMES) {
      if (name in BASELINE) continue;
      const v = TABLE_INTRODUCED_IN[name];
      expect([name, v !== undefined && v > FIRST_BACKUP_SCHEMA_VERSION && v <= MIGRATIONS.length]).toEqual([
        name,
        true,
      ]);
      expect(backupSpec().tables[name].introducedIn).toBe(v);
    }
    // ตารางในชุดแรกห้ามประกาศ introducedIn (ไฟล์ทุกไฟล์ต้องมี)
    for (const name of Object.keys(TABLE_INTRODUCED_IN))
      expect([name, name in BASELINE]).toEqual([name, false]);
  });

  it('every NOT NULL column added after the baseline has a literal default (not $defaultFn or sql``)', () => {
    for (const name of USER_TABLE_NAMES) {
      const baseline = new Set(BASELINE[name] ?? []);
      for (const [key, col] of Object.entries(getTableColumns(USER_TABLES[name]))) {
        if (baseline.has(key) || !col.notNull || key === 'ownerId') continue;
        expect([name, key, col.hasDefault && isLiteralDefault(col.default)]).toEqual([name, key, true]);
      }
    }
  });

  it('every json column of a user table declares its array shape', () => {
    for (const name of USER_TABLE_NAMES) {
      for (const [key, col] of Object.entries(getTableColumns(USER_TABLES[name]))) {
        if (col.dataType !== 'json') continue;
        expect([name, key, JSON_ARRAY_COLUMNS[name as UserTableName]?.[key]]).toEqual([
          name,
          key,
          expect.any(String),
        ]);
      }
    }
  });
});
