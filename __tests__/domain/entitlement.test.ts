import { describe, expect, it } from '@jest/globals';
import {
  deriveSnapshot,
  EMPTY_SNAPSHOT,
  ENTITLEMENT_STATES,
  hasAccess,
  OFFLINE_GRACE_MS,
  resolveAccess,
  type CustomerInfoLike,
  type EntitlementInfoLike,
  type EntitlementSnapshot,
  type EntitlementState,
} from '@/domain/entitlement/machine';

const NOW = Date.parse('2026-10-09T12:00:00Z');
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

function ent(p: Partial<EntitlementInfoLike> = {}): EntitlementInfoLike {
  return {
    identifier: 'pro',
    isActive: true,
    willRenew: true,
    periodType: 'NORMAL',
    productIdentifier: 'fitnese_monthly',
    expirationDate: iso(NOW + 10 * DAY),
    billingIssueDetectedAt: null,
    ...p,
  };
}

function info(active?: EntitlementInfoLike, all?: EntitlementInfoLike, lifetimeTx = false): CustomerInfoLike {
  return {
    entitlements: {
      active: active ? { pro: active } : {},
      all: all ? { pro: all } : active ? { pro: active } : {},
    },
    nonSubscriptionTransactions: lifetimeTx ? [{ productIdentifier: 'fitnese_lifetime' }] : [],
  };
}

describe('hasAccess (SPEC B8, J3)', () => {
  it.each<[EntitlementState, boolean]>([
    ['NO_ENTITLEMENT', false],
    ['TRIALING', true],
    ['SUBSCRIBED_MONTHLY', true],
    ['LIFETIME', true],
    ['BILLING_GRACE', true],
    ['EXPIRED', false],
  ])('%s → %s', (state, expected) => {
    expect(hasAccess(state)).toBe(expected);
  });

  it('covers exactly the six states in the spec', () => {
    expect(ENTITLEMENT_STATES).toHaveLength(6);
  });
});

describe('deriveSnapshot from RevenueCat customerInfo', () => {
  it('no purchases ever → NO_ENTITLEMENT', () => {
    expect(deriveSnapshot(info(), NOW).state).toBe('NO_ENTITLEMENT');
  });

  it('active trial → TRIALING with the store expiration date (no in-app trial timer, B2)', () => {
    const s = deriveSnapshot(info(ent({ periodType: 'TRIAL', expirationDate: iso(NOW + 7 * DAY) })), NOW);
    expect(s.state).toBe('TRIALING');
    expect(s.expirationDate).toBe(NOW + 7 * DAY);
    expect(s.periodType).toBe('TRIAL');
  });

  it('active paid monthly → SUBSCRIBED_MONTHLY', () => {
    expect(deriveSnapshot(info(ent()), NOW).state).toBe('SUBSCRIBED_MONTHLY');
  });

  it('cancelled during trial keeps access until the trial ends (J5)', () => {
    const s = deriveSnapshot(info(ent({ periodType: 'TRIAL', willRenew: false })), NOW);
    expect(s.state).toBe('TRIALING');
    expect(s.willRenew).toBe(false);
  });

  it('active with a billing issue → BILLING_GRACE', () => {
    const s = deriveSnapshot(info(ent({ billingIssueDetectedAt: iso(NOW - DAY) })), NOW);
    expect(s.state).toBe('BILLING_GRACE');
  });

  it('lifetime (no expiration) → LIFETIME', () => {
    const s = deriveSnapshot(info(ent({ productIdentifier: 'fitnese_lifetime', expirationDate: null })), NOW);
    expect(s.state).toBe('LIFETIME');
    expect(s.expirationDate).toBeNull();
  });

  it('owning both monthly and lifetime → LIFETIME wins (J5)', () => {
    const s = deriveSnapshot(info(ent(), undefined, true), NOW);
    expect(s.state).toBe('LIFETIME');
  });

  it('previously subscribed but inactive → EXPIRED', () => {
    const old = ent({ isActive: false, expirationDate: iso(NOW - DAY) });
    expect(deriveSnapshot(info(undefined, old), NOW).state).toBe('EXPIRED');
  });

  it('stale cached "active" past its expiration is not trusted', () => {
    const s = deriveSnapshot(info(ent({ expirationDate: iso(NOW - 1000) })), NOW);
    expect(s.state).toBe('EXPIRED');
  });

  it('lifetime only in nonSubscriptionTransactions while "pro" is missing → LIFETIME', () => {
    const s = deriveSnapshot(info(undefined, undefined, true), NOW);
    expect(s).toMatchObject({ state: 'LIFETIME', expirationDate: null, alsoRenewingMonthly: false });
  });

  it('inactive pro entitlement + lifetime transaction → EXPIRED (refunded lifetime, J5)', () => {
    const refunded = ent({
      isActive: false,
      productIdentifier: 'fitnese_lifetime',
      expirationDate: iso(NOW - DAY),
      willRenew: false,
    });
    const s = deriveSnapshot(info(undefined, refunded, true), NOW);
    expect(s.state).toBe('EXPIRED');
    expect(hasAccess(s.state)).toBe(false);
  });
});

