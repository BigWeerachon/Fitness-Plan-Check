import { describe, expect, it } from '@jest/globals';
import {
  applyEvent,
  bestSnapshot,
  deriveSnapshot,
  EMPTY_SNAPSHOT,
  ENTITLEMENT_STATES,
  hasAccess,
  OFFLINE_GRACE_MS,
  resolveAccess,
  type CustomerInfoLike,
  type EntitlementEvent,
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

describe('applyEvent — transition table from RevenueCat webhook events', () => {
  const base: EntitlementSnapshot = { ...EMPTY_SNAPSHOT };
  const ev = (p: Partial<EntitlementEvent> & Pick<EntitlementEvent, 'type'>): EntitlementEvent => ({
    eventAt: NOW,
    productId: 'fitnese_monthly',
    ...p,
  });
  const at = (state: EntitlementState, extra: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot => ({
    ...base,
    state,
    productId: state === 'LIFETIME' ? 'fitnese_lifetime' : 'fitnese_monthly',
    expirationDate: state === 'LIFETIME' ? null : NOW + 5 * DAY,
    willRenew: state !== 'LIFETIME',
    ...extra,
  });

  const table: [EntitlementState, EntitlementEvent, EntitlementState][] = [
    [
      'NO_ENTITLEMENT',
      ev({ type: 'INITIAL_PURCHASE', periodType: 'TRIAL', expirationAt: NOW + 7 * DAY }),
      'TRIALING',
    ],
    [
      'NO_ENTITLEMENT',
      ev({ type: 'INITIAL_PURCHASE', periodType: 'NORMAL', expirationAt: NOW + 30 * DAY }),
      'SUBSCRIBED_MONTHLY',
    ],
    ['NO_ENTITLEMENT', ev({ type: 'NON_RENEWING_PURCHASE', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    ['NO_ENTITLEMENT', ev({ type: 'INITIAL_PURCHASE', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'RENEWAL', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    ['EXPIRED', ev({ type: 'INITIAL_PURCHASE', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    [
      'TRIALING',
      ev({ type: 'RENEWAL', periodType: 'NORMAL', expirationAt: NOW + 30 * DAY }),
      'SUBSCRIBED_MONTHLY',
    ],
    ['TRIALING', ev({ type: 'CANCELLATION', cancelReason: 'UNSUBSCRIBE' }), 'TRIALING'],
    ['TRIALING', ev({ type: 'EXPIRATION' }), 'EXPIRED'],
    ['TRIALING', ev({ type: 'NON_RENEWING_PURCHASE', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    [
      'SUBSCRIBED_MONTHLY',
      ev({ type: 'RENEWAL', periodType: 'NORMAL', expirationAt: NOW + 30 * DAY }),
      'SUBSCRIBED_MONTHLY',
    ],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'CANCELLATION', cancelReason: 'UNSUBSCRIBE' }), 'SUBSCRIBED_MONTHLY'],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'CANCELLATION', cancelReason: 'CUSTOMER_SUPPORT' }), 'EXPIRED'],
    [
      'SUBSCRIBED_MONTHLY',
      ev({ type: 'BILLING_ISSUE', gracePeriodExpirationAt: NOW + 3 * DAY }),
      'BILLING_GRACE',
    ],
    [
      'SUBSCRIBED_MONTHLY',
      ev({ type: 'BILLING_ISSUE', gracePeriodExpirationAt: null }),
      'SUBSCRIBED_MONTHLY',
    ],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'EXPIRATION' }), 'EXPIRED'],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'SUBSCRIPTION_PAUSED' }), 'SUBSCRIBED_MONTHLY'],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'PRODUCT_CHANGE' }), 'SUBSCRIBED_MONTHLY'],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'NON_RENEWING_PURCHASE', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    ['SUBSCRIBED_MONTHLY', ev({ type: 'TRANSFER', transferDirection: 'from' }), 'EXPIRED'],
    [
      'BILLING_GRACE',
      ev({ type: 'RENEWAL', periodType: 'NORMAL', expirationAt: NOW + 30 * DAY }),
      'SUBSCRIBED_MONTHLY',
    ],
    ['BILLING_GRACE', ev({ type: 'EXPIRATION' }), 'EXPIRED'],
    [
      'EXPIRED',
      ev({ type: 'RENEWAL', periodType: 'NORMAL', expirationAt: NOW + 30 * DAY }),
      'SUBSCRIBED_MONTHLY',
    ],
    [
      'EXPIRED',
      ev({ type: 'INITIAL_PURCHASE', periodType: 'NORMAL', expirationAt: NOW + 30 * DAY }),
      'SUBSCRIBED_MONTHLY',
    ],
    ['EXPIRED', ev({ type: 'NON_RENEWING_PURCHASE', productId: 'fitnese_lifetime' }), 'LIFETIME'],
    ['LIFETIME', ev({ type: 'EXPIRATION' }), 'LIFETIME'],
    ['LIFETIME', ev({ type: 'CANCELLATION', cancelReason: 'UNSUBSCRIBE' }), 'LIFETIME'],
    ['LIFETIME', ev({ type: 'BILLING_ISSUE', gracePeriodExpirationAt: NOW + DAY }), 'LIFETIME'],
    ['LIFETIME', ev({ type: 'RENEWAL', periodType: 'NORMAL' }), 'LIFETIME'],
    [
      'LIFETIME',
      ev({ type: 'CANCELLATION', cancelReason: 'CUSTOMER_SUPPORT', productId: 'fitnese_lifetime' }),
      'EXPIRED',
    ],
    [
      'LIFETIME',
      ev({ type: 'CANCELLATION', cancelReason: 'CUSTOMER_SUPPORT', productId: 'fitnese_monthly' }),
      'LIFETIME',
    ],
    ['NO_ENTITLEMENT', ev({ type: 'TEST' }), 'NO_ENTITLEMENT'],
  ];

  it.each(table)('%s + %o → %s', (from, event, to) => {
    expect(applyEvent(at(from), event).state).toBe(to);
  });

  it('user cancellation keeps the original expiration and stops renewal', () => {
    const next = applyEvent(
      at('SUBSCRIBED_MONTHLY'),
      ev({ type: 'CANCELLATION', cancelReason: 'UNSUBSCRIBE' }),
    );
    expect(next.willRenew).toBe(false);
    expect(next.expirationDate).toBe(NOW + 5 * DAY);
  });

  it('uncancellation restores renewal without changing the state', () => {
    const cancelled = at('TRIALING', { willRenew: false });
    const next = applyEvent(cancelled, ev({ type: 'UNCANCELLATION' }));
    expect(next.state).toBe('TRIALING');
    expect(next.willRenew).toBe(true);
  });

  it('a lifetime purchase via INITIAL_PURCHASE/RENEWAL clears the expiry and renewal', () => {
    for (const type of ['INITIAL_PURCHASE', 'RENEWAL'] as const) {
      const next = applyEvent(
        at('TRIALING'),
        ev({ type, productId: 'fitnese_lifetime', expirationAt: null }),
      );
      expect(next).toMatchObject({
        state: 'LIFETIME',
        productId: 'fitnese_lifetime',
        expirationDate: null,
        willRenew: false,
      });
    }
  });

  describe('TRANSFER', () => {
    const transferred = at('SUBSCRIBED_MONTHLY', { expirationDate: NOW + 20 * DAY, verifiedAt: NOW - DAY });

    it("'to' receives the source account's entitlement", () => {
      const next = applyEvent(base, ev({ type: 'TRANSFER', transferDirection: 'to', transferred }));
      expect(next).toMatchObject({
        state: 'SUBSCRIBED_MONTHLY',
        productId: 'fitnese_monthly',
        expirationDate: NOW + 20 * DAY,
        willRenew: true,
        verifiedAt: NOW,
      });
      const lifetime = applyEvent(
        base,
        ev({ type: 'TRANSFER', transferDirection: 'to', transferred: at('LIFETIME') }),
      );
      expect(lifetime).toMatchObject({ state: 'LIFETIME', expirationDate: null });
    });

    it("'to' keeps a better entitlement it already had", () => {
      const own = at('LIFETIME');
      expect(applyEvent(own, ev({ type: 'TRANSFER', transferDirection: 'to', transferred })).state).toBe(
        'LIFETIME',
      );
      const longer = at('SUBSCRIBED_MONTHLY', { expirationDate: NOW + 40 * DAY });
      expect(
        applyEvent(longer, ev({ type: 'TRANSFER', transferDirection: 'to', transferred })).expirationDate,
      ).toBe(NOW + 40 * DAY);
    });

    it("'to' without a known source entitlement stays as it was", () => {
      expect(applyEvent(base, ev({ type: 'TRANSFER', transferDirection: 'to' })).state).toBe(
        'NO_ENTITLEMENT',
      );
      expect(
        applyEvent(base, ev({ type: 'TRANSFER', transferDirection: 'to', transferred: null })).state,
      ).toBe('NO_ENTITLEMENT');
    });

    it("'from' loses access", () => {
      expect(applyEvent(at('LIFETIME'), ev({ type: 'TRANSFER', transferDirection: 'from' }))).toMatchObject({
        state: 'EXPIRED',
        productId: null,
        alsoRenewingMonthly: false,
      });
    });

    it('bestSnapshot prefers lifetime, then active with the latest expiry, then expired', () => {
      const expired = at('EXPIRED', { expirationDate: NOW - DAY });
      const short = at('TRIALING', { expirationDate: NOW + DAY });
      const long = at('SUBSCRIBED_MONTHLY', { expirationDate: NOW + 9 * DAY });
      const lapsed = at('SUBSCRIBED_MONTHLY', { expirationDate: NOW - 1 });
      expect(bestSnapshot([], NOW)).toBeNull();
      expect(bestSnapshot([base, expired], NOW)).toBe(expired);
      expect(bestSnapshot([expired, short, long], NOW)).toBe(long);
      expect(bestSnapshot([short, lapsed], NOW)).toBe(short);
      expect(bestSnapshot([long, at('LIFETIME'), short], NOW)?.state).toBe('LIFETIME');
    });
  });

  describe('lifetime owner whose monthly keeps renewing (J5)', () => {
    const lifetimeBuy = ev({ type: 'NON_RENEWING_PURCHASE', productId: 'fitnese_lifetime' });

    it('buying lifetime while monthly renews keeps a reminder until the monthly ends', () => {
      const bought = applyEvent(at('SUBSCRIBED_MONTHLY'), lifetimeBuy);
      expect(bought).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: true });
      const cancelled = applyEvent(bought, ev({ type: 'CANCELLATION', cancelReason: 'UNSUBSCRIBE' }));
      expect(cancelled).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: false });
      const resumed = applyEvent(cancelled, ev({ type: 'UNCANCELLATION' }));
      expect(resumed).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: true });
      expect(applyEvent(resumed, ev({ type: 'RENEWAL' })).alsoRenewingMonthly).toBe(true);
      expect(applyEvent(resumed, ev({ type: 'BILLING_ISSUE' })).alsoRenewingMonthly).toBe(true);
      expect(applyEvent(resumed, ev({ type: 'EXPIRATION' }))).toMatchObject({
        state: 'LIFETIME',
        alsoRenewingMonthly: false,
      });
      expect(applyEvent(resumed, ev({ type: 'SUBSCRIPTION_PAUSED' })).alsoRenewingMonthly).toBe(false);
      expect(
        applyEvent(resumed, ev({ type: 'CANCELLATION', cancelReason: 'CUSTOMER_SUPPORT' })),
      ).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: false });
    });

    it('no reminder when the monthly was already cancelled or lapsed', () => {
      expect(
        applyEvent(at('SUBSCRIBED_MONTHLY', { willRenew: false }), lifetimeBuy).alsoRenewingMonthly,
      ).toBe(false);
      expect(applyEvent(at('EXPIRED', { willRenew: false }), lifetimeBuy).alsoRenewingMonthly).toBe(false);
      expect(applyEvent(base, lifetimeBuy).alsoRenewingMonthly).toBe(false);
    });

    it('a refunded lifetime clears the reminder with the access', () => {
      const bought = applyEvent(at('TRIALING'), lifetimeBuy);
      expect(bought.alsoRenewingMonthly).toBe(true);
      const refunded = applyEvent(
        bought,
        ev({ type: 'CANCELLATION', cancelReason: 'CUSTOMER_SUPPORT', productId: 'fitnese_lifetime' }),
      );
      expect(refunded).toMatchObject({ state: 'EXPIRED', alsoRenewingMonthly: false });
    });
  });

  it('never mutates the previous snapshot', () => {
    const prev = at('TRIALING');
    const copy = { ...prev };
    applyEvent(prev, ev({ type: 'EXPIRATION' }));
    expect(prev).toEqual(copy);
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

  it('signed-out users never have access, even with a cache', () => {
    expect(
      resolveAccess({ userId: null, cached: cached('LIFETIME', null), fresh: false, online: true, now: NOW })
        .allowed,
    ).toBe(false);
  });

  it('a cache from another account is ignored', () => {
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
