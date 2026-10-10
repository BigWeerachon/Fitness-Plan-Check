import type { SyncedTableName } from '../../db/schema';
import { getSupabase } from '../supabase';
import { afterCursorFilter, decodeCursor, encodeCursor, rewindCursor } from './cursor';
import {
  SyncAccessDeniedError,
  SyncNetworkError,
  type PullResult,
  type RemoteRow,
  type SyncBackend,
} from './types';

function mapError(error: { code?: string; message?: string; status?: number } | null): Error | null {
  if (!error) return null;
  // 42501 = insufficient_privilege (RLS), PGRST301/401/403 = ไม่ได้รับอนุญาต
  if (error.code === '42501' || error.status === 401 || error.status === 403)
    return new SyncAccessDeniedError();
  if (!error.code && /network|fetch/i.test(error.message ?? '')) return new SyncNetworkError(error.message);
  return new Error(error.message ?? 'Sync failed');
}

/** ซิงก์กับ Supabase Postgres (ตารางชื่อเดียวกับในเครื่อง ดู supabase/migrations) */
export class SupabaseSyncBackend implements SyncBackend {
  async push(table: SyncedTableName, _userId: string, rows: RemoteRow[]): Promise<void> {
    if (rows.length === 0) return;
    try {
      const { error } = await getSupabase().from(table).upsert(rows, { onConflict: 'id' });
      const mapped = mapError(error);
      if (mapped) throw mapped;
    } catch (e) {
      if (e instanceof SyncAccessDeniedError || e instanceof SyncNetworkError) throw e;
      if (e instanceof TypeError) throw new SyncNetworkError(e.message);
      throw e;
    }
  }

  /** เริ่มดึงแต่ละรอบโดยย้อนเคอร์เซอร์เล็กน้อย (ดู PULL_OVERLAP_MS) */
  startCursor(stored: string | null): string | null {
    return rewindCursor(stored);
  }

  async pull(
    table: SyncedTableName,
    _userId: string,
    since: string | null,
    limit: number,
  ): Promise<PullResult> {
    try {
      let q = getSupabase()
        .from(table)
        .select('*')
        .order('server_updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);
      const c = decodeCursor(since);
      if (c) q = c.id ? q.or(afterCursorFilter(c)) : q.gte('server_updated_at', c.ts);
      const { data, error } = await q;
      const mapped = mapError(error);
      if (mapped) throw mapped;
      const rows = (data ?? []) as RemoteRow[];
      const last = rows[rows.length - 1];
      return {
        rows,
        cursor: last ? encodeCursor({ ts: String(last.server_updated_at), id: last.id }) : since,
      };
    } catch (e) {
      if (e instanceof SyncAccessDeniedError || e instanceof SyncNetworkError) throw e;
      if (e instanceof TypeError) throw new SyncNetworkError(e.message);
      throw e;
    }
  }
}
