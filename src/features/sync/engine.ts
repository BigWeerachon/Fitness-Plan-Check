import { and, asc, count, eq, gte, inArray, isNull, lt, notInArray, sql } from 'drizzle-orm';
import { getDb, transaction } from '../../db/client';
import { onLocalWrite, softDeleteRow, updateRow, upsertOutbox } from '../../db/mutations';
import { getOwner, LOCAL_OWNER } from '../../db/owner';
import {
  SYNCED_TABLE_NAMES,
  SYNCED_TABLES,
  syncOutbox,
  syncState,
  type SyncedTableName,
} from '../../db/schema';
import { getServices } from '../../services/registry';
import { SyncAccessDeniedError, SyncNetworkError, type RemoteRow } from '../../services/sync/types';
import { notifyDataChanged } from '../../stores/dataVersion';
import { useSync } from '../../stores/sync';
import { planMerge } from '../../domain/recordMerge';
import { now } from '../../utils/clock';
import { fromRemote, toRemote } from './mapping';

/**
 * Sync engine แบบ offline-first (SPEC L, J6, B11)
 * 1) push: ส่งแถวจากคิว sync_outbox ขึ้นคลาวด์ทีละตาราง (พ่อก่อนลูก) — ลบออกจากคิวเมื่อสำเร็จเท่านั้น
 * 2) pull: ดึงแถวที่ server_updated_at > เคอร์เซอร์ แล้ว merge แบบ last-write-wins ต่อระเบียน
 * ล้มเหลว = ข้อมูลในเครื่องไม่ถูกแตะ คิวยังอยู่ ลองใหม่แบบ backoff
 */

const PULL_PAGE_SIZE = 500;
const PUSH_BATCH = 200;
/** ลำดับเวลารอก่อนลองใหม่ (ms) */
export const BACKOFF_MS = [5_000, 15_000, 60_000, 5 * 60_000, 10 * 60_000];
const DEBOUNCE_MS = 2_000;
/** แถวที่เซิร์ฟเวอร์ปฏิเสธซ้ำเกินจำนวนนี้ถือว่า "เสีย" — ข้ามไม่ส่งซ้ำ แต่ยังอยู่ในคิวและนับเป็นรอส่ง (แก้ไขแถวนั้นแล้วจะลองใหม่) */
export const MAX_ATTEMPTS = 5;

type AnyTable = any;
const tableOf = (name: SyncedTableName): AnyTable => SYNCED_TABLES[name];

export interface SyncContext {
  /** id ผู้ใช้ที่ล็อกอิน (null = ไม่ซิงก์) */
  userId: () => string | null;
  /** มีสิทธิ์ซิงก์หรือไม่ (ตัดสินจาก useAccess เท่านั้น) */
  canSync: () => boolean;
}

function cursorKey(userId: string, table: SyncedTableName) {
  return `cursor:${userId}:${table}`;
}

function getCursor(userId: string, table: SyncedTableName): string | null {
  const row = getDb()
    .select()
    .from(syncState)
    .where(eq(syncState.key, cursorKey(userId, table)))
    .get();
  return row?.value ?? null;
}

function setCursor(userId: string, table: SyncedTableName, value: string | null) {
  if (value === null) return;
  getDb()
    .insert(syncState)
    .values({ key: cursorKey(userId, table), value })
    .onConflictDoUpdate({ target: syncState.key, set: { value } })
    .run();
}

export function pendingCount(userId: string): number {
  const row = getDb().select({ n: count() }).from(syncOutbox).where(eq(syncOutbox.ownerId, userId)).get();
  return row?.n ?? 0;
}