describe('deriveSnapshot — lifetime owner whose monthly still renews (J5)', () => {
  const lifetime = ent({ productIdentifier: 'fitnese_lifetime', expirationDate: null, willRenew: false });
  const withSubs = (
    base: CustomerInfoLike,
    activeSubscriptions: string[],
    details?: CustomerInfoLike['subscriptionsByProductIdentifier'],
  ): CustomerInfoLike => ({ ...base, activeSubscriptions, subscriptionsByProductIdentifier: details });

  it('flags a monthly subscription that will renew', () => {
    const s = deriveSnapshot(
      withSubs(info(lifetime, undefined, true), ['fitnese_monthly'], {
        fitnese_monthly: { willRenew: true, isActive: true },
      }),
      NOW,
    );
    expect(s).toMatchObject({ state: 'LIFETIME', willRenew: false, alsoRenewingMonthly: true });
  });

  it('does not flag a monthly that is already cancelled (runs out at period end)', () => {
    const s = deriveSnapshot(
      withSubs(info(lifetime, undefined, true), ['fitnese_monthly'], {
        fitnese_monthly: { willRenew: false, isActive: true },
      }),
      NOW,
    );
    expect(s.alsoRenewingMonthly).toBe(false);
  });

  it('flags when the store lists an active subscription without renewal details', () => {
    const s = deriveSnapshot(withSubs(info(lifetime, undefined, true), ['fitnese_monthly']), NOW);
    expect(s.alsoRenewingMonthly).toBe(true);
  });

  it('uses the entitlement itself when RevenueCat reports it on the monthly product', () => {
    expect(deriveSnapshot(info(ent({ willRenew: true }), undefined, true), NOW)).toMatchObject({
      state: 'LIFETIME',
      alsoRenewingMonthly: true,
    });
    expect(deriveSnapshot(info(ent({ willRenew: false }), undefined, true), NOW).alsoRenewingMonthly).toBe(
      false,
    );
  });

  it('flags in the stale-cache fallback too, and never for non-lifetime states', () => {
    const fallback = deriveSnapshot(withSubs(info(undefined, undefined, true), ['fitnese_monthly']), NOW);
    expect(fallback).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: true });
    expect(deriveSnapshot(info(lifetime, undefined, true), NOW).alsoRenewingMonthly).toBe(false);
    const monthly = deriveSnapshot(withSubs(info(ent()), ['fitnese_monthly']), NOW);
    expect(monthly).toMatchObject({ state: 'SUBSCRIBED_MONTHLY', alsoRenewingMonthly: false });
  });
});

describe('resolveAccess — offline cache (SPEC B9)', () => {
  const cached = (state: EntitlementState, expirationDate: number | null, userId = 'u1') => ({
    ...EMPTY_SNAPSHOT,
    state,
    expirationDate,
    verifiedAt: NOW - DAY,
    userId,
  });

  it('no data owner means no access, even with a cache', () => {
    expect(
      resolveAccess({ userId: null, cached: cached('LIFETIME', null), fresh: false, online: true, now: NOW })
        .allowed,
    ).toBe(false);
  });

  it('a cache from another owner is ignored', () => {
    const r = resolveAccess({
      userId: 'u2',
      cached: cached('LIFETIME', null),
      fresh: false,
      online: false,
      now: NOW,
    });
    expect(r.allowed).toBe(false);
  });

  it('uses the cache until the expiration date while offline', () => {
    const r = resolveAccess({
      userId: 'u1',
      cached: cached('TRIALING', NOW + DAY),
      fresh: false,
      online: false,
      now: NOW,
    });
    expect(r).toMatchObject({ allowed: true, source: 'cache', state: 'TRIALING' });
  });

  it('allows a short grace after expiration only while offline', () => {
    const exp = NOW - 60_000;
    const offline = resolveAccess({
      userId: 'u1',
      cached: cached('SUBSCRIBED_MONTHLY', exp),
      fresh: false,
      online: false,
      now: NOW,
    });
    expect(offline).toMatchObject({ allowed: true, source: 'grace' });
    const online = resolveAccess({
      userId: 'u1',
      cached: cached('SUBSCRIBED_MONTHLY', exp),
      fresh: false,
      online: true,
      now: NOW,
    });
    expect(online.allowed).toBe(false);
  });

  it('locks after the grace window even offline', () => {
    const exp = NOW - OFFLINE_GRACE_MS - 1;
    const r = resolveAccess({
      userId: 'u1',
      cached: cached('SUBSCRIBED_MONTHLY', exp),
      fresh: false,
      online: false,
      now: NOW,
    });
    expect(r).toMatchObject({ allowed: false, state: 'EXPIRED' });
  });

  it('lifetime never expires offline', () => {
    const r = resolveAccess({
      userId: 'u1',
      cached: cached('LIFETIME', null),
      fresh: false,
      online: false,
      now: NOW + 365 * DAY,
    });
    expect(r.allowed).toBe(true);
  });

  it('expired / no entitlement stay locked', () => {
    for (const s of ['EXPIRED', 'NO_ENTITLEMENT'] as EntitlementState[]) {
      expect(
        resolveAccess({ userId: 'u1', cached: cached(s, null), fresh: true, online: true, now: NOW }).allowed,
      ).toBe(false);
    }
  });
});
