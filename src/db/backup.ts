import { and, asc, eq, getTableColumns, is, isNull, SQL } from 'drizzle-orm';
import {
  buildBackup,
  type ArrayItemKind,
  type BackupFile,
  type BackupRow,
  type BackupSpec,
  type ColumnKind,
  type ColumnSpec,
  type SettingKind,
  type TableSpec,
} from '../domain/backup';
import { getDb, transaction } from './client';
import { MIGRATIONS } from './migrations.generated';
import { getOwner } from './owner';
import { settingsRepo } from './repos/settingsRepo';
import { onboardingDraft, USER_TABLE_NAMES, USER_TABLES, type UserTableName } from './schema';

/**
 * สำรอง/กู้คืนข้อมูลผู้ใช้ทั้งหมดในเครื่อง (D82)
 * - ส่งออกเฉพาะแถวที่ยังไม่ถูกลบ (deletedAt ว่าง) และไม่ใส่ ownerId (เป็น 'local' เสมอ ไม่มีความหมายข้ามเครื่อง)
 * - กู้คืน = แทนที่ข้อมูลผู้ใช้ทั้งหมดในทรานแซกชันเดียว ล้มเหลว = ไม่มีอะไรเปลี่ยน
 */

/**
 * ค่าตั้งค่าที่ย้ายไปกับไฟล์สำรอง: สถานะ "ผ่านตั้งค่าเริ่มต้นแล้ว" (เครื่องใหม่ไม่ต้องทำขั้นตั้งค่าซ้ำ)
 * ภาษา/ธีม/สีหลัก/มุมมองสถิติเป็นค่าของเครื่อง และวันที่สำรองล่าสุดเป็นของเครื่องนี้ จึงไม่ย้าย (D82)
 */
export const BACKUP_SETTINGS = { onboardingDone: 'boolean' } as const satisfies Record<string, SettingKind>;

/**
 * schemaVersion แรกที่แอปส่งออกไฟล์สำรองได้ — ทุกไฟล์มี schemaVersion ≥ ค่านี้
 * ตารางผู้ใช้ที่เพิ่มทีหลังต้องประกาศใน TABLE_INTRODUCED_IN และคอลัมน์ NOT NULL ที่เพิ่มทีหลังต้องมีค่าเริ่มต้นแบบค่าคงที่
 * (ไม่ใช่ $defaultFn หรือ sql``) ไม่เช่นนั้นไฟล์เก่าจะกู้คืนไม่ได้ — เทสต์ __tests__/db/backup.test.ts บังคับทั้งสองข้อ
 */
export const FIRST_BACKUP_SCHEMA_VERSION = 7;

/** schemaVersion (จำนวน migration) แรกที่มีตารางผู้ใช้นั้น สำหรับตารางที่เพิ่มหลัง FIRST_BACKUP_SCHEMA_VERSION */
export const TABLE_INTRODUCED_IN: Partial<Record<UserTableName, number>> = {};

/** รูปร่างของคอลัมน์ json ในตารางผู้ใช้ (ทุกคอลัมน์ตอนนี้เป็นอาร์เรย์: ชนิดสมาชิก) — คอลัมน์ json ใหม่ต้องประกาศที่นี่ */
export const JSON_ARRAY_COLUMNS: Partial<Record<UserTableName, Record<string, ArrayItemKind>>> = {
  custom_exercise: { secondaryMuscles: 'text' },
  routine_exercise: { customWeeks: 'object' },
  week_plan: { days: 'number' },
  workout_session: { progression: 'object' },
};

/** คอลัมน์ที่ไม่ใส่ในไฟล์ (เติมใหม่ตอนกู้คืน) */
const OMITTED_COLUMNS = new Set(['ownerId']);

/** จำนวน placeholder ต่อคำสั่ง INSERT (เผื่อ SQLite รุ่นเก่าที่จำกัด 999 ตัวแปร) */
const MAX_SQL_VARIABLES = 900;

// Drizzle ไม่ infer ชนิดได้ดีเมื่อ table เป็น union ของหลายตาราง จึงใช้ตัวแทนแบบหลวมภายในไฟล์นี้เท่านั้น
type AnyTable = any;
function tableOf(name: UserTableName): AnyTable {
  return USER_TABLES[name];
}

function columnKind(dataType: string): ColumnKind {
  if (dataType === 'string') return 'text';
  if (dataType === 'number') return 'number';
  if (dataType === 'boolean') return 'boolean';
  return 'json';
}

/** ค่าเริ่มต้นที่เป็นค่าคงที่ (ใช้เติมแถวจากไฟล์เก่าได้) — $defaultFn ให้ undefined และ sql`` ให้ออบเจกต์ SQL */
export function isLiteralDefault(value: unknown): boolean {
  return value !== undefined && !is(value, SQL);
}