/** ผูกแถวที่สร้างก่อนล็อกอิน ('local') เข้ากับบัญชี แล้วใส่คิวซิงก์ */
export function claimLocalRows(userId: string): number {
  let claimed = 0;
  transaction(() => {
    for (const name of SYNCED_TABLE_NAMES) {
      const t = tableOf(name);
      const rows = getDb().select({ id: t.id }).from(t).where(eq(t.ownerId, LOCAL_OWNER)).all() as {
        id: string;
      }[];
      if (rows.length === 0) continue;
      getDb().update(t).set({ ownerId: userId }).where(eq(t.ownerId, LOCAL_OWNER)).run();
      for (const r of rows) upsertOutbox(name, r.id, userId);
      claimed += rows.length;
    }
  });
  return claimed;
}

/** ลบข้อมูลในเครื่องทั้งหมดของบัญชี (หลังลบบัญชีบนเซิร์ฟเวอร์สำเร็จ SPEC B12) */
export function wipeLocalData(userId: string): void {
  transaction(() => {
    for (const name of SYNCED_TABLE_NAMES) {
      const t = tableOf(name);
      getDb().delete(t).where(eq(t.ownerId, userId)).run();
    }
    getDb().delete(syncOutbox).where(eq(syncOutbox.ownerId, userId)).run();
    for (const name of SYNCED_TABLE_NAMES)
      getDb()
        .delete(syncState)
        .where(eq(syncState.key, cursorKey(userId, name)))
        .run();
  });
}

type QueuedRow = typeof syncOutbox.$inferSelect;

const asError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));
const isTransient = (e: unknown) => e instanceof SyncNetworkError || e instanceof SyncAccessDeniedError;

/** ลบออกจากคิวเฉพาะรายการที่ version ไม่เปลี่ยนระหว่างส่ง (ถ้าถูกแก้ใหม่ version จะเพิ่ม → ส่งรอบหน้า) */
function clearSent(sent: QueuedRow[]) {
  for (const q of sent) {
    getDb()
      .delete(syncOutbox)
      .where(and(eq(syncOutbox.id, q.id), eq(syncOutbox.version, q.version)))
      .run();
  }
}

/** error ชั่วคราว (ออฟไลน์/ไม่มีสิทธิ์) ไม่นับครั้งที่ล้มเหลว ไม่งั้นออฟไลน์นานๆ จะทำให้ทุกแถวถูกมองว่าเสีย */
function recordFailure(q: QueuedRow, e: unknown) {
  const counted = !isTransient(e);
  getDb()
    .update(syncOutbox)
    .set({
      lastError: asError(e).message,
      ...(counted ? { attempts: sql`${syncOutbox.attempts} + 1` } : {}),
    })
    .where(and(eq(syncOutbox.id, q.id), eq(syncOutbox.version, q.version)))
    .run();
}

async function pushRows(name: SyncedTableName, userId: string, queued: QueuedRow[]): Promise<void> {
  const { sync } = getServices();
  const t = tableOf(name);
  const ids = queued.map((q) => q.rowId);
  const rows = getDb()
    .select()
    .from(t)
    .where(and(inArray(t.id, ids), eq(t.ownerId, userId)))
    .all() as Record<string, unknown>[];
  await sync.push(
    name,
    userId,
    rows.map((r) => toRemote(name, r, userId)),
  );
  clearSent(queued);
}

/** บันทึกว่าแถวถูกเซิร์ฟเวอร์ปฏิเสธ (ไม่ใช่ error ชั่วคราว) แล้วข้ามแถวนี้ในรอบนี้ คืน error ไว้รายงาน */
function recordRejection(q: QueuedRow, e: unknown, failedIds: number[]): Error {
  recordFailure(q, e);
  failedIds.push(q.id);
  return asError(e);
}

/** ส่งทีละแถวหลังส่งเป็นชุดไม่ผ่าน: แถวที่ถูกปฏิเสธไม่บล็อกแถวอื่น คืน error แรก (error ชั่วคราว = throw ทันที) */
async function pushRowByRow(
  name: SyncedTableName,
  userId: string,
  queued: QueuedRow[],
  failedIds: number[],
): Promise<Error | null> {
  let firstError: Error | null = null;
  for (const q of queued) {
    try {
      await pushRows(name, userId, [q]);
    } catch (e) {
      if (isTransient(e)) {
        recordFailure(q, e);
        throw e;
      }
      const rejection = recordRejection(q, e, failedIds);
      firstError ??= rejection;
    }
  }
  return firstError;
}

