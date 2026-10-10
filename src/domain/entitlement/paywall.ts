import type { EntitlementState } from './machine';

/**
 * ตรรกะของ Paywall และลำดับการซื้อ (SPEC B4–B6, J4) เป็นฟังก์ชันล้วน มี unit test ครบ
 * หน้าจอ Paywall แค่ render ผลลัพธ์ของฟังก์ชันเหล่านี้
 */

export type PlanKind = 'monthly' | 'lifetime';

/** ผลตรวจสิทธิ์ทดลองจากสโตร์ (ผ่าน RevenueCat) */
export type TrialEligibility = 'eligible' | 'ineligible' | 'unknown';

export interface StorePlan {
  kind: PlanKind;
  /** id ของแพ็กเกจใน offering (ส่งให้ PurchasesService.purchase) */
  packageId: string;
  productId: string;
  /** ราคาที่สโตร์จัดรูปแบบมาแล้ว เช่น "฿19.00" — ห้ามฮาร์ดโค้ด (SPEC J2) */
  priceString: string;
  /** จำนวนวันทดลองฟรีตามที่ตั้งในสโตร์ (null = ไม่มี free trial offer) */
  trialDays: number | null;
}

export interface PaywallInput {
  state: EntitlementState;
  monthly: StorePlan | null;
  lifetime: StorePlan | null;
  trialEligibility: TrialEligibility;
}

export type PaywallHeadline = 'trial' | 'subscribe' | 'winback' | 'billing';

export interface PaywallModel {
  headline: PaywallHeadline;
  /** แสดงข้อเสนอทดลองฟรีหรือไม่ — true เฉพาะผู้ที่มีสิทธิ์แน่นอน (SPEC B6) */
  offerTrial: boolean;
  trialDays: number | null;
  monthly: StorePlan | null;
  lifetime: StorePlan | null;
  /** แพ็กเกจที่เลือกไว้ตั้งต้น */
  defaultPlan: PlanKind | null;
  /** ข้อความเปิดเผยข้อมูลที่ต้องแสดงครบ (SPEC B5) เป็น i18n key */
  disclosures: string[];
  /** ไม่มีสินค้าให้ซื้อ (โหลดจากสโตร์ไม่ได้) */
  unavailable: boolean;
}

/**
 * สร้างโมเดลของ Paywall
 * - ไม่รู้ผล eligibility (unknown) → ถือว่าไม่มีสิทธิ์ ไม่โฆษณาทดลองฟรี (ปลอดภัยตาม B6 และคำแนะนำของ RevenueCat)
 * - สโตร์ไม่มี free trial offer สำหรับแพ็กเกจรายเดือน → ไม่แสดงทดลองฟรี
 * - เคยมีสิทธิ์แล้วหมด (EXPIRED) → ข้อความต้อนรับกลับ
 */
export function buildPaywallModel(input: PaywallInput): PaywallModel {
  const { state, monthly, lifetime, trialEligibility } = input;
  const offerTrial =
    !!monthly && monthly.trialDays !== null && monthly.trialDays > 0 && trialEligibility === 'eligible';
  let headline: PaywallHeadline;
  if (state === 'BILLING_GRACE') headline = 'billing';
  else if (state === 'EXPIRED') headline = 'winback';
  else headline = offerTrial ? 'trial' : 'subscribe';

  const disclosures: string[] = [];
  if (monthly) {
    disclosures.push(offerTrial ? 'paywall.disclosure.trialThenPrice' : 'paywall.disclosure.monthlyPrice');
    disclosures.push('paywall.disclosure.autoRenew');
    disclosures.push(
      offerTrial ? 'paywall.disclosure.cancelBeforeTrialEnds' : 'paywall.disclosure.cancelAnytime',
    );
  }
  if (lifetime) disclosures.push('paywall.disclosure.lifetimeNoTrial');

  return {
    headline,
    offerTrial,
    trialDays: offerTrial ? (monthly?.trialDays ?? null) : null,
    monthly,
    lifetime,
    defaultPlan: monthly ? 'monthly' : lifetime ? 'lifetime' : null,
    disclosures,
    unavailable: !monthly && !lifetime,
  };
}

// ───────────── ลำดับการซื้อ (SPEC B4) ─────────────

export type PurchaseStep =
  | { step: 'idle' }
  | { step: 'needLogin'; plan: PlanKind }
  | { step: 'linkingAccount'; plan: PlanKind }
  | { step: 'ready'; plan: PlanKind }
  | { step: 'purchasing'; plan: PlanKind }
  | { step: 'done' }
  | { step: 'cancelled'; plan: PlanKind }
  | { step: 'error'; plan: PlanKind; message: string };

export interface PurchaseContext {
  /** id ผู้ใช้ที่ล็อกอิน (Supabase) */
  authUserId: string | null;
  /** app user id ที่ RevenueCat ใช้อยู่ — ต้องเท่ากับ authUserId ก่อนซื้อ */
  purchasesUserId: string | null;
}

/** เงื่อนไขเดียวที่อนุญาตให้เรียกซื้อ/เริ่มทดลอง: ล็อกอินแล้ว และ RevenueCat logIn ด้วย id เดียวกันแล้ว */
export function canStartPurchase(ctx: PurchaseContext): boolean {
  return !!ctx.authUserId && ctx.purchasesUserId === ctx.authUserId;
}

/** ขั้นถัดไปเมื่อผู้ใช้แตะปุ่มซื้อบน Paywall */
export function nextStepOnSelect(plan: PlanKind, ctx: PurchaseContext): PurchaseStep {
  if (!ctx.authUserId) return { step: 'needLogin', plan };
  if (ctx.purchasesUserId !== ctx.authUserId) return { step: 'linkingAccount', plan };
  return { step: 'purchasing', plan };
}

export class PurchaseRequiresLoginError extends Error {
  constructor() {
    super('Purchase or trial cannot start before sign-in (SPEC B4)');
    this.name = 'PurchaseRequiresLoginError';
  }
}

export function assertCanPurchase(ctx: PurchaseContext): void {
  if (!canStartPurchase(ctx)) throw new PurchaseRequiresLoginError();
}
