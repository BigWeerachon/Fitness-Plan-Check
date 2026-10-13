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

function throwIfSupabaseError(error: { code?: string; message?: string; status?: number } | null): void {
  const mapped = mapError(error);
  if (mapped) throw mapped;
}

/** fetch ล้ม (TypeError) = ไม่มีเครือข่าย — แปลงเป็น SyncNetworkError ส่วน error ที่แปลงแล้วส่งต่อตามเดิม */
function throwAsSyncError(e: unknown): never {
  if (e instanceof SyncAccessDeniedError || e instanceof SyncNetworkError) throw e;
  if (e instanceof TypeError) throw new SyncNetworkError(e.message);
  throw e;
}

/** ซิงก์กับ Supabase Postgres (ตารางชื่อเดียวกับในเครื่อง ดู supabase/migrations) */
export class SupabaseSyncBackend implements SyncBackend {
  async push(table: SyncedTableName, _userId: string, rows: RemoteRow[]): Promise<void> {
    if (rows.length === 0) return;
    try {
      const { error } = await getSupabase().from(table).upsert(rows, { onConflict: 'id' });
      throwIfSupabaseError(error);
    } catch (e) {
      return throwAsSyncError(e);
    }
  }

  /** ใช้ฟังก์ชันเดียวกับที่ RLS ใช้ตัดสิน (public.has_sync_access) จึงตรงกับสิ่งที่เซิร์ฟเวอร์อนุญาตจริง */
  async hasSyncAccess(userId: string): Promise<boolean> {
    try {
      const { data, error } = await getSupabase().rpc('has_sync_access', { uid: userId });
      throwIfSupabaseError(error);
      return data === true;
    } catch (e) {
      return throwAsSyncError(e);
    }
  }

  /** เริ่มดึงแต่ละรอบโดยย้อนเคอร์เซอร์เล็กน้อย (ดู PULL_OVERLAP_MS) */
  startCursor(stored: string | null): string | null {
    return rewindCursor(stored);
  }

  async pull(
    table: SyncedTableName,
    _userId: string,
    cursorValue: string | null,
    limit: number,
  ): Promise<PullResult> {
    try {
      let query = getSupabase()
        .from(table)
        .select('*')
        .order('server_updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);
      const cursor = decodeCursor(cursorValue);
      // เคอร์เซอร์ที่ย้อนแล้ว (startCursor) ไม่มี id → ดึงทุกแถวตั้งแต่เวลานั้น; มี id → ต่อจาก (เวลา, id)
      if (cursor) {
        query = cursor.id ? query.or(afterCursorFilter(cursor)) : query.gte('server_updated_at', cursor.ts);
      }
      const { data, error } = await query;
      throwIfSupabaseError(error);
      const rows = (data ?? []) as RemoteRow[];
      const last = rows[rows.length - 1];
      return {
        rows,
        cursor: last ? encodeCursor({ ts: String(last.server_updated_at), id: last.id }) : cursorValue,
      };
    } catch (e) {
      return throwAsSyncError(e);
    }
  }
}
