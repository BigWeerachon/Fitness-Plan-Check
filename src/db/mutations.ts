import { and, eq, isNull, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { now } from '../utils/clock';
import { newId } from '../utils/id';
import { getDb } from './client';
import { getOwner } from './owner';
import { SYNCED_TABLES, syncOutbox, type SyncedTableName } from './schema';

/**
 * จุดเดียวที่เขียนข้อมูลตารางที่ซิงก์ — ทุกการเขียนจะ:
 * 1) ประทับ owner/updatedAt (last-write-wins ต่อระเบียน)
 * 2) ใส่คิว sync_outbox ในเครื่อง (ลบออกเมื่อส่งขึ้นคลาวด์สำเร็จเท่านั้น → ซิงก์ล้มเหลวข้อมูลไม่หาย)
 * การลบเป็น soft delete (deletedAt) เพื่อให้การลบซิงก์ไปเครื่องอื่นได้
 */

type TableOf<N extends SyncedTableName> = (typeof SYNCED_TABLES)[N];
export type RowOf<N extends SyncedTableName> = InferSelectModel<TableOf<N>>;
type InsertOf<N extends SyncedTableName> = InferInsertModel<TableOf<N>>;
type Managed = 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'deletedAt';
export type CreateInput<N extends SyncedTableName> = Omit<InsertOf<N>, Managed> & { id?: string };
export type PatchInput<N extends SyncedTableName> = Partial<Omit<InsertOf<N>, Managed>>;

// Drizzle ไม่ infer ชนิดได้ดีเมื่อ table เป็น union ของหลายตาราง จึงใช้ตัวแทนแบบหลวมภายในไฟล์นี้เท่านั้น
type AnyTable = any;
function tableOf(name: SyncedTableName): AnyTable {
  return SYNCED_TABLES[name];
}

export function enqueue(name: SyncedTableName, rowId: string, ownerId = getOwner()): void {
  getDb()
    .insert(syncOutbox)
    .values({ tableName: name, rowId, ownerId, queuedAt: now(), attempts: 0, lastError: null })
    .onConflictDoUpdate({
      target: [syncOutbox.tableName, syncOutbox.rowId],
      set: { queuedAt: now(), attempts: 0, lastError: null, ownerId },
    })
    .run();
}

export function getRow<N extends SyncedTableName>(
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

export function createRow<N extends SyncedTableName>(name: N, values: CreateInput<N>): RowOf<N> {
  const ts = now();
  const id = values.id ?? newId();
  const row = { ...values, id, ownerId: getOwner(), createdAt: ts, updatedAt: ts, deletedAt: null };
  getDb().insert(tableOf(name)).values(row).run();
  enqueue(name, id);
  return getRow(name, id) as RowOf<N>;
}

/** เวลาแก้ไขต้องเพิ่มขึ้นเสมอ แม้นาฬิกาเครื่องถูกตั้งย้อน (ไม่งั้น LWW จะทิ้งการแก้ไขล่าสุด) */
function nextUpdatedAt(prev: number | undefined): number {
  const ts = now();
  return prev !== undefined && ts <= prev ? prev + 1 : ts;
}

export function updateRow<N extends SyncedTableName>(
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
  enqueue(name, id);
  return getRow(name, id, { includeDeleted: true });
}

export function softDeleteRow(name: SyncedTableName, id: string): void {
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
  enqueue(name, id);
}

/** แถวทั้งหมดของเจ้าของปัจจุบันที่ยังไม่ถูกลบ */
export function listRows<N extends SyncedTableName>(name: N): RowOf<N>[] {
  const t = tableOf(name);
  return getDb()
    .select()
    .from(t)
    .where(and(eq(t.ownerId, getOwner()), isNull(t.deletedAt)))
    .all() as RowOf<N>[];
}
