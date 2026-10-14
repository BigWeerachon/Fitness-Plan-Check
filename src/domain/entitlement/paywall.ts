import type { EntitlementState } from './machine';

/**
 * ตรรกะของ Paywall (SPEC B4–B6, J4) เป็นฟังก์ชันล้วน มี unit test ครบ
 * ซื้อได้ทันทีโดยไม่ต้องล็อกอิน (D81) จึงไม่มีขั้นตอนการซื้อให้ตัดสินในโดเมนอีก
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
  /** สโตร์แจ้งปัญหาการชำระเงินไว้ (billingIssueAt ในแคช) — แยกสิทธิ์หมดเพราะตัดเงินไม่ผ่านออกจากหมดอายุปกติ */
  billingIssue?: boolean;
  /** เปิดจากการตั้งค่าเพื่อเปลี่ยนรายเดือน/ทดลองเป็นซื้อขาด (SPEC J5) */
  upgrade?: boolean;
}

export type PaywallHeadline = 'subscribe' | 'winback' | 'billing' | 'upgrade';

/** ปุ่มหลักของ Paywall: ซื้อ หรือไปแก้วิธีชำระเงินในสโตร์ */
export type PaywallPrimaryAction = 'purchase' | 'fixPayment';

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
  /** โหมดอัปเกรดเป็นซื้อขาด: ผู้มีสิทธิ์อยู่แล้วเปิด Paywall ได้ แสดงเฉพาะแพ็กเกจซื้อขาด */
  upgrade: boolean;
  primaryAction: PaywallPrimaryAction;
}

/** สถานะที่อัปเกรดเป็นซื้อขาดได้: มีสิทธิ์อยู่แต่ยังไม่ใช่ซื้อขาด (SPEC J5) */
export function offersLifetimeUpgrade(state: EntitlementState): boolean {
  return state === 'TRIALING' || state === 'SUBSCRIBED_MONTHLY' || state === 'BILLING_GRACE';
}

/**
 * สร้างโมเดลของ Paywall
 * - ไม่รู้ผล eligibility (unknown) → ถือว่าไม่มีสิทธิ์ ไม่โฆษณาทดลองฟรี (ปลอดภัยตาม B6 และคำแนะนำของ RevenueCat)
 * - สโตร์ไม่มี free trial offer สำหรับแพ็กเกจรายเดือน → ไม่แสดงทดลองฟรี
 * - หัวข้อเน้นฟีเจอร์เสมอ ไม่ใช้คำว่า "ฟรี" เป็นหัวข้อ — ราคาที่ถูกเรียกเก็บต้องเด่นไม่น้อยกว่าข้อเสนอฟรี (App Review 3.1.2)
 * - เคยมีสิทธิ์แล้วหมด (EXPIRED) → ข้อความต้อนรับกลับ; ถ้าหมดเพราะตัดเงินไม่ผ่าน (billing retry / account hold)
 *   → ปุ่มหลักคือไปแก้วิธีชำระเงินในสโตร์ แทนการชวนสมัครใหม่
 * - upgrade → เฉพาะผู้ที่มีสิทธิ์แบบรายเดือน/ทดลอง/grace: แสดงแค่ซื้อขาด
 */
export function buildPaywallModel(input: PaywallInput): PaywallModel {
  const { state, lifetime, trialEligibility } = input;
  const upgrade = !!input.upgrade && offersLifetimeUpgrade(state);
  const monthly = upgrade ? null : input.monthly;
  const offerTrial =
    !!monthly && monthly.trialDays !== null && monthly.trialDays > 0 && trialEligibility === 'eligible';
  const billingProblem =
    !upgrade && (state === 'BILLING_GRACE' || (state === 'EXPIRED' && !!input.billingIssue));
  let headline: PaywallHeadline;
  if (upgrade) headline = 'upgrade';
  else if (billingProblem) headline = 'billing';
  else if (state === 'EXPIRED') headline = 'winback';
  else headline = 'subscribe';

  const disclosures: string[] = [];
  if (monthly) {
    disclosures.push(offerTrial ? 'paywall.disclosure.trialThenPrice' : 'paywall.disclosure.monthlyPrice');
    disclosures.push('paywall.disclosure.autoRenew');
    disclosures.push(
      offerTrial ? 'paywall.disclosure.cancelBeforeTrialEnds' : 'paywall.disclosure.cancelAnytime',
    );
  }
  if (lifetime) disclosures.push('paywall.disclosure.lifetimeNoTrial');

  let defaultPlan: PlanKind | null = null;
  if (monthly) defaultPlan = 'monthly';
  else if (lifetime) defaultPlan = 'lifetime';

  return {
    headline,
    offerTrial,
    trialDays: offerTrial ? (monthly?.trialDays ?? null) : null,
    monthly,
    lifetime,
    defaultPlan,
    disclosures,
    unavailable: !monthly && !lifetime,
    upgrade,
    primaryAction: billingProblem ? 'fixPayment' : 'purchase',
  };
}

export type BilledTerms =
  | { key: 'paywall.billed.trial'; count: number; price: string }
  | { key: 'paywall.billed.monthly'; price: string }
  | { key: 'paywall.billed.lifetime'; price: string };

/**
 * ยอดที่จะถูกเรียกเก็บจริงของแพ็กเกจที่เลือก (ราคาจากสโตร์) — แสดงติดปุ่มซื้อ ตัวใหญ่เท่าหรือมากกว่าคำว่า "ฟรี"
 * ข้อเสนอทดลองอยู่ในประโยคเดียวกับราคาเสมอ (SPEC B5, App Review 3.1.2)
 */
export function billedTerms(model: PaywallModel, planKind: PlanKind | null): BilledTerms | null {
  const selected = planKind ? model[planKind] : null;
  if (!selected) return null;
  if (selected.kind === 'lifetime') return { key: 'paywall.billed.lifetime', price: selected.priceString };
  if (model.offerTrial && model.trialDays) {
    return { key: 'paywall.billed.trial', count: model.trialDays, price: selected.priceString };
  }
  return { key: 'paywall.billed.monthly', price: selected.priceString };
}
