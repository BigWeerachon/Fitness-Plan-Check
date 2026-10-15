import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createRow, listRows } from '@/db/mutations';
import {
  bootstrapEntitlement,
  checkTrialEligibility,
  onEntitled,
  purchasePlan,
  restorePurchases,
} from '@/features/access/accountFlow';
import { getAccess } from '@/features/access/useAccess';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { getOwner } from '@/db/owner';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, simulateRestart, type TestServices } from '../helpers/env';

const DAY = 86_400_000;

describe('anonymous purchases + entitlement flow (SPEC B4, B9; no sign-in D81)', () => {
  let s: TestServices;
  beforeEach(() => {
    setClockForTests(null);
    s = freshEnv('new');
  });

  it('buys directly without any sign-in: trial purchase → entitled → onEntitled hook', async () => {
    const entitled = jest.fn<() => void>();
    const off = onEntitled(entitled);
    await bootstrapEntitlement();
    expect(getAccess()).toMatchObject({ allowed: false, state: 'NO_ENTITLEMENT', pending: false });

    expect(await checkTrialEligibility(s.purchases.monthlyPlan)).toBe('eligible');
    const result = await purchasePlan(s.purchases.monthlyPlan);
    expect(result.status).toBe('success');
    expect(getAccess()).toMatchObject({ allowed: true, state: 'TRIALING' });
    expect(s.purchases.purchaseCalls).toEqual([{ plan: 'monthly' }]);
    expect(entitled).toHaveBeenCalled();
    // แคชสถานะสิทธิ์ของเครื่องนี้ (B9) — ไม่ใช่ตัวนับเวลาทดลองของแอป: วันหมดอายุมาจากสโตร์
    expect(entitlementRepo.get(getOwner())?.state).toBe('TRIALING');
    off();
  });

  it('a cancelled or failed purchase changes nothing', async () => {
    await bootstrapEntitlement();
    s.purchases.failNextPurchase = { status: 'cancelled' };
    expect((await purchasePlan(s.purchases.lifetimePlan)).status).toBe('cancelled');
    s.purchases.failNextPurchase = { status: 'error', code: 'network' };
    expect(await purchasePlan(s.purchases.lifetimePlan)).toEqual({ status: 'error', code: 'network' });
    expect(getAccess().allowed).toBe(false);
    expect(entitlementRepo.get(getOwner())?.state).toBe('NO_ENTITLEMENT');
  });

  it('uses the cached entitlement offline after a restart', async () => {
    await bootstrapEntitlement();
    await purchasePlan(s.purchases.lifetimePlan);
    expect(getAccess().state).toBe('LIFETIME');

    // ปิดแอปแล้วเปิดใหม่แบบออฟไลน์ → ยังใช้ได้จากแคช
    s = simulateRestart(s);
    s.purchases.offline = true;
    await bootstrapEntitlement();
    expect(getAccess()).toMatchObject({ allowed: true, state: 'LIFETIME', source: 'cache' });
  });

  it('keeps user data when the subscription expires and restores access on resubscribe', async () => {
    await bootstrapEntitlement();
    await purchasePlan(s.purchases.monthlyPlan);
    createRow('program', { name: 'PPL' });

    s.purchases.simulateExpire();
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
    await bootstrapEntitlement();
    await purchasePlan(s.purchases.monthlyPlan); // ทดลอง 7 วันจากสโตร์
    s = simulateRestart(s);
    s.purchases.offline = true;
    setClockForTests(() => t0 + 6 * DAY);
    await bootstrapEntitlement();
    expect(getAccess().allowed).toBe(true);
    setClockForTests(() => t0 + 10 * DAY); // เลยวันหมด + ช่วงผ่อนผัน 48 ชม.
    expect(getAccess().allowed).toBe(false);
  });

  it('runs onEntitled when the cache is usable at launch, but not once it is past expiry and grace', async () => {
    const t0 = Date.parse('2026-10-09T00:00:00Z');
    setClockForTests(() => t0);
    await bootstrapEntitlement();
    await purchasePlan(s.purchases.monthlyPlan);

    s = simulateRestart(s);
    s.purchases.offline = true;
    setClockForTests(() => t0 + 3 * DAY);
    const usable = jest.fn<() => void>();
    let off = onEntitled(usable);
    await bootstrapEntitlement();
    expect(usable).toHaveBeenCalled();
    off();

    s = simulateRestart(s);
    s.purchases.offline = true;
    setClockForTests(() => t0 + 30 * DAY);
    const expired = jest.fn<() => void>();
    off = onEntitled(expired);
    await bootstrapEntitlement();
    expect(getAccess().allowed).toBe(false);
    expect(expired).not.toHaveBeenCalled();
    off();
  });

  it('restores purchases without sign-in on a new phone / reinstall', async () => {
    s = freshEnv('lifetime');
    // ติดตั้งใหม่: ผู้ใช้ RevenueCat นิรนามใหม่ยังไม่เห็นการซื้อในบัญชีสโตร์
    s.purchases.simulateReinstall();
    await bootstrapEntitlement();
    expect(getAccess()).toMatchObject({ allowed: false, state: 'NO_ENTITLEMENT' });

    expect(await restorePurchases()).toBe('restored');
    expect(s.purchases.restoreCalls).toBe(1);
    expect(getAccess()).toMatchObject({ allowed: true, state: 'LIFETIME' });
    expect(entitlementRepo.get(getOwner())?.state).toBe('LIFETIME');
  });

  it('restore reports nothing found or a store error without touching access', async () => {
    await bootstrapEntitlement();
    expect(await restorePurchases()).toBe('none');
    s.purchases.offline = true;
    expect(await restorePurchases()).toBe('error');
    expect(getAccess().allowed).toBe(false);
  });

  it('access is pending until the on-device cache is loaded', () => {
    expect(getAccess().pending).toBe(true);
  });
});
