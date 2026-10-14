import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { softDeleteRow, updateRow } from '@/db/mutations';
import { customExerciseRepo } from '@/db/repos/customExerciseRepo';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import { routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { dayOverrideRepo, weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { USER_TABLE_NAMES, USER_TABLES } from '@/db/schema';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { finishSession } from '@/features/session/finish';
import { startSession } from '@/features/session/sessionFlow';
import { useSettings } from '@/stores/settings';

/**
 * ข้อมูลครบทุกตารางผู้ใช้ (รวมคอลัมน์ JSON/boolean/null และแถวที่ soft delete) สำหรับเทสต์สำรอง/กู้คืน
 * คืน id ของแถวที่ถูกลบไว้ตรวจว่าไม่ติดไปกับไฟล์
 */
export function populateRichData(): { deletedIds: string[] } {
  profileRepo.update({
    sex: 'female',
    age: 31,
    heightCm: 168,
    weightKg: 61.5,
    goal: 'gain',
    weightUnit: 'lb',
  });
  const program = instantiateTemplate('ppl3', 'en', { activate: true })!;
  const [push, pull] = routineRepo.listByProgram(program.id);
  const [firstEx] = routineExerciseRepo.listByRoutine(push.id);
  routineExerciseRepo.update(firstEx.id, {
    progressionMode: 'custom',
    customWeeks: [
      { reps: 8, percent: 100 },
      { reps: 6, percent: 105 },
    ],
    baseWeightKg: 40,
    restSec: 120,
  });
  weekPlanRepo.ensureEntry(program.id, push.id, [1, 4]);
  weekPlanRepo.ensureEntry(program.id, pull.id, [2]);
  dayOverrideRepo.set('2026-10-10', 'rest');
  dayOverrideRepo.set('2026-10-11', 'routine', pull.id);
  customExerciseRepo.create({
    name: 'Farmer carry',
    primaryMuscle: 'forearms',
    secondaryMuscles: ['core', 'back'],
    equipment: 'kettlebell',
  });
  const gone = customExerciseRepo.create({ name: 'Sled push', primaryMuscle: 'quads' });
  softDeleteRow('custom_exercise', gone.id);

  const { session } = startSession({ routineId: push.id });
  const sets = sessionRepo.setsInSession(session.id);
  sets.forEach((set, i) => updateRow('session_set', set.id, { weightKg: 40 + i, reps: 8, done: true }));
  finishSession(session.id, 'hard', 3600);
  const backfill = startSession({ routineId: null, date: '2026-10-05' }).session;
  finishSession(backfill.id, 'light', 1200);

  dailyLogRepo.upsert('2026-10-08', { kcalIntake: 2300, bodyWeightKg: 61 });
  dailyLogRepo.upsert('2026-10-09', { kcalExpenditureOverride: 2600 });
  useSettings.getState().set('onboardingDone', true);
  return { deletedIds: [gone.id] };
}

/** ทุกแถวของทุกตารางผู้ใช้ (รวมที่ถูกลบ) เรียงตาม id — ใช้เทียบก่อน/หลัง */
export function dumpUserTables(): Record<string, Record<string, unknown>[]> {
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const name of USER_TABLE_NAMES) {
    const t = USER_TABLES[name];
    out[name] = getDb().select().from(t).orderBy(asc(t.id)).all() as Record<string, unknown>[];
  }
  return out;
}

/** แถวที่ยังไม่ถูกลบของทุกตาราง — สิ่งที่ไฟล์สำรองพาไปและกู้คืนกลับมา */
export function liveUserRows(): Record<string, Record<string, unknown>[]> {
  const all = dumpUserTables();
  for (const name of Object.keys(all)) all[name] = all[name].filter((r) => r.deletedAt === null);
  return all;
}
