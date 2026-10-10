import { act } from 'expo-router/testing-library';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { setOwner } from '@/db/owner';
import { useSettings } from '@/stores/settings';
import { useAuth } from '@/stores/auth';
import { useEntitlement } from '@/stores/entitlement';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from './env';

export const TEST_USER = '33333333-3333-4333-8333-333333333333';

export async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/**
 * แอปที่ผ่านตั้งค่าเริ่มต้นแล้ว + ล็อกอิน + มีสิทธิ์ (ซื้อขาด) — สำหรับเทสต์หน้าฟีเจอร์
 * วันที่ปัจจุบันถูกตรึงเป็นวันศุกร์ 9 ต.ค. 2026 (เปลี่ยนได้ผ่าน at)
 */
export async function entitledApp(at = '2026-10-09T09:00:00'): Promise<TestServices> {
  const s = freshEnv('lifetime');
  const t0 = new Date(at).getTime();
  setClockForTests(() => t0);
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'en');
  // จำลองบัญชีที่ล็อกอินค้างไว้และ RevenueCat ยืนยันสิทธิ์แล้ว
  const user = await s.auth.signIn('google');
  await s.purchases.logIn(user.id);
  setOwner(user.id);
  entitlementRepo.save(user.id, {
    state: 'LIFETIME',
    productId: 'fitnese_lifetime',
    periodType: 'NORMAL',
    expirationDate: null,
    willRenew: false,
    billingIssueAt: null,
    verifiedAt: t0,
  });
  useAuth.setState({ user, status: 'signedIn' });
  useEntitlement.setState({
    cached: { ...entitlementRepo.get(user.id)! },
    fresh: true,
    checking: false,
    online: true,
  });
  return s;
}
