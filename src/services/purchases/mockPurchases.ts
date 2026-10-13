import { assertCanPurchase, type StorePlan, type TrialEligibility } from '../../domain/entitlement/paywall';
import {
  ENTITLEMENT_ID,
  type CustomerInfoLike,
  type EntitlementInfoLike,
} from '../../domain/entitlement/machine';
import { now } from '../../utils/clock';
import {
  STORE_SUBSCRIPTION_URLS,
  type PurchaseResult,
  type PurchasesService,
  type StorePlans,
} from './types';

export type MockScenario =
  | 'new'
  | 'trial_used'
  | 'trialing'
  | 'monthly'
  | 'lifetime'
  | 'expired'
  | 'billing_grace'
  /** ตัดเงินไม่ผ่านจนหมด grace (billing retry / account hold) — สโตร์ถอนสิทธิ์แต่ยังมี billing issue */
  | 'billing_retry';

interface MockAccount {
  trialUsed: boolean;
  entitlement: EntitlementInfoLike | null;
  everHad: EntitlementInfoLike | null;
  lifetime: boolean;
}

const DAY = 86_400_000;
const MONTHLY_PERIOD_DAYS = 30;

function newAccount(patch: Partial<MockAccount> = {}): MockAccount {
  return { trialUsed: true, entitlement: null, everHad: null, lifetime: false, ...patch };
}

function buildEntitlement(o: {
  productId: string;
  periodType: string;
  expiresAt: number | null;
  isActive?: boolean;
  willRenew?: boolean;
  billingIssueAt?: number | null;
}): EntitlementInfoLike {
  return {
    identifier: ENTITLEMENT_ID,
    isActive: o.isActive ?? true,
    willRenew: o.willRenew ?? true,
    periodType: o.periodType,
    productIdentifier: o.productId,
    expirationDate: o.expiresAt === null ? null : new Date(o.expiresAt).toISOString(),
    billingIssueDetectedAt: o.billingIssueAt ? new Date(o.billingIssueAt).toISOString() : null,
  };
}

