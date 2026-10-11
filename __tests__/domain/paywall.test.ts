import { describe, expect, it } from '@jest/globals';
import { ENTITLEMENT_STATES } from '@/domain/entitlement/machine';
import {
  assertCanPurchase,
  billedTerms,
  buildPaywallModel,
  canStartPurchase,
  nextStepOnSelect,
  offersLifetimeUpgrade,
  purchaseStillNeeded,
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
    // หัวข้อเน้นฟีเจอร์ ไม่ใช่คำว่า "ฟรี" (App Review 3.1.2)
    expect(m).toMatchObject({
      headline: 'subscribe',
      offerTrial: true,
      trialDays: 7,
      defaultPlan: 'monthly',
      primaryAction: 'purchase',
      upgrade: false,
    });
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
    const expired = buildPaywallModel({
      state: 'EXPIRED',
      monthly,
      lifetime,
      trialEligibility: 'ineligible',
    });
    expect(expired).toMatchObject({ headline: 'winback', primaryAction: 'purchase' });
    expect(
      buildPaywallModel({ state: 'BILLING_GRACE', monthly, lifetime, trialEligibility: 'ineligible' })
        .headline,
    ).toBe('billing');
  });

  it('asks to fix the payment when the store revoked access during billing retry (J5)', () => {
    const m = buildPaywallModel({
      state: 'EXPIRED',
      monthly,
      lifetime,
      trialEligibility: 'ineligible',
      billingIssue: true,
    });
    expect(m).toMatchObject({ headline: 'billing', primaryAction: 'fixPayment', offerTrial: false });
    // ยังซื้อแพ็กเกจอื่นได้ (เช่น ซื้อขาด) แต่ไม่ใช่ปุ่มหลัก
    expect(m.monthly).toBe(monthly);
    expect(m.lifetime).toBe(lifetime);
    // ผู้ที่ไม่เคยมีสิทธิ์ไม่ถูกขอให้แก้การชำระเงิน
    expect(
      buildPaywallModel({
        state: 'NO_ENTITLEMENT',
        monthly,
        lifetime,
        trialEligibility: 'ineligible',
        billingIssue: true,
      }).primaryAction,
    ).toBe('purchase');
  });

  it('shows the billed amount next to the CTA in the same sentence as the free trial', () => {
    const trial = buildPaywallModel({
      state: 'NO_ENTITLEMENT',
      monthly,
      lifetime,
      trialEligibility: 'eligible',
    });
    expect(billedTerms(trial, 'monthly')).toEqual({ key: 'paywall.billed.trial', count: 7, price: '฿19.00' });
    expect(billedTerms(trial, 'lifetime')).toEqual({ key: 'paywall.billed.lifetime', price: '฿99.00' });
    const noTrial = buildPaywallModel({
      state: 'NO_ENTITLEMENT',
      monthly,
      lifetime,
      trialEligibility: 'ineligible',
    });
    expect(billedTerms(noTrial, 'monthly')).toEqual({ key: 'paywall.billed.monthly', price: '฿19.00' });
    expect(billedTerms(noTrial, null)).toBeNull();
    const empty = buildPaywallModel({
      state: 'NO_ENTITLEMENT',
      monthly: null,
      lifetime: null,
      trialEligibility: 'unknown',
    });
    expect(billedTerms(empty, 'monthly')).toBeNull();
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

describe('lifetime upgrade (SPEC J5)', () => {
  it('is offered only to entitled users who are not lifetime yet', () => {
    expect(ENTITLEMENT_STATES.filter(offersLifetimeUpgrade)).toEqual([
      'TRIALING',
      'SUBSCRIBED_MONTHLY',
      'BILLING_GRACE',
    ]);
  });

  it.each(['TRIALING', 'SUBSCRIBED_MONTHLY', 'BILLING_GRACE'] as const)(
    'shows only the lifetime plan from the store for %s',
    (state) => {
      const m = buildPaywallModel({ state, monthly, lifetime, trialEligibility: 'eligible', upgrade: true });
      expect(m).toMatchObject({
        upgrade: true,
        headline: 'upgrade',
        monthly: null,
        lifetime,
        defaultPlan: 'lifetime',
        offerTrial: false,
        trialDays: null,
        primaryAction: 'purchase',
        unavailable: false,
      });
      expect(m.disclosures).toEqual(['paywall.disclosure.lifetimeNoTrial']);
      expect(billedTerms(m, 'monthly')).toBeNull();
      expect(billedTerms(m, 'lifetime')).toEqual({ key: 'paywall.billed.lifetime', price: '฿99.00' });
    },
  );

  it.each(['NO_ENTITLEMENT', 'EXPIRED', 'LIFETIME'] as const)(
    'ignores the upgrade flag for %s (normal paywall or nothing to upgrade)',
    (state) => {
      const m = buildPaywallModel({
        state,
        monthly,
        lifetime,
        trialEligibility: 'ineligible',
        upgrade: true,
      });
      expect(m.upgrade).toBe(false);
      expect(m.monthly).toBe(monthly);
    },
  );

  it('reports unavailable in upgrade mode when the store has no lifetime product', () => {
    const m = buildPaywallModel({
      state: 'SUBSCRIBED_MONTHLY',
      monthly,
      lifetime: null,
      trialEligibility: 'ineligible',
      upgrade: true,
    });
    expect(m).toMatchObject({ unavailable: true, defaultPlan: null });
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

  it('does not buy again when linking the account restored access (J3)', () => {
    const none = { allowed: false, state: 'NO_ENTITLEMENT' } as const;
    const monthlyAccess = { allowed: true, state: 'SUBSCRIBED_MONTHLY' } as const;
    const lifetimeAccess = { allowed: true, state: 'LIFETIME' } as const;
    expect(purchaseStillNeeded(none, 'monthly', false)).toBe(true);
    expect(purchaseStillNeeded(none, 'lifetime', false)).toBe(true);
    expect(purchaseStillNeeded(monthlyAccess, 'monthly', false)).toBe(false);
    expect(purchaseStillNeeded(monthlyAccess, 'lifetime', false)).toBe(false);
    // อัปเกรดเป็นซื้อขาดโดยตั้งใจจากหน้าอัปเกรด → ซื้อต่อได้ แต่ถ้ามีซื้อขาดแล้วไม่ซื้อซ้ำ
    expect(purchaseStillNeeded(monthlyAccess, 'lifetime', true)).toBe(true);
    expect(purchaseStillNeeded(lifetimeAccess, 'lifetime', true)).toBe(false);
    expect(purchaseStillNeeded({ allowed: true, state: 'TRIALING' }, 'monthly', true)).toBe(false);
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
