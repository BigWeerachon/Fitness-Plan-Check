import { create } from 'zustand';

/**
 * สถานะการซิงก์สำหรับแสดงผล (SPEC L: ซิงก์ล้มเหลวต้องแสดงสถานะ)
 * - disabled: ไม่ได้ล็อกอินหรือไม่มีสิทธิ์ (ข้อมูลในเครื่องยังอยู่ครบ)
 * - waiting: เซิร์ฟเวอร์ยังไม่ยืนยันสิทธิ์ (RLS ปฏิเสธ) จะลองใหม่อัตโนมัติ
 */
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'waiting' | 'disabled';

interface SyncStore {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pending: number;
  lastError: string | null;
  nextRetryAt: number | null;
  set(patch: Partial<Omit<SyncStore, 'set'>>): void;
}

export const useSync = create<SyncStore>((set) => ({
  status: 'disabled',
  lastSyncedAt: null,
  pending: 0,
  lastError: null,
  nextRetryAt: null,
  set(patch) {
    set(patch);
  },
}));