/** ไม่มีวันหมดอายุถือว่ายังไม่หมด */
function isUnexpired(entitlement: EntitlementInfoLike): boolean {
  const expiresAt = entitlement.expirationDate ? Date.parse(entitlement.expirationDate) : Infinity;
  return expiresAt > now();
}

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
  /**
   * พฤติกรรมตอนออฟไลน์: 'throw' = เรียกไม่ได้, 'cached' = คืนข้อมูลล่าสุดจากแคชของ SDK (requestDate เก่า)
   * แบบหลังคือสิ่งที่ RevenueCat SDK ทำจริงเมื่อเคย logIn บนเครื่องนี้แล้ว
   */
  offlineMode: 'throw' | 'cached' = 'throw';
  private lastInfo: CustomerInfoLike | null = null;
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
    const nowMs = now();
    const monthlyEntitlement = (
      periodType: string,
      expiresAt: number,
      billingIssueAt: number | null = null,
    ): EntitlementInfoLike =>
      buildEntitlement({
        productId: this.monthlyPlan.productId,
        periodType,
        expiresAt,
        isActive: expiresAt > nowMs,
        billingIssueAt,
      });
    switch (this.scenario) {
      case 'trial_used':
        return newAccount();
      case 'trialing':
        return newAccount({ entitlement: monthlyEntitlement('TRIAL', nowMs + 5 * DAY) });
      case 'monthly':
        return newAccount({ entitlement: monthlyEntitlement('NORMAL', nowMs + 20 * DAY) });
      case 'billing_grace':
        return newAccount({ entitlement: monthlyEntitlement('NORMAL', nowMs + 3 * DAY, nowMs - DAY) });
      case 'billing_retry':
        return newAccount({ entitlement: monthlyEntitlement('NORMAL', nowMs - DAY, nowMs - 4 * DAY) });
      case 'lifetime':
        return newAccount({ trialUsed: false, lifetime: true });
      case 'expired': {
        const old = { ...monthlyEntitlement('NORMAL', nowMs - 2 * DAY), isActive: false, willRenew: false };
        return newAccount({ everHad: old });
      }
      default:
        return newAccount({ trialUsed: false });
    }
  }

  /** สร้าง CustomerInfo จากบัญชีปัจจุบัน และเก็บเป็น lastInfo (แคชที่ offlineInfo คืนตอนออฟไลน์) */
  private snapshotCustomerInfo(): CustomerInfoLike {
    if (!this.appUserId) return { entitlements: { active: {}, all: {} }, nonSubscriptionTransactions: [] };
    const acc = this.account(this.appUserId);
    const active: Record<string, EntitlementInfoLike> = {};
    const all: Record<string, EntitlementInfoLike> = {};
    // รายเดือนที่ซื้อไว้ยังอยู่ในรอบแม้ซื้อขาดแล้ว (สโตร์ไม่ยกเลิกให้อัตโนมัติ SPEC J5)
    const monthlyEntitlement = acc.entitlement;
    const monthlyActive = !!monthlyEntitlement && isUnexpired(monthlyEntitlement);
    if (acc.lifetime) {
      const lifetimeEntitlement = buildEntitlement({
        productId: this.lifetimePlan.productId,
        periodType: 'NORMAL',
        expiresAt: null,
        willRenew: false,
      });
      active[ENTITLEMENT_ID] = lifetimeEntitlement;
      all[ENTITLEMENT_ID] = lifetimeEntitlement;
    } else if (monthlyEntitlement) {
      const current = { ...monthlyEntitlement, isActive: monthlyActive };
      all[ENTITLEMENT_ID] = current;
      if (monthlyActive) active[ENTITLEMENT_ID] = current;
    } else if (acc.everHad) {
      all[ENTITLEMENT_ID] = acc.everHad;
    }
    const info: CustomerInfoLike = {
      entitlements: { active, all },
      nonSubscriptionTransactions: acc.lifetime ? [{ productIdentifier: this.lifetimePlan.productId }] : [],
      activeSubscriptions: monthlyEntitlement && monthlyActive ? [monthlyEntitlement.productIdentifier] : [],
      subscriptionsByProductIdentifier: monthlyEntitlement
        ? {
            [monthlyEntitlement.productIdentifier]: {
              willRenew: monthlyEntitlement.willRenew,
              isActive: monthlyActive,
            },
          }
        : {},
      requestDate: new Date(now()).toISOString(),
    };
    this.lastInfo = info;
    return info;
  }

  /** ตอนออฟไลน์: โยน error หรือคืนแคชเก่า ตาม offlineMode */
  private offlineInfo(userId?: string): CustomerInfoLike {
    if (this.offlineMode === 'cached' && this.lastInfo && (!userId || userId === this.appUserId)) {
      return this.lastInfo;
    }
    throw new Error('network');
  }

  private emit() {
    const info = this.snapshotCustomerInfo();
    this.listeners.forEach((l) => l(info));
  }

  async logIn(userId: string): Promise<CustomerInfoLike> {
    if (this.offline) return this.offlineInfo(userId);
    this.appUserId = userId;
    const info = this.snapshotCustomerInfo();
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
    if (this.offline) return this.offlineInfo();
    return this.snapshotCustomerInfo();
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
      acc.entitlement = buildEntitlement({
        productId: plan.productId,
        periodType: trial ? 'TRIAL' : 'NORMAL',
        expiresAt: now() + (trial ? plan.trialDays! : MONTHLY_PERIOD_DAYS) * DAY,
      });
    }
    this.emit();
    return { status: 'success', info: this.snapshotCustomerInfo() };
  }

  async restore(): Promise<CustomerInfoLike> {
    if (this.offline) throw new Error('network');
    const info = this.snapshotCustomerInfo();
    this.emit();
    return info;
  }

  onCustomerInfo(listener: (info: CustomerInfoLike) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async manageSubscriptionsUrl(): Promise<string> {
    return STORE_SUBSCRIPTION_URLS.ios;
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

  /** สโตร์ต่ออายุรอบใหม่ (เช่น Google Play ต่ออายุตรงเวลาหมดอายุ) */
  simulateRenew(userId: string, days = MONTHLY_PERIOD_DAYS) {
    const acc = this.account(userId);
    if (acc.entitlement) {
      acc.entitlement = {
        ...acc.entitlement,
        periodType: 'NORMAL',
        isActive: true,
        expirationDate: new Date(now() + days * DAY).toISOString(),
      };
    }
    this.emit();
  }

  simulateCancel(userId: string) {
    const acc = this.account(userId);
    if (acc.entitlement) acc.entitlement = { ...acc.entitlement, willRenew: false };
    this.emit();
  }
}
