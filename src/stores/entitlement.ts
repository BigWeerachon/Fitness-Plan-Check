import { create } from 'zustand';
import type { CachedEntitlement } from '../db/repos/entitlementRepo';
import type { TrialEligibility } from '../domain/entitlement/paywall';

interface EntitlementStore {
  /** แคชสถานะสิทธิ์ของเครื่องนี้ (null = ยังไม่เคยได้ข้อมูลจาก RevenueCat) */
  cached: CachedEntitlement | null;
  /** โหลดแคชจากฐานข้อมูลแล้ว (ก่อนหน้านั้นยังตัดสินสิทธิ์ไม่ได้) */
  loaded: boolean;
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
  loaded: false,
  fresh: false,
  checking: false,
  online: true,
  trialEligibility: 'unknown',
  set(patch) {
    set(patch);
  },
}));
