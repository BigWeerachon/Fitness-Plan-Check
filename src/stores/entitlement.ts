import { create } from 'zustand';
import type { CachedEntitlement } from '../db/repos/entitlementRepo';
import type { TrialEligibility } from '../domain/entitlement/paywall';

interface EntitlementStore {
  /** แคชสถานะของผู้ใช้ปัจจุบัน (null = ยังไม่มี/ไม่ได้ล็อกอิน) */
  cached: CachedEntitlement | null;
  /** ได้ข้อมูลสดจาก RevenueCat แล้วในรอบการเปิดแอปนี้ */
  fresh: boolean;
  /** กำลังตรวจกับ RevenueCat */
  checking: boolean;
  online: boolean;
  trialEligibility: TrialEligibility;
  set(patch: Partial<Omit<EntitlementStore, 'set'>>): void;
}

export const useEntitlement = create<EntitlementStore>((set) => ({
  cached: null,
  fresh: false,
  checking: false,
  online: true,
  trialEligibility: 'unknown',
  set(patch) {
    set(patch);
  },
}));
