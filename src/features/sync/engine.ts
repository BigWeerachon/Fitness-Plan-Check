import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { getDb, transaction } from '../../db/client';
import { onLocalWrite } from '../../db/mutations';
import { LOCAL_OWNER } from '../../db/owner';
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
import { now } from '../../utils/clock';
import { fromRemote, toRemote } from './mapping';

/**
 * Sync engine แบบ offline-first (SPEC L, J6, B11)
 * 1) push: ส่งแถวจากคิว sync_outbox ขึ้นคลาวด์ทีละตาราง (พ่อก่อนลูก) — ลบออกจากคิวเมื่อสำเร็จเท่านั้น
 * 2) pull: ดึงแถวที่ server_updated_at > เคอร์เซอร์ แล้ว merge แบบ last-write-wins ต่อระเบียน
 * ล้มเหลว = ข้อมูลในเครื่องไม่ถูกแตะ คิวยังอยู่ ลองใหม่แบบ backoff
 */

const PAGE = 500;
const PUSH_BATCH = 200;
/** ลำดับเวลารอก่อนลองใหม่ (ms) */
export const BACKOFF_MS = [5_000, 15_000, 60_000, 5 * 60_000, 10 * 60_000];
const DEBOUNCE_MS = 2_000;

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
  return getDb().select().from(syncOutbox).where(eq(syncOutbox.ownerId, userId)).all().length;
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
      for (const r of rows) {
        getDb()
          .insert(syncOutbox)
          .values({ tableName: name, rowId: r.id, ownerId: userId, queuedAt: now(), attempts: 0 })
          .onConflictDoUpdate({
            target: [syncOutbox.tableName, syncOutbox.rowId],
            set: { ownerId: userId, queuedAt: now(), attempts: 0 },
          })
          .run();
      }
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

async function push(userId: string): Promise<void> {
  const { sync } = getServices();
  for (const name of SYNCED_TABLE_NAMES) {
    for (;;) {
      const queued = getDb()
        .select()
        .from(syncOutbox)
        .where(and(eq(syncOutbox.ownerId, userId), eq(syncOutbox.tableName, name)))
        .orderBy(asc(syncOutbox.id))
        .limit(PUSH_BATCH)
        .all();
      if (queued.length === 0) break;
      const t = tableOf(name);
      const ids = queued.map((q) => q.rowId);
      const rows = getDb()
        .select()
        .from(t)
        .where(and(inArray(t.id, ids), eq(t.ownerId, userId)))
        .all() as Record<string, unknown>[];
      const maxQueuedAt = Math.max(...queued.map((q) => q.queuedAt));
      try {
        await sync.push(
          name,
          userId,
          rows.map((r) => toRemote(name, r, userId)),
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        for (const q of queued) {
          getDb()
            .update(syncOutbox)
            .set({ attempts: q.attempts + 1, lastError: message })
            .where(eq(syncOutbox.id, q.id))
            .run();
        }
        throw e;
      }
      // ลบเฉพาะรายการที่ไม่ถูกแก้เพิ่มระหว่างส่ง (ถ้าแก้ใหม่ queuedAt จะใหม่กว่า → ส่งรอบหน้า)
      getDb()
        .delete(syncOutbox)
        .where(
          and(
            eq(syncOutbox.ownerId, userId),
            eq(syncOutbox.tableName, name),
            inArray(syncOutbox.rowId, ids),
            lte(syncOutbox.queuedAt, maxQueuedAt),
          ),
        )
        .run();
      if (queued.length < PUSH_BATCH) break;
    }
  }
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
  let applied = 0;
  for (const name of SYNCED_TABLE_NAMES) {
    const stored = getCursor(userId, name);
    let cursor = sync.startCursor ? sync.startCursor(stored) : stored;
    for (;;) {
      const page = await sync.pull(name, userId, cursor, PAGE);
      transaction(() => {
        for (const r of page.rows) if (mergeRemoteRow(name, r, userId) === 'applied') applied++;
        // หน้าว่างไม่บันทึก — กันเคอร์เซอร์ที่ถูกย้อน (startCursor) ถอยหลังสะสมทุกรอบ
        if (page.rows.length > 0) setCursor(userId, name, page.cursor);
      });
      cursor = page.cursor;
      if (page.rows.length < PAGE) break;
    }
  }
  return applied;
}

let inFlight: Promise<SyncOutcome> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let ctx: SyncContext | null = null;

export type SyncOutcome = 'synced' | 'disabled' | 'offline' | 'denied' | 'error';

/** ตั้งค่า engine (เรียกครั้งเดียวตอนเปิดแอป) และตั้งเวลาซิงก์เมื่อมีการเขียนข้อมูล */
export function configureSync(context: SyncContext): () => void {
  ctx = context;
  failures = 0;
  const off = onLocalWrite(() => {
    const userId = ctx?.userId();
    if (userId) useSync.getState().set({ pending: pendingCount(userId) });
    requestSync(DEBOUNCE_MS);
  });
  return () => {
    off();
    if (timer) clearTimeout(timer);
    timer = null;
    ctx = null;
  };
}

/** ขอให้ซิงก์ภายใน delay ms (รวมหลายคำขอเป็นครั้งเดียว) */
export function requestSync(delay = 0): void {
  if (!ctx) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delay);
}

function scheduleRetry() {
  const delay = BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)];
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

async function runSync(): Promise<SyncOutcome> {
  const store = useSync.getState();
  const userId = ctx?.userId() ?? null;
  if (!ctx || !userId || !ctx.canSync()) {
    store.set({ status: 'disabled', pending: userId ? pendingCount(userId) : 0 });
    return 'disabled';
  }
  store.set({ status: 'syncing', lastError: null });
  try {
    await push(userId);
    const applied = await pull(userId);
    if (applied > 0) notifyDataChanged();
    failures = 0;
    useSync
      .getState()
      .set({ status: 'idle', lastSyncedAt: now(), pending: pendingCount(userId), nextRetryAt: null });
    return 'synced';
  } catch (e) {
    failures++;
    const pending = pendingCount(userId);
    if (e instanceof SyncNetworkError) {
      useSync.getState().set({ status: 'offline', pending, lastError: e.message });
      scheduleRetry();
      return 'offline';
    }
    if (e instanceof SyncAccessDeniedError) {
      useSync.getState().set({ status: 'waiting', pending, lastError: e.message });
      scheduleRetry();
      return 'denied';
    }
    useSync
      .getState()
      .set({ status: 'error', pending, lastError: e instanceof Error ? e.message : String(e) });
    scheduleRetry();
    return 'error';
  }
}

/** สำหรับเทสต์ */
export function resetSyncForTests(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  inFlight = null;
  failures = 0;
  ctx = null;
}