/** ส่งคิวของตารางเดียวทีละชุด คืน error แรกของแถวที่ถูกปฏิเสธ */
async function pushTable(name: SyncedTableName, userId: string): Promise<Error | null> {
  let firstError: Error | null = null;
  const failedIds: number[] = [];
  for (;;) {
    const queued = getDb()
      .select()
      .from(syncOutbox)
      .where(
        and(
          eq(syncOutbox.ownerId, userId),
          eq(syncOutbox.tableName, name),
          lt(syncOutbox.attempts, MAX_ATTEMPTS),
          failedIds.length ? notInArray(syncOutbox.id, failedIds) : undefined,
        ),
      )
      .orderBy(asc(syncOutbox.id))
      .limit(PUSH_BATCH)
      .all();
    if (queued.length === 0) return firstError;
    try {
      await pushRows(name, userId, queued);
    } catch (e) {
      if (isTransient(e)) {
        for (const q of queued) recordFailure(q, e);
        throw e;
      }
      // ชุดเดียวที่ล้ม = แถวนั้นคือตัวปัญหาแล้ว ไม่ต้องส่งซ้ำ
      const batchError =
        queued.length === 1
          ? recordRejection(queued[0], e, failedIds)
          : await pushRowByRow(name, userId, queued, failedIds);
      firstError ??= batchError;
    }
  }
}

/** error ของแถวที่เสีย (ล้มเกิน MAX_ATTEMPTS ถูกข้ามแต่ยังอยู่ในคิว) แถวแรก หรือ null ถ้าไม่มี */
function findPoisonedRowError(userId: string): Error | null {
  const poisoned = getDb()
    .select()
    .from(syncOutbox)
    .where(and(eq(syncOutbox.ownerId, userId), gte(syncOutbox.attempts, MAX_ATTEMPTS)))
    .orderBy(asc(syncOutbox.id))
    .get();
  return poisoned ? new Error(poisoned.lastError ?? 'Sync failed') : null;
}

/**
 * ส่งคิวขึ้นคลาวด์ ออฟไลน์/ไม่มีสิทธิ์ = throw ทันที (คิวอยู่ครบ)
 * เซิร์ฟเวอร์ปฏิเสธเฉพาะบางแถว (error อื่น) = ลองส่งทีละแถว แถวที่ล้มเหลวไม่บล็อกแถวอื่น
 * แล้วคืน error แรกให้สถานะเป็น "error" (แถวที่ล้มเหลวเกิน MAX_ATTEMPTS ถูกข้ามแต่ยังอยู่ในคิว)
 */
async function push(userId: string): Promise<Error | null> {
  let firstError: Error | null = null;
  for (const name of SYNCED_TABLE_NAMES) {
    const tableError = await pushTable(name, userId);
    firstError ??= tableError;
  }
  return firstError ?? findPoisonedRowError(userId);
}

/** ตารางที่ควรมีแถวเดียวต่อกุญแจ: profile (ต่อบัญชี) และ daily_log (ต่อวัน) */
const DUPLICATE_RULES: {
  table: 'profile' | 'daily_log';
  key: (row: Record<string, unknown>) => string;
  fields: string[];
}[] = [
  {
    table: 'profile',
    key: () => 'profile',
    fields: [
      'sex',
      'age',
      'heightCm',
      'weightKg',
      'activityLevel',
      'goal',
      'weightUnit',
      'lengthUnit',
      'deficitPct',
      'surplusPct',
      'proteinPerKg',
      'fatPct',
      'metLight',
      'metModerate',
      'metHard',
      'restTimerEnabled',
      'restTimerSec',
      'weekStart',
      'weightStepKg',
      'activeProgramId',
    ],
  },
  {
    table: 'daily_log',
    key: (r) => String(r.date),
    fields: ['kcalExpenditureOverride', 'kcalIntake', 'bodyWeightKg'],
  },
];

