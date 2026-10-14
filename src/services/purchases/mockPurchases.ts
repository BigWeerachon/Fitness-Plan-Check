import type { StorePlan, TrialEligibility } from '../../domain/entitlement/paywall';
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
 * ไม่มีล็อกอิน (D81): มีบัญชีสโตร์เดียว (Apple ID / Google) และผู้ใช้ RevenueCat นิรนามของเครื่องนี้
 * ซื้อบนเครื่องนี้ = เห็นสิทธิ์ทันที; ติดตั้งใหม่/เครื่องใหม่ (simulateReinstall) ต้องกด Restore ก่อนจึงเห็นสิทธิ์
 */
export class MockPurchasesService implements PurchasesService {
  /** การซื้อในบัญชีสโตร์ (สร้างตอนใช้ครั้งแรกตามสถานการณ์ที่ตั้งไว้) */
  private storeAccount: MockAccount | null = null;
  /** ผู้ใช้ RevenueCat นิรนามของเครื่องนี้เห็นการซื้อในบัญชีสโตร์แล้วหรือยัง */
  private linked = true;
  private listeners = new Set<(info: CustomerInfoLike) => void>();
  /** ตั้งค่าเพื่อจำลองข้อผิดพลาดในเทสต์ */
  failNextPurchase: PurchaseResult | null = null;
  offline = false;
  /**
   * พฤติกรรมตอนออฟไลน์: 'throw' = เรียกไม่ได้, 'cached' = คืนข้อมูลล่าสุดจากแคชของ SDK (requestDate เก่า)
   * แบบหลังคือสิ่งที่ RevenueCat SDK ทำจริงเมื่อเคยดึงข้อมูลบนเครื่องนี้แล้ว
   */
  offlineMode: 'throw' | 'cached' = 'throw';
  private lastInfo: CustomerInfoLike | null = null;
  purchaseCalls: { plan: string }[] = [];
  restoreCalls = 0;

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

  private account(): MockAccount {
    this.storeAccount ??= this.seed();
    return this.storeAccount;
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
    if (!this.linked) {
      const empty: CustomerInfoLike = {
        entitlements: { active: {}, all: {} },
        nonSubscriptionTransactions: [],
        requestDate: new Date(now()).toISOString(),
      };
      this.lastInfo = empty;
      return empty;
    }
    const acc = this.account();
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
  private offlineInfo(): CustomerInfoLike {
    if (this.offlineMode === 'cached' && this.lastInfo) return this.lastInfo;
    throw new Error('network');
  }

  private emit() {
    const info = this.snapshotCustomerInfo();
    this.listeners.forEach((l) => l(info));
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
    // สิทธิ์ทดลองผูกกับบัญชีสโตร์ ไม่ใช่ผู้ใช้ RevenueCat นิรนาม
    return this.account().trialUsed ? 'ineligible' : 'eligible';
  }

  async purchase(plan: StorePlan): Promise<PurchaseResult> {
    this.purchaseCalls.push({ plan: plan.kind });
    if (this.failNextPurchase) {
      const r = this.failNextPurchase;
      this.failNextPurchase = null;
      return r;
    }
    if (this.offline) return { status: 'error', code: 'network' };
    const acc = this.account();
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
    // ซื้อผ่านบัญชีสโตร์บนเครื่องนี้ → ผู้ใช้นิรนามของเครื่องนี้เห็นการซื้อทั้งหมดในบัญชีด้วย
    this.linked = true;
    this.emit();
    return { status: 'success', info: this.snapshotCustomerInfo() };
  }

  async restore(): Promise<CustomerInfoLike> {
    this.restoreCalls += 1;
    if (this.offline) throw new Error('network');
    this.linked = true;
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
  /** ติดตั้งแอปใหม่/ย้ายเครื่อง: ผู้ใช้ RevenueCat นิรนามใหม่ ยังไม่เห็นการซื้อจนกว่าจะกด Restore */
  simulateReinstall() {
    this.linked = false;
    this.lastInfo = null;
  }

  simulateExpire() {
    const acc = this.account();
    if (acc.entitlement) {
      acc.everHad = { ...acc.entitlement, isActive: false };
      acc.entitlement = { ...acc.entitlement, expirationDate: new Date(now() - 1000).toISOString() };
    }
    this.emit();
  }

  /** สโตร์ต่ออายุรอบใหม่ (เช่น Google Play ต่ออายุตรงเวลาหมดอายุ) */
  simulateRenew(days = MONTHLY_PERIOD_DAYS) {
    const acc = this.account();
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

  simulateCancel() {
    const acc = this.account();
    if (acc.entitlement) acc.entitlement = { ...acc.entitlement, willRenew: false };
    this.emit();
  }
}
