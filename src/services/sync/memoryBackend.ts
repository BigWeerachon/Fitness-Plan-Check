import type { SyncedTableName } from '../../db/schema';
import {
  SyncAccessDeniedError,
  SyncNetworkError,
  type PullResult,
  type RemoteRow,
  type SyncBackend,
} from './types';

/**
 * คลาวด์จำลองในหน่วยความจำ ทำงานเหมือนฝั่ง Supabase:
 * - last-write-wins: เขียนทับเฉพาะเมื่อ updated_at ใหม่กว่าหรือเท่ากัน
 * - server_updated_at เพิ่มขึ้นทุกครั้งที่เขียน (ใช้เป็นเคอร์เซอร์)
 * - ปฏิเสธบัญชีที่ไม่มีสิทธิ์ (เหมือน RLS)
 */
export class MemorySyncBackend implements SyncBackend {
  private tables = new Map<string, Map<string, RemoteRow>>();
  private seq = 0;
  /** ผู้ใช้ที่มีสิทธิ์ซิงก์ (null = อนุญาตทุกคน) */
  entitledUsers: Set<string> | null = null;
  offline = false;
  failNext: Error | null = null;
  pushCount = 0;
  /** เทสต์ใส่ได้เพื่อจำลองการย้อนเคอร์เซอร์แบบ Supabase */
  startCursor?: (stored: string | null) => string | null;

  private key(table: string, userId: string) {
    return `${userId}:${table}`;
  }

  private check(userId: string) {
    if (this.offline) throw new SyncNetworkError();
    if (this.failNext) {
      const e = this.failNext;
      this.failNext = null;
      throw e;
    }
    if (this.entitledUsers && !this.entitledUsers.has(userId)) throw new SyncAccessDeniedError();
  }

  async push(table: SyncedTableName, userId: string, rows: RemoteRow[]): Promise<void> {
    this.check(userId);
    this.pushCount++;
    const k = this.key(table, userId);
    const store = this.tables.get(k) ?? new Map<string, RemoteRow>();
    for (const row of rows) {
      if (row.user_id !== userId) throw new SyncAccessDeniedError();
      const existing = store.get(row.id);
      if (existing && Number(existing.updated_at) > Number(row.updated_at)) continue;
      store.set(row.id, { ...row, server_updated_at: ++this.seq });
    }
    this.tables.set(k, store);
  }

  async pull(
    table: SyncedTableName,
    userId: string,
    since: string | null,
    limit: number,
  ): Promise<PullResult> {
    this.check(userId);
    const store = this.tables.get(this.key(table, userId));
    const from = since ? Number(since) : 0;
    const rows = [...(store?.values() ?? [])]
      .filter((r) => Number(r.server_updated_at) > from)
      .sort((a, b) => Number(a.server_updated_at) - Number(b.server_updated_at))
      .slice(0, limit);
    const last = rows[rows.length - 1];
    return { rows, cursor: last ? String(last.server_updated_at) : since };
  }

  /** ตัวช่วยเทสต์ */
  rowsOf(table: SyncedTableName, userId: string): RemoteRow[] {
    return [...(this.tables.get(this.key(table, userId))?.values() ?? [])];
  }

  deleteUser(userId: string) {
    for (const k of [...this.tables.keys()]) if (k.startsWith(`${userId}:`)) this.tables.delete(k);
  }
}
