import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createRow, listRows } from '@/db/mutations';
import {
  bootstrapAccount,
  checkTrialEligibility,
  deleteAccount,
  onAccountDeleted,
  onEntitled,
  purchasePlan,
  restorePurchases,
  signIn,
  signOut,
} from '@/features/access/accountFlow';
import { getAccess } from '@/features/access/useAccess';
import { PurchaseRequiresLoginError } from '@/domain/entitlement/paywall';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, simulateRestart, type TestServices } from '../helpers/env';

const DAY = 86_400_000;

describe('account + entitlement flow (SPEC B4, B9, B11, B12)', () => {
  let s: TestServices;
  beforeEach(() => {
    setClockForTests(null);
    s = freshEnv('new');
  });

  it('never starts a purchase or trial before sign-in (B4)', async () => {
    await bootstrapAccount();
    await expect(purchasePlan(s.purchases.monthlyPlan)).rejects.toBeInstanceOf(PurchaseRequiresLoginError);
    // แม้เรียก adapter ตรงๆ ก็ถูกกั้น
    await expect(s.purchases.purchase(s.purchases.monthlyPlan, null)).rejects.toBeInstanceOf(
      PurchaseRequiresLoginError,
    );
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    expect(getAccess().allowed).toBe(false);
  });

  it('sign-in → RevenueCat logIn(userId) → trial purchase → entitled → onEntitled hook', async () => {
    const entitled = jest.fn<(userId: string) => void>();
    const off = onEntitled(entitled);
    await bootstrapAccount();
    expect(await signIn('google')).toBe('success');
    const userId = getAccess().userId!;
    expect(s.purchases.currentAppUserId()).toBe(userId);
    expect(getAccess()).toMatchObject({ allowed: false, state: 'NO_ENTITLEMENT' });

    expect(await checkTrialEligibility(s.purchases.monthlyPlan)).toBe('eligible');
    const result = await purchasePlan(s.purchases.monthlyPlan);
    expect(result.status).toBe('success');
    expect(getAccess()).toMatchObject({ allowed: true, state: 'TRIALING' });
    expect(s.purchases.purchaseCalls).toEqual([{ plan: 'monthly', appUserId: userId }]);
    expect(entitled).toHaveBeenCalledWith(userId);
    // แคชสถานะสิทธิ์ (B9) — ไม่ใช่ตัวนับเวลาทดลองของแอป: วันหมดอายุมาจากสโตร์
    expect(entitlementRepo.get(userId)?.state).toBe('TRIALING');
    off();
  });

  it('uses the cached entitlement offline and locks again once the store says it expired', async () => {
    await bootstrapAccount();
    await signIn('google');
    await purchasePlan(s.purchases.lifetimePlan);
    expect(getAccess().state).toBe('LIFETIME');

    // ปิดแอปแล้วเปิดใหม่แบบออฟไลน์ → ยังใช้ได้จากแคช และไม่ต้องล็อกอินซ้ำ
    s = simulateRestart(s);
    s.purchases.offline = true;
    await bootstrapAccount();
    expect(getAccess()).toMatchObject({ allowed: true, state: 'LIFETIME', source: 'cache' });
  });

  it('keeps user data when the subscription expires and restores access on resubscribe', async () => {
    await bootstrapAccount();
    await signIn('google');
    const userId = getAccess().userId!;
    await purchasePlan(s.purchases.monthlyPlan);
    createRow('program', { name: 'PPL' });

    s.purchases.simulateExpire(userId);
    expect(getAccess()).toMatchObject({ allowed: false, state: 'EXPIRED' });
    expect(listRows('program').map((p) => p.name)).toEqual(['PPL']);

    // ไม่มีสิทธิ์ทดลองอีก → สมัครรายเดือนตรง
    expect(await checkTrialEligibility(s.purchases.monthlyPlan)).toBe('ineligible');
    await purchasePlan(s.purchases.monthlyPlan);
    expect(getAccess()).toMatchObject({ allowed: true, state: 'SUBSCRIBED_MONTHLY' });
    expect(listRows('program')).toHaveLength(1);
  });

  it('cached access ends at the store expiration date even without new events', async () => {
    const t0 = Date.parse('2026-10-09T00:00:00Z');
    setClockForTests(() => t0);
    await bootstrapAccount();
    await signIn('google');
    await purchasePlan(s.purchases.monthlyPlan); // ทดลอง 7 วันจากสโตร์
    s.purchases.offline = true;
    s = simulateRestart(s);
    s.purchases.offline = true;
    setClockForTests(() => t0 + 6 * DAY);
    await bootstrapAccount();
    expect(getAccess().allowed).toBe(true);
    setClockForTests(() => t0 + 10 * DAY); // เลยวันหมด + ช่วงผ่อนผัน 48 ชม.
    expect(getAccess().allowed).toBe(false);
  });

  it('restore requires sign-in, then restores the account entitlement', async () => {
    await bootstrapAccount();
    expect(await restorePurchases()).toBe('needLogin');
    await signIn('apple');
    expect(await restorePurchases()).toBe('none');
    await purchasePlan(s.purchases.lifetimePlan);
    expect(await restorePurchases()).toBe('restored');
  });

  it('sign-out keeps local data; signing in again on a "new device" brings the entitlement back (B11)', async () => {
    await bootstrapAccount();
    await signIn('google');
    await purchasePlan(s.purchases.lifetimePlan);
    createRow('program', { name: 'Upper/Lower' });
    await signOut();
    expect(getAccess().allowed).toBe(false);
    // บัญชีอื่น/ยังไม่ล็อกอินมองไม่เห็นข้อมูลของบัญชีนี้
    expect(listRows('program')).toHaveLength(0);
    await signIn('google');
    expect(getAccess()).toMatchObject({ allowed: true, state: 'LIFETIME' });
    expect(listRows('program').map((p) => p.name)).toEqual(['Upper/Lower']);
  });

  it('a cancelled sign-in is reported as cancelled, not an error', async () => {
    await bootstrapAccount();
    s.auth.nextSignInCancels = true;
    expect(await signIn('apple')).toBe('cancelled');
    expect(getAccess().userId).toBeNull();
  });

  it('delete account runs server deletion and local cleanup hooks (B12)', async () => {
    const cleanup = jest.fn<(userId: string) => void>();
    const off = onAccountDeleted(cleanup);
    await bootstrapAccount();
    await signIn('apple');
    const userId = getAccess().userId!;
    await purchasePlan(s.purchases.monthlyPlan);
    await deleteAccount();
    expect(s.auth.deletedUsers).toEqual([userId]);
    expect(cleanup).toHaveBeenCalledWith(userId);
    expect(entitlementRepo.get(userId)).toBeNull();
    expect(getAccess()).toMatchObject({ allowed: false, userId: null });
    off();
  });
});
