import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  LIVE_INFO_MAX_AGE_MS,
  bootstrapEntitlement,
  isLiveInfo,
  refreshEntitlement,
} from '@/features/access/accountFlow';
import { shouldRecheckExpiry } from '@/features/access/expiryRecheck';
import { getAccess } from '@/features/access/useAccess';
import { OFFLINE_GRACE_MS } from '@/domain/entitlement/machine';
import { useEntitlement } from '@/stores/entitlement';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from '../helpers/env';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
let t = Date.parse('2026-10-09T09:00:00Z');

async function subscriber(scenario: 'monthly' | 'trialing' = 'monthly'): Promise<TestServices> {
  const s = freshEnv(scenario);
  await bootstrapEntitlement();
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
    const s = await subscriber();
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
    const s = await subscriber();
    const exp = useEntitlement.getState().cached!.expirationDate!;
    t = exp + 60_000;
    s.purchases.simulateRenew();
    // แคชเดิมหมดอายุแล้ว (ยังไม่ได้ตรวจใหม่)
    useEntitlement.getState().set({ cached: { ...useEntitlement.getState().cached!, expirationDate: exp } });
    expect(getAccess().allowed).toBe(false);
    const input = { expirationDate: exp, now: t, checking: false, lastCheckedFor: null };
    expect(shouldRecheckExpiry(input)).toBe(true);
    await refreshEntitlement();
    expect(getAccess()).toMatchObject({ allowed: true, state: 'SUBSCRIBED_MONTHLY' });
    // ตรวจครั้งเดียวต่อวันหมดอายุ — ไม่วนเรียกสโตร์ซ้ำถ้าหมดจริง
    expect(shouldRecheckExpiry({ ...input, lastCheckedFor: exp })).toBe(false);
    expect(shouldRecheckExpiry({ ...input, checking: true })).toBe(false);
    expect(shouldRecheckExpiry({ ...input, now: exp - 1 })).toBe(false);
    expect(shouldRecheckExpiry({ ...input, expirationDate: null })).toBe(false);
  });

  it('re-checks after reconnecting: offline → online again refreshes from the store', async () => {
    const s = await subscriber('trialing');
    s.purchases.offline = true;
    await refreshEntitlement();
    expect(useEntitlement.getState().online).toBe(false);
    expect(getAccess().allowed).toBe(true);
    s.purchases.offline = false;
    await refreshEntitlement();
    expect(useEntitlement.getState()).toMatchObject({ online: true, fresh: true });
    expect(getAccess()).toMatchObject({ allowed: true, state: 'TRIALING', source: 'live' });
  });

  it('store events (e.g. cancellation) reach the cache through the CustomerInfo listener', async () => {
    const s = await subscriber('monthly');
    s.purchases.simulateCancel();
    expect(useEntitlement.getState().cached).toMatchObject({ state: 'SUBSCRIBED_MONTHLY', willRenew: false });
  });

  it('a stale RevenueCat cache never overwrites a newer local cache', async () => {
    const s = await subscriber();
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