function tableSpec(name: UserTableName): TableSpec {
  const columns: Record<string, ColumnSpec> = {};
  for (const [key, col] of Object.entries(getTableColumns(USER_TABLES[name]))) {
    const kind = columnKind(col.dataType);
    const items = kind === 'json' ? JSON_ARRAY_COLUMNS[name]?.[key] : undefined;
    const spec: ColumnSpec =
      items === undefined
        ? { kind, nullable: !col.notNull }
        : { kind: 'array', items, nullable: !col.notNull };
    if (col.hasDefault && isLiteralDefault(col.default)) spec.default = col.default;
    columns[key] = spec;
  }
  const introducedIn = TABLE_INTRODUCED_IN[name];
  return introducedIn === undefined ? { columns } : { columns, introducedIn };
}

/** รูปแบบข้อมูลของแอปเวอร์ชันนี้ ใช้ตรวจไฟล์สำรอง (schemaVersion = จำนวน migration) */
export function backupSpec(): BackupSpec {
  const tables: Record<string, TableSpec> = {};
  for (const name of USER_TABLE_NAMES) tables[name] = tableSpec(name);
  return { schemaVersion: MIGRATIONS.length, tables, settings: BACKUP_SETTINGS };
}

function exportTable(name: UserTableName): BackupRow[] {
  const t = tableOf(name);
  const rows = getDb()
    .select()
    .from(t)
    .where(and(eq(t.ownerId, getOwner()), isNull(t.deletedAt)))
    .orderBy(asc(t.createdAt), asc(t.id))
    .all() as BackupRow[];
  return rows.map((row) => {
    const out: BackupRow = {};
    for (const [k, v] of Object.entries(row)) if (!OMITTED_COLUMNS.has(k)) out[k] = v;
    return out;
  });
}

/** อ่านข้อมูลผู้ใช้ทุกตาราง + ค่าตั้งค่าที่เป็นข้อมูลผู้ใช้ เป็นไฟล์สำรอง */
export function exportAllUserData(meta: { appVersion: string; exportedAt: number }): BackupFile {
  const tables: Record<string, BackupRow[]> = {};
  for (const name of USER_TABLE_NAMES) tables[name] = exportTable(name);
  const settings: Record<string, unknown> = {};
  for (const key of Object.keys(BACKUP_SETTINGS)) {
    const v = settingsRepo.get<unknown>(key);
    if (v !== undefined) settings[key] = v;
  }
  return buildBackup(tables, { schemaVersion: MIGRATIONS.length, settings, ...meta });
}

function insertRows(name: UserTableName, rows: BackupRow[]): void {
  if (rows.length === 0) return;
  const owner = getOwner();
  const owned = rows.map((r) => ({ ...r, ownerId: owner }));
  const perRow = Object.keys(getTableColumns(USER_TABLES[name])).length;
  const chunk = Math.max(1, Math.floor(MAX_SQL_VARIABLES / perRow));
  for (let i = 0; i < owned.length; i += chunk) {
    getDb()
      .insert(tableOf(name))
      .values(owned.slice(i, i + chunk))
      .run();
  }
}

/**
 * แทนที่ข้อมูลผู้ใช้ทั้งหมดด้วยไฟล์สำรอง (ต้องผ่าน parseBackup มาแล้ว) ในทรานแซกชันเดียว:
 * ลบทุกแถวของตารางผู้ใช้ (รวมแถวที่ soft delete) + ร่างตั้งค่าเริ่มต้น แล้วใส่แถวจากไฟล์โดยเป็นของเจ้าของในเครื่อง
 * ค่า onboardingDone ตั้งเป็น true ได้แต่ไม่ย้อนเครื่องที่ตั้งค่าเสร็จแล้วกลับไปขั้นแรก
 * วันที่สำรองล่าสุด = วันที่ของไฟล์นี้ (ข้อมูลในเครื่องตรงกับไฟล์นั้นแล้ว วันที่เดิมเป็นของข้อมูลชุดที่ถูกแทนที่)
 * แคชสิทธิ์ไม่ถูกแตะ (สิทธิ์มาจากบัญชีสโตร์ ไม่ใช่จากไฟล์)
 */
export function restoreAllUserData(backup: BackupFile): void {
  transaction(() => {
    for (const name of [...USER_TABLE_NAMES].reverse()) getDb().delete(USER_TABLES[name]).run();
    getDb().delete(onboardingDraft).run();
    for (const name of USER_TABLE_NAMES) insertRows(name, backup.tables[name] ?? []);
    if (backup.settings.onboardingDone === true) settingsRepo.set('onboardingDone', true);
    settingsRepo.set('lastBackupAt', backup.exportedAt);
  });
}
