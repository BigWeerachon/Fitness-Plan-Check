import { assertCanPurchase, type StorePlan, type TrialEligibility } from '../../domain/entitlement/paywall';
import type { CustomerInfoLike, EntitlementInfoLike } from '../../domain/entitlement/machine';
import { now } from '../../utils/clock';
import type { PurchaseResult, PurchasesService, StorePlans } from './types';

export type MockScenario =
  'new' | 'trial_used' | 'trialing' | 'monthly' | 'lifetime' | 'expired' | 'billing_grace';

interface MockAccount {
  trialUsed: boolean;
  entitlement: EntitlementInfoLike | null;
  everHad: EntitlementInfoLike | null;
  lifetime: boolean;
}

const DAY = 86_400_000;

/**
 * ร้านค้าจำลองสำหรับ dev/test — จำลองพฤติกรรมของสโตร์ (ไม่ใช่ตัวนับเวลาทดลองของแอป):
 * ราคาและข้อเสนอทดลองมาจาก "สโตร์จำลอง" นี้ผ่าน interface เดียวกับ RevenueCat
 * สิทธิ์ผูกกับ app user id เหมือนของจริง (ล็อกอินบัญชีเดิมบนเครื่องใหม่ = สิทธิ์กลับมา SPEC B11)
 */
export class MockPurchasesService implements PurchasesService {
  private appUserId: string | null = null;
  private accounts = new Map<string, MockAccount>();
  private listeners = new Set<(info: CustomerInfoLike) => void>();
  /** ตั้งค่าเพื่อจำลองข้อผิดพลาดในเทสต์ */
  failNextPurchase: PurchaseResult | null = null;
  offline = false;
  purchaseCalls: { plan: string; appUserId: string | null }[] = [];

  constructor(private scenario: MockScenario = 'new') {}

  readonly monthlyPlan: StorePlan = {
    kind: 'monthly',
    packageId: '$rc_monthly',
    productId: 'fitnese_monthly',
    priceString: '฿19.00',
    trialDays: 7,
  };
  readonly lifetimePlan: StorePlan = {
    kind: 'lifetime',
    packageId: '$rc_lifetime',
    productId: 'fitnese_lifetime',
    priceString: '฿99.00',
    trialDays: null,
  };

  async configure(): Promise<void> {}

  private account(id: string): MockAccount {
    let acc = this.accounts.get(id);
    if (!acc) {
      acc = this.seed();
      this.accounts.set(id, acc);
    }
    return acc;
  }

  private seed(): MockAccount {
    const t = now();
    const sub = (periodType: string, exp: number, billing: number | null = null): EntitlementInfoLike => ({
      identifier: 'pro',
      isActive: exp > t,
      willRenew: true,
      periodType,
      productIdentifier: this.monthlyPlan.productId,
      expirationDate: new Date(exp).toISOString(),
      billingIssueDetectedAt: billing ? new Date(billing).toISOString() : null,
    });
    switch (this.scenario) {
      case 'trial_used':
        return { trialUsed: true, entitlement: null, everHad: null, lifetime: false };
      case 'trialing':
        return { trialUsed: true, entitlement: sub('TRIAL', t + 5 * DAY), everHad: null, lifetime: false };
      case 'monthly':
        return { trialUsed: true, entitlement: sub('NORMAL', t + 20 * DAY), everHad: null, lifetime: false };
      case 'billing_grace':
        return {
          trialUsed: true,
          entitlement: sub('NORMAL', t + 3 * DAY, t - DAY),
          everHad: null,
          lifetime: false,
        };
      case 'lifetime':
        return { trialUsed: false, entitlement: null, everHad: null, lifetime: true };
      case 'expired': {
        const old = { ...sub('NORMAL', t - 2 * DAY), isActive: false, willRenew: false };
        return { trialUsed: true, entitlement: null, everHad: old, lifetime: false };
      }
      default:
        return { trialUsed: false, entitlement: null, everHad: null, lifetime: false };
    }
  }

