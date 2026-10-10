import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  LIVE_INFO_MAX_AGE_MS,
  bootstrapAccount,
  isLiveInfo,
  refreshEntitlement,
  signIn,
} from '@/features/access/accountFlow';
import { shouldRecheckExpiry } from '@/features/access/expiryRecheck';
import { getAccess } from '@/features/access/useAccess';
import { OFFLINE_GRACE_MS } from '@/domain/entitlement/machine';
import { useAuth } from '@/stores/auth';
import { useEntitlement } from '@/stores/entitlement';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from '../helpers/env';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
let t = Date.parse('2026-10-09T09:00:00Z');

async function signedInSubscriber(scenario: 'monthly' | 'trialing' = 'monthly'): Promise<TestServices> {
  const s = freshEnv(scenario);
  await bootstrapAccount();
  expect(await signIn('google')).toBe('success');
  expect(getAccess().allowed).toBe(true);
  return s;
}

describe('offline access and expiry re-check (SPEC B8, B9)', () => {
  beforeEach(() => {
    t = Date.parse('2026-10-09T09:00:00Z');
    setClockForTests(() => t);
  });
  afterEach(() => setClockForTests(null));

  it('treats RevenueCat data read from its on-device cache as stale', () => {
    const base = { entitlements: { active: {}, all: {} } };
    expect(isLiveInfo({ ...base, requestDate: new Date(t - 60_000).toISOString() }, t)).toBe(true);
    expect(
      isLiveInfo({ ...base, requestDate: new Date(t - LIVE_INFO_MAX_AGE_MS - 1).toISOString() }, t),
    ).toBe(false);
    expect(isLiveInfo(base, t)).toBe(true);
  });

  it('keeps the 48h offline grace even when the store SDK serves its cached CustomerInfo', async () => {
    const s = await signedInSubscriber();
    const exp = useEntitlement.getState().cached!.expirationDate!;
    s.purchases.offline = true;
    s.purchases.offlineMode = 'cached';

    t = exp + HOUR;
    await refreshEntitlement();
    expect(useEntitlement.getState()).toMatchObject({ fresh: false, online: false });
    expect(getAccess()).toMatchObject({ allowed: true, source: 'grace' });

    t = exp + OFFLINE_GRACE_MS + HOUR;
    expect(getAccess().allowed).toBe(false);
  });

  it('asks the store again when the cached expiry passes while the app stays open', async () => {
    const s = await signedInSubscriber();
    const userId = useAuth.getState().user!.id;
    const exp = useEntitlement.getState().cached!.expirationDate!;
    t = exp + 60_000;
    s.purchases.simulateRenew(userId);
    // แคชเดิมหมดอายุแล้ว (ยังไม่ได้ตรวจใหม่)
    useEntitlement.getState().set({ cached: { ...useEntitlement.getState().cached!, expirationDate: exp } });
    expect(getAccess().allowed).toBe(false);
    const input = { hasUser: true, expirationDate: exp, now: t, checking: false, lastCheckedFor: null };
    expect(shouldRecheckExpiry(input)).toBe(true);
    await refreshEntitlement();
    expect(getAccess()).toMatchObject({ allowed: true, state: 'SUBSCRIBED_MONTHLY' });
    // ตรวจครั้งเดียวต่อวันหมดอายุ — ไม่วนเรียกสโตร์ซ้ำถ้าหมดจริง
    expect(shouldRecheckExpiry({ ...input, lastCheckedFor: exp })).toBe(false);
    expect(shouldRecheckExpiry({ ...input, checking: true })).toBe(false);
    expect(shouldRecheckExpiry({ ...input, now: exp - 1 })).toBe(false);
    expect(shouldRecheckExpiry({ ...input, hasUser: false })).toBe(false);
  });

  it('adopts session changes from the server: refresh after reconnect and server-side sign-out', async () => {
    const s = await signedInSubscriber('trialing');
    s.purchases.offline = true;
    await refreshEntitlement();
    expect(useEntitlement.getState().online).toBe(false);
    // กลับมาออนไลน์ แล้ว auth ต่ออายุโทเค็นสำเร็จ → ตรวจสิทธิ์ใหม่อัตโนมัติ
    s.purchases.offline = false;
    s.auth.simulateTokenRefreshed();
    await Promise.resolve();
    await Promise.resolve();
    expect(useEntitlement.getState()).toMatchObject({ online: true, fresh: true });
    // เซิร์ฟเวอร์เพิกถอนเซสชัน → ล็อกเอาต์ในแอป (ข้อมูลในเครื่องยังอยู่ตาม owner)
    s.auth.simulateServerSignOut();
    expect(useAuth.getState().user).toBeNull();
    expect(getAccess().allowed).toBe(false);
  });

  it('a stale RevenueCat cache never overwrites a newer local cache', async () => {
    const s = await signedInSubscriber();
    const before = useEntitlement.getState().cached!;
    s.purchases.offline = true;
    s.purchases.offlineMode = 'cached';
    t += 10 * DAY;
    await refreshEntitlement();
    expect(useEntitlement.getState().cached).toMatchObject({
      state: before.state,
      expirationDate: before.expirationDate,
    });
  });
});
