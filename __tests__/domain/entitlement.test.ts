import { describe, expect, it } from '@jest/globals';
import {
  applyEvent,
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
