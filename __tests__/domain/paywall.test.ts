import { describe, expect, it } from '@jest/globals';
import {
  assertCanPurchase,
  buildPaywallModel,
  canStartPurchase,
  nextStepOnSelect,
  PurchaseRequiresLoginError,
  type StorePlan,
} from '@/domain/entitlement/paywall';
import { plansFromOffering, trialDaysOf, type PackageLike } from '@/services/purchases/mapping';

const monthly: StorePlan = {
  kind: 'monthly',
  packageId: '$rc_monthly',
  productId: 'm',
  priceString: '฿19.00',
  trialDays: 7,
};
const lifetime: StorePlan = {
  kind: 'lifetime',
  packageId: '$rc_lifetime',
  productId: 'l',
  priceString: '฿99.00',
  trialDays: null,
};

describe('paywall model (SPEC B5/B6)', () => {
  it('offers the 7-day trial only to eligible users', () => {
    const m = buildPaywallModel({ state: 'NO_ENTITLEMENT', monthly, lifetime, trialEligibility: 'eligible' });
    expect(m).toMatchObject({ headline: 'trial', offerTrial: true, trialDays: 7, defaultPlan: 'monthly' });
    expect(m.disclosures).toEqual([
      'paywall.disclosure.trialThenPrice',
      'paywall.disclosure.autoRenew',
      'paywall.disclosure.cancelBeforeTrialEnds',
      'paywall.disclosure.lifetimeNoTrial',
    ]);
  });

  it.each(['ineligible', 'unknown'] as const)(
    'never advertises a trial when eligibility is %s',
    (trialEligibility) => {
      const m = buildPaywallModel({ state: 'NO_ENTITLEMENT', monthly, lifetime, trialEligibility });
      expect(m.offerTrial).toBe(false);
      expect(m.trialDays).toBeNull();
      expect(m.headline).toBe('subscribe');
      expect(m.disclosures).not.toContain('paywall.disclosure.trialThenPrice');
      expect(m.disclosures).toContain('paywall.disclosure.monthlyPrice');
      expect(m.disclosures).toContain('paywall.disclosure.autoRenew');
    },
  );

  it('does not offer a trial if the store has no trial offer configured', () => {
    const m = buildPaywallModel({
      state: 'NO_ENTITLEMENT',
      monthly: { ...monthly, trialDays: null },
      lifetime,
      trialEligibility: 'eligible',
    });
    expect(m.offerTrial).toBe(false);
  });

  it('uses a win-back headline for expired users and a billing headline in grace', () => {
    expect(
      buildPaywallModel({ state: 'EXPIRED', monthly, lifetime, trialEligibility: 'ineligible' }).headline,
    ).toBe('winback');
    expect(
      buildPaywallModel({ state: 'BILLING_GRACE', monthly, lifetime, trialEligibility: 'ineligible' })
        .headline,
    ).toBe('billing');
  });

  it('reports unavailable when the store returns no products', () => {
    expect(
      buildPaywallModel({
        state: 'NO_ENTITLEMENT',
        monthly: null,
        lifetime: null,
        trialEligibility: 'unknown',
      }).unavailable,
    ).toBe(true);
  });
});

describe('purchase order (SPEC B4)', () => {
  it('requires sign-in before any purchase or trial', () => {
    expect(canStartPurchase({ authUserId: null, purchasesUserId: null })).toBe(false);
    expect(() => assertCanPurchase({ authUserId: null, purchasesUserId: null })).toThrow(
      PurchaseRequiresLoginError,
    );
    expect(nextStepOnSelect('monthly', { authUserId: null, purchasesUserId: null })).toEqual({
      step: 'needLogin',
      plan: 'monthly',
    });
  });

  it('requires RevenueCat to be logged in as the same account', () => {
    expect(canStartPurchase({ authUserId: 'u1', purchasesUserId: null })).toBe(false);
    expect(canStartPurchase({ authUserId: 'u1', purchasesUserId: 'u2' })).toBe(false);
    expect(nextStepOnSelect('lifetime', { authUserId: 'u1', purchasesUserId: null }).step).toBe(
      'linkingAccount',
    );
    expect(canStartPurchase({ authUserId: 'u1', purchasesUserId: 'u1' })).toBe(true);
    expect(nextStepOnSelect('lifetime', { authUserId: 'u1', purchasesUserId: 'u1' }).step).toBe('purchasing');
  });
});

describe('store product mapping (prices come from the store, J2)', () => {
  const pkg = (p: Partial<PackageLike['product']>, type = 'MONTHLY', id = '$rc_monthly'): PackageLike => ({
    identifier: id,
    packageType: type,
    product: { identifier: 'fitnese_monthly', priceString: '$0.99', ...p },
  });

  it('reads iOS free trials from a zero-priced intro offer', () => {
    expect(
      trialDaysOf(pkg({ introPrice: { price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7, cycles: 1 } })),
    ).toBe(7);
    expect(
      trialDaysOf(pkg({ introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 } })),
    ).toBe(7);
  });

  it('ignores paid intro offers', () => {
    expect(
      trialDaysOf(
        pkg({ introPrice: { price: 0.49, periodUnit: 'MONTH', periodNumberOfUnits: 1, cycles: 1 } }),
      ),
    ).toBeNull();
  });

  it('reads Google Play free phases', () => {
    expect(
      trialDaysOf(
        pkg({
          defaultOption: { freePhase: { billingPeriod: { unit: 'DAY', value: 7 }, billingCycleCount: 1 } },
        }),
      ),
    ).toBe(7);
  });

  it('maps offering packages and keeps the store price string untouched', () => {
    const plans = plansFromOffering({
      monthly: null,
      lifetime: null,
      availablePackages: [
        pkg({ priceString: '19,00 ฿' }),
        pkg({ identifier: 'fitnese_lifetime', priceString: '99,00 ฿' }, 'LIFETIME', '$rc_lifetime'),
      ],
    });
    expect(plans.monthly?.priceString).toBe('19,00 ฿');
    expect(plans.lifetime).toMatchObject({ kind: 'lifetime', priceString: '99,00 ฿', trialDays: null });
  });
});