/**
 * รวมแถวที่ควรมีแถวเดียวแต่สองเครื่องสร้างซ้ำตอนออฟไลน์ (SPEC L): รวมค่าตามความใหม่ลงแถวเก่าสุด
 * แล้ว soft delete แถวที่ซ้ำ — ทุกเครื่องเลือกแถวเดียวกันจึงลู่เข้าหากัน คืนจำนวนแถวที่ถูกรวม
 */
export function reconcileDuplicateRows(userId: string): number {
  let removed = 0;
  transaction(() => {
    for (const rule of DUPLICATE_RULES) {
      const t = tableOf(rule.table);
      const rows = getDb()
        .select()
        .from(t)
        .where(and(eq(t.ownerId, userId), isNull(t.deletedAt)))
        .all() as (Record<string, unknown> & { id: string; createdAt: number; updatedAt: number })[];
      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        const k = rule.key(r);
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      for (const group of groups.values()) {
        const plan = planMerge(group, rule.fields);
        if (!plan) continue;
        if (Object.keys(plan.patch).length > 0) updateRow(rule.table, plan.survivorId, plan.patch as never);
        for (const id of plan.duplicateIds) softDeleteRow(rule.table, id);
        removed += plan.duplicateIds.length;
      }
    }
  });
  return removed;
}

/** merge แถวจากคลาวด์แบบ last-write-wins (ไม่ใส่คิวซ้ำ) */
export function mergeRemoteRow(
  name: SyncedTableName,
  remote: RemoteRow,
  userId: string,
): 'applied' | 'skipped' {
  const t = tableOf(name);
  const local = getDb().select().from(t).where(eq(t.id, remote.id)).get() as
    { updatedAt: number; ownerId: string } | undefined;
  const incoming = fromRemote(name, remote);
  incoming.ownerId = userId;
  if (local) {
    if (local.ownerId !== userId) return 'skipped';
    if (Number(local.updatedAt) >= Number(incoming.updatedAt)) return 'skipped';
    getDb().update(t).set(incoming).where(eq(t.id, remote.id)).run();
    // ฉบับบนคลาวด์ใหม่กว่าการแก้ในคิว → เซิร์ฟเวอร์จะปฏิเสธของเก่าอยู่แล้ว ถอดออกจากคิว
    getDb()
      .delete(syncOutbox)
      .where(and(eq(syncOutbox.tableName, name), eq(syncOutbox.rowId, remote.id)))
      .run();
    return 'applied';
  }
  getDb().insert(t).values(incoming).run();
  return 'applied';
}

async function pull(userId: string): Promise<number> {
  const { sync } = getServices();
  // RLS ซ่อนแถวโดยไม่แจ้ง error ถ้าเซิร์ฟเวอร์ยังไม่ยืนยันสิทธิ์ (webhook มาช้า/หาย) — ถ้าดึงต่อ
  // เครื่องใหม่จะขึ้น "ซิงก์แล้ว" ทั้งที่ข้อมูลบนคลาวด์ถูกซ่อนอยู่ (B11) จึงถามก่อนและให้สถานะเป็น "รอ"
  if (!(await sync.hasSyncAccess(userId))) throw new SyncAccessDeniedError();
  let applied = 0;
  for (const name of SYNCED_TABLE_NAMES) {
    const stored = getCursor(userId, name);
    let cursor = sync.startCursor ? sync.startCursor(stored) : stored;
    for (;;) {
      const page = await sync.pull(name, userId, cursor, PULL_PAGE_SIZE);
      transaction(() => {
        for (const r of page.rows) if (mergeRemoteRow(name, r, userId) === 'applied') applied++;
        // หน้าว่างไม่บันทึก — กันเคอร์เซอร์ที่ถูกย้อน (startCursor) ถอยหลังสะสมทุกรอบ
        if (page.rows.length > 0) setCursor(userId, name, page.cursor);
      });
      cursor = page.cursor;
      if (page.rows.length < PULL_PAGE_SIZE) break;
    }
  }
  return applied;
}

