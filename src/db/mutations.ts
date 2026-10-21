import { and, eq, isNull, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { now } from '../utils/clock';
import { newId } from '../utils/id';
import { getDb } from './client';
import { getOwner } from './owner';
import { USER_TABLES, type UserTableName } from './schema';

/**
 * จุดเดียวที่เขียนข้อมูลตารางผู้ใช้ — ทุกการเขียนประทับ owner/createdAt/updatedAt ให้อัตโนมัติ
 * แล้วแจ้ง listener ให้หน้าจอรีเฟรช (ไม่มีคิวซิงก์แล้ว — แอปออฟไลน์ล้วน D81)
 * การลบเป็น soft delete (deletedAt) ตามโครงสร้างเดิม
 */

type TableOf<N extends UserTableName> = (typeof USER_TABLES)[N];
export type RowOf<N extends UserTableName> = InferSelectModel<TableOf<N>>;
type InsertOf<N extends UserTableName> = InferInsertModel<TableOf<N>>;
/** ฟิลด์ที่ระบบจัดการเอง (ผู้เรียกไม่ต้องใส่ และต้องตัดออกเมื่อคัดลอกแถว) */
export const MANAGED_FIELDS = ['id', 'ownerId', 'createdAt', 'updatedAt', 'deletedAt'] as const;
export type Managed = (typeof MANAGED_FIELDS)[number];
export type CreateInput<N extends UserTableName> = Omit<InsertOf<N>, Managed> & { id?: string };
export type PatchInput<N extends UserTableName> = Partial<Omit<InsertOf<N>, Managed>>;

// Drizzle ไม่ infer ชนิดได้ดีเมื่อ table เป็น union ของหลายตาราง จึงใช้ตัวแทนแบบหลวมภายในไฟล์นี้เท่านั้น
type AnyTable = any;
function tableOf(name: UserTableName): AnyTable {
  return USER_TABLES[name];
}

const writeListeners = new Set<() => void>();

/** แจ้งเมื่อมีการเขียนข้อมูลผู้ใช้ (หน้าจอใช้รีเฟรชผ่าน notifyDataChanged ดู registerAppHooks) */
export function onLocalWrite(listener: () => void): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}

function notifyWrite(): void {
  writeListeners.forEach((l) => l());
}

export function getRow<N extends UserTableName>(
  name: N,
  id: string,
  opts: { includeDeleted?: boolean } = {},
): RowOf<N> | undefined {
  const t = tableOf(name);
  const where = opts.includeDeleted
    ? and(eq(t.id, id), eq(t.ownerId, getOwner()))
    : and(eq(t.id, id), eq(t.ownerId, getOwner()), isNull(t.deletedAt));
  return getDb().select().from(t).where(where).get() as RowOf<N> | undefined;
}

export function createRow<N extends UserTableName>(name: N, values: CreateInput<N>): RowOf<N> {
  const ts = now();
  const id = values.id ?? newId();
  const row = { ...values, id, ownerId: getOwner(), createdAt: ts, updatedAt: ts, deletedAt: null };
  getDb().insert(tableOf(name)).values(row).run();
  notifyWrite();
  return getRow(name, id) as RowOf<N>;
}

/** เวลาแก้ไขต้องเพิ่มขึ้นเสมอ แม้นาฬิกาเครื่องถูกตั้งย้อน (การเลือก "แถวที่แก้ล่าสุด" ใน repo พึ่งค่านี้) */
function nextUpdatedAt(prev: number | undefined): number {
  const ts = now();
  return prev !== undefined && ts <= prev ? prev + 1 : ts;
}

export function updateRow<N extends UserTableName>(
  name: N,
  id: string,
  patch: PatchInput<N>,
): RowOf<N> | undefined {
  const current = getRow(name, id, { includeDeleted: true }) as { updatedAt: number } | undefined;
  if (!current) return undefined;
  const t = tableOf(name);
  getDb()
    .update(t)
    .set({ ...patch, updatedAt: nextUpdatedAt(current.updatedAt) })
    .where(and(eq(t.id, id), eq(t.ownerId, getOwner())))
    .run();
  notifyWrite();
  return getRow(name, id, { includeDeleted: true });
}

export function softDeleteRow(name: UserTableName, id: string): void {
  const current = getRow(name, id, { includeDeleted: true }) as
    { updatedAt: number; deletedAt: number | null } | undefined;
  if (!current || current.deletedAt !== null) return;
  const t = tableOf(name);
  const ts = nextUpdatedAt(current.updatedAt);
  getDb()
    .update(t)
    .set({ deletedAt: ts, updatedAt: ts })
    .where(and(eq(t.id, id), eq(t.ownerId, getOwner())))
    .run();
  notifyWrite();
}

/** แถวทั้งหมดของเจ้าของปัจจุบันที่ยังไม่ถูกลบ */
export function listRows<N extends UserTableName>(name: N): RowOf<N>[] {
  const t = tableOf(name);
  return getDb()
    .select()
    .from(t)
    .where(and(eq(t.ownerId, getOwner()), isNull(t.deletedAt)))
    .all() as RowOf<N>[];
}
