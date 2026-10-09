import type { SyncedTableName } from '../../db/schema';

/** แถวในรูปแบบคลาวด์: ชื่อคอลัมน์ snake_case, owner_id → user_id, เพิ่ม server_updated_at */
export type RemoteRow = Record<string, unknown> & { id: string; updated_at: number };

export interface PullResult {
  rows: RemoteRow[];
  /** เคอร์เซอร์สำหรับรอบถัดไป (server_updated_at ล่าสุดที่ได้) */
  cursor: string | null;
}

/**
 * ปลายทางการซิงก์ (Supabase Postgres + RLS / หรือ memory ใน dev/test)
 * ฝั่งเซิร์ฟเวอร์บังคับ last-write-wins ต่อระเบียน (trigger) และอนุญาตเฉพาะบัญชีที่มีสิทธิ์ (SPEC J6)
 */
export interface SyncBackend {
  push(table: SyncedTableName, userId: string, rows: RemoteRow[]): Promise<void>;
  pull(table: SyncedTableName, userId: string, since: string | null, limit: number): Promise<PullResult>;
}

/** บัญชีไม่มีสิทธิ์ซิงก์ (RLS ปฏิเสธ) — ข้อมูลในเครื่องยังอยู่ครบ จะลองใหม่เมื่อสิทธิ์กลับมา */
export class SyncAccessDeniedError extends Error {
  constructor() {
    super('Cloud sync requires an active entitlement');
    this.name = 'SyncAccessDeniedError';
  }
}

export class SyncNetworkError extends Error {
  constructor(message = 'Network unavailable') {
    super(message);
    this.name = 'SyncNetworkError';
  }
}
