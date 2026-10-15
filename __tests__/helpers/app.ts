import { act } from 'expo-router/testing-library';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { getOwner } from '@/db/owner';
import { useSettings } from '@/stores/settings';
import { useEntitlement } from '@/stores/entitlement';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from './env';

export async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/**
 * แอปที่ผ่านตั้งค่าเริ่มต้นแล้ว + มีสิทธิ์ (ซื้อขาด) — สำหรับเทสต์หน้าฟีเจอร์
 * วันที่ปัจจุบันถูกตรึงเป็นวันศุกร์ 9 ต.ค. 2026 (เปลี่ยนได้ผ่าน at)
 */
export async function entitledApp(at = '2026-10-09T09:00:00'): Promise<TestServices> {
  const s = freshEnv('lifetime');
  const t0 = new Date(at).getTime();
  setClockForTests(() => t0);
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'en');
  // จำลองแคชสิทธิ์ในเครื่องที่ RevenueCat ยืนยันไว้แล้ว
  entitlementRepo.save(getOwner(), {
    state: 'LIFETIME',
    productId: 'fitnese_lifetime',
    periodType: 'NORMAL',
    expirationDate: null,
    willRenew: false,
    billingIssueAt: null,
    verifiedAt: t0,
    alsoRenewingMonthly: false,
  });
  useEntitlement.setState({
    cached: { ...entitlementRepo.get(getOwner())! },
    loaded: true,
    fresh: true,
    checking: false,
    online: true,
  });
  return s;
}