  private info(): CustomerInfoLike {
    if (!this.appUserId) return { entitlements: { active: {}, all: {} }, nonSubscriptionTransactions: [] };
    const acc = this.account(this.appUserId);
    const active: Record<string, EntitlementInfoLike> = {};
    const all: Record<string, EntitlementInfoLike> = {};
    if (acc.lifetime) {
      const lt: EntitlementInfoLike = {
        identifier: 'pro',
        isActive: true,
        willRenew: false,
        periodType: 'NORMAL',
        productIdentifier: this.lifetimePlan.productId,
        expirationDate: null,
        billingIssueDetectedAt: null,
      };
      active.pro = lt;
      all.pro = lt;
    } else if (acc.entitlement) {
      const exp = acc.entitlement.expirationDate ? Date.parse(acc.entitlement.expirationDate) : Infinity;
      const isActive = exp > now();
      const e = { ...acc.entitlement, isActive };
      all.pro = e;
      if (isActive) active.pro = e;
    } else if (acc.everHad) {
      all.pro = acc.everHad;
    }
    return {
      entitlements: { active, all },
      nonSubscriptionTransactions: acc.lifetime ? [{ productIdentifier: this.lifetimePlan.productId }] : [],
    };
  }

  private emit() {
    const info = this.info();
    this.listeners.forEach((l) => l(info));
  }

  async logIn(userId: string): Promise<CustomerInfoLike> {
    if (this.offline) throw new Error('network');
    this.appUserId = userId;
    const info = this.info();
    this.emit();
    return info;
  }

  async logOut(): Promise<void> {
    this.appUserId = null;
    this.emit();
  }

  currentAppUserId(): string | null {
    return this.appUserId;
  }

  async getCustomerInfo(): Promise<CustomerInfoLike> {
    if (this.offline) throw new Error('network');
    return this.info();
  }

  async getPlans(): Promise<StorePlans> {
    if (this.offline) throw new Error('network');
    return { monthly: this.monthlyPlan, lifetime: this.lifetimePlan };
  }

  async checkTrialEligibility(plan: StorePlan): Promise<TrialEligibility> {
    if (plan.kind !== 'monthly' || !plan.trialDays) return 'ineligible';
    if (!this.appUserId) return this.scenario === 'new' ? 'eligible' : 'ineligible';
    return this.account(this.appUserId).trialUsed ? 'ineligible' : 'eligible';
  }

  async purchase(plan: StorePlan, authUserId: string | null): Promise<PurchaseResult> {
    assertCanPurchase({ authUserId, purchasesUserId: this.appUserId });
    this.purchaseCalls.push({ plan: plan.kind, appUserId: this.appUserId });
    if (this.failNextPurchase) {
      const r = this.failNextPurchase;
      this.failNextPurchase = null;
      return r;
    }
    const acc = this.account(this.appUserId!);
    if (plan.kind === 'lifetime') {
      acc.lifetime = true;
    } else {
      const trial = !acc.trialUsed && !!plan.trialDays;
      acc.trialUsed = true;
      acc.entitlement = {
        identifier: 'pro',
        isActive: true,
        willRenew: true,
        periodType: trial ? 'TRIAL' : 'NORMAL',
        productIdentifier: plan.productId,
        expirationDate: new Date(now() + (trial ? plan.trialDays! : 30) * DAY).toISOString(),
        billingIssueDetectedAt: null,
      };
    }
    this.emit();
    return { status: 'success', info: this.info() };
  }

  async restore(): Promise<CustomerInfoLike> {
    if (this.offline) throw new Error('network');
    const info = this.info();
    this.emit();
    return info;
  }

  onCustomerInfo(listener: (info: CustomerInfoLike) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async manageSubscriptionsUrl(): Promise<string> {
    return 'https://apps.apple.com/account/subscriptions';
  }

  // ───── ตัวช่วยสำหรับเทสต์: จำลองเหตุการณ์จากสโตร์ ─────
  simulateExpire(userId: string) {
    const acc = this.account(userId);
    if (acc.entitlement) {
      acc.everHad = { ...acc.entitlement, isActive: false };
      acc.entitlement = { ...acc.entitlement, expirationDate: new Date(now() - 1000).toISOString() };
    }
    this.emit();
  }

  simulateCancel(userId: string) {
    const acc = this.account(userId);
    if (acc.entitlement) acc.entitlement = { ...acc.entitlement, willRenew: false };
    this.emit();
  }
}