let inFlight: Promise<SyncOutcome> | null = null;
let scheduledSyncTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveFailures = 0;
let syncContext: SyncContext | null = null;

export type SyncOutcome = 'synced' | 'disabled' | 'offline' | 'denied' | 'error';

/** ตั้งค่า engine (เรียกครั้งเดียวตอนเปิดแอป) และตั้งเวลาซิงก์เมื่อมีการเขียนข้อมูล */
export function configureSync(context: SyncContext): () => void {
  syncContext = context;
  consecutiveFailures = 0;
  const off = onLocalWrite(() => {
    const userId = syncContext?.userId();
    if (userId) useSync.getState().set({ pending: pendingCount(userId) });
    requestSync(DEBOUNCE_MS);
  });
  return () => {
    off();
    if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
    scheduledSyncTimer = null;
    syncContext = null;
  };
}

/** ขอให้ซิงก์ภายใน delay ms (รวมหลายคำขอเป็นครั้งเดียว) */
export function requestSync(delay = 0): void {
  if (!syncContext) return;
  if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
  scheduledSyncTimer = setTimeout(() => {
    scheduledSyncTimer = null;
    void syncNow();
  }, delay);
}

function scheduleRetry() {
  const delay = BACKOFF_MS[Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1)];
  useSync.getState().set({ nextRetryAt: now() + delay });
  requestSync(delay);
}

/** ซิงก์ทันที (ถ้ากำลังซิงก์อยู่จะรอรอบเดิม) */
export function syncNow(): Promise<SyncOutcome> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function classifySyncError(e: unknown): { status: 'offline' | 'waiting' | 'error'; outcome: SyncOutcome } {
  if (e instanceof SyncNetworkError) return { status: 'offline', outcome: 'offline' };
  if (e instanceof SyncAccessDeniedError) return { status: 'waiting', outcome: 'denied' };
  return { status: 'error', outcome: 'error' };
}

async function runSync(): Promise<SyncOutcome> {
  const store = useSync.getState();
  const userId = syncContext?.userId() ?? null;
  if (!syncContext || !userId || !syncContext.canSync()) {
    store.set({ status: 'disabled', pending: userId ? pendingCount(userId) : 0 });
    return 'disabled';
  }
  store.set({ status: 'syncing', lastError: null });
  try {
    const pushError = await push(userId);
    const applied = await pull(userId);
    const merged = getOwner() === userId ? reconcileDuplicateRows(userId) : 0;
    if (applied > 0 || merged > 0) notifyDataChanged();
    // ส่งบางแถวไม่สำเร็จ: ยังดึงข้อมูลได้ตามปกติ แต่สถานะต้องเป็น error (ไม่โชว์ว่าซิงก์ครบ)
    if (pushError) throw pushError;
    consecutiveFailures = 0;
    useSync
      .getState()
      .set({ status: 'idle', lastSyncedAt: now(), pending: pendingCount(userId), nextRetryAt: null });
    return 'synced';
  } catch (e) {
    consecutiveFailures++;
    const { status, outcome } = classifySyncError(e);
    useSync.getState().set({ status, pending: pendingCount(userId), lastError: asError(e).message });
    scheduleRetry();
    return outcome;
  }
}

/** สำหรับเทสต์ */
export function resetSyncForTests(): void {
  if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
  scheduledSyncTimer = null;
  inFlight = null;
  consecutiveFailures = 0;
  syncContext = null;
}
