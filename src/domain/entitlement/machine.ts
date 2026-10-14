/**
 * State machine ของสิทธิ์การใช้งาน (SPEC B8) — โมดูลเดียวที่ทุกหน้าใช้ตัดสินสิทธิ์
 *
 * ฟังก์ชันล้วน ไม่ import อะไรจากแอป — แอปออฟไลน์ล้วน (D81) ไม่มีเซิร์ฟเวอร์ของเราเอง
 *
 * ไม่มีตัวนับเวลาทดลองในแอป (SPEC B2): สถานะทั้งหมดมาจาก customerInfo ของ RevenueCat (ผู้ใช้นิรนาม)
 */

export const ENTITLEMENT_ID = 'pro';

export type EntitlementState =
  'NO_ENTITLEMENT' | 'TRIALING' | 'SUBSCRIBED_MONTHLY' | 'LIFETIME' | 'BILLING_GRACE' | 'EXPIRED';

export const ENTITLEMENT_STATES: readonly EntitlementState[] = [
  'NO_ENTITLEMENT',
  'TRIALING',
  'SUBSCRIBED_MONTHLY',
  'LIFETIME',
  'BILLING_GRACE',
  'EXPIRED',
];

/** สถานะที่ปลดล็อกฟีเจอร์ (ทดลองและจ่ายเงินได้สิทธิ์เท่ากัน SPEC J3) */
export function hasAccess(state: EntitlementState): boolean {
  return (
    state === 'TRIALING' ||
    state === 'SUBSCRIBED_MONTHLY' ||
    state === 'LIFETIME' ||
    state === 'BILLING_GRACE'
  );
}

export type PeriodType = 'TRIAL' | 'INTRO' | 'NORMAL' | 'PREPAID' | 'UNKNOWN';

export interface EntitlementSnapshot {
  state: EntitlementState;
  /** product id ที่ให้สิทธิ์อยู่ (null ถ้าไม่มี) */
  productId: string | null;
  periodType: PeriodType | null;
  /** วันหมดอายุ/วันต่ออายุ (ms) — null สำหรับซื้อขาดหรือไม่มีสิทธิ์ */
  expirationDate: number | null;
  willRenew: boolean;
  /** เวลาที่สโตร์แจ้งปัญหาการชำระเงิน (ช่วง grace / billing retry) */
  billingIssueAt: number | null;
  /** เวลาที่ได้ข้อมูลนี้มา ใช้ตัดสินความสดของแคชออฟไลน์ */
  verifiedAt: number;
  /**
   * ซื้อขาดแล้วแต่รายเดือนยังต่ออายุอยู่ (SPEC J5) — สโตร์จะเก็บเงินรายเดือนต่อจนกว่าผู้ใช้ยกเลิกเอง
   * มีความหมายเฉพาะเมื่อ state = LIFETIME (สถานะอื่นเป็น false เสมอ)
   */
  alsoRenewingMonthly: boolean;
}

export const EMPTY_SNAPSHOT: EntitlementSnapshot = {
  state: 'NO_ENTITLEMENT',
  productId: null,
  periodType: null,
  expirationDate: null,
  willRenew: false,
  billingIssueAt: null,
  verifiedAt: 0,
  alsoRenewingMonthly: false,
};

/** รูปร่างข้อมูลขั้นต่ำจาก CustomerInfo ของ RevenueCat (react-native-purchases) */
export interface EntitlementInfoLike {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  productIdentifier: string;
  expirationDate: string | null;
  billingIssueDetectedAt: string | null;
  unsubscribeDetectedAt?: string | null;
}

export interface CustomerInfoLike {
  entitlements: {
    active: Record<string, EntitlementInfoLike | undefined>;
    all: Record<string, EntitlementInfoLike | undefined>;
  };
  nonSubscriptionTransactions?: { productIdentifier: string }[];
  /** product id ของ subscription ที่ยังอยู่ในรอบ (รวมที่ยกเลิกแล้วแต่ยังไม่หมดรอบ) */
  activeSubscriptions?: string[];
  /** รายละเอียดต่อ subscription — ใช้ดูว่ายังต่ออายุอยู่หรือไม่ */
  subscriptionsByProductIdentifier?: Record<string, { willRenew: boolean; isActive?: boolean } | undefined>;
  /** เวลาที่ RevenueCat สร้างข้อมูลนี้ (ISO) — ข้อมูลที่ SDK อ่านจากแคชในเครื่องตอนออฟไลน์จะเก่า */
  requestDate?: string;
}

/** product id ของซื้อขาด (ตั้งใน App Store Connect / Play Console ดู docs/HUMAN_TASKS.md) */
export function isLifetimeProduct(productId: string | null | undefined): boolean {
  return !!productId && /lifetime/i.test(productId);
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function normalizePeriod(p: string | null | undefined): PeriodType {
  const v = (p ?? '').toUpperCase();
  return v === 'TRIAL' || v === 'INTRO' || v === 'NORMAL' || v === 'PREPAID' ? v : 'UNKNOWN';
}

/**
 * มีรายเดือนที่ยังต่ออายุอยู่ข้างๆ ซื้อขาดหรือไม่ (SPEC J5)
 * activeSubscriptions รวม subscription ที่ยกเลิกแล้วแต่ยังไม่หมดรอบ จึงดู willRenew ประกอบ
 * ถ้าไม่รู้ว่ายังต่ออายุหรือไม่ ถือว่าต่ออายุ — เตือนเกินดีกว่าปล่อยให้ถูกเก็บเงินโดยไม่รู้
 */
function hasRenewingMonthlySubscription(
  info: CustomerInfoLike,
  activeEntitlement: EntitlementInfoLike | undefined,
  now: number,
): boolean {
  const ids = new Set(info.activeSubscriptions ?? []);
  if (
    activeEntitlement &&
    !isLifetimeProduct(activeEntitlement.productIdentifier) &&
    (toMs(activeEntitlement.expirationDate) ?? 0) > now
  ) {
    ids.add(activeEntitlement.productIdentifier);
  }
  return [...ids].some((id) => !isLifetimeProduct(id) && isStillRenewing(id, info, activeEntitlement));
}

/** product เดียวนี้ยังต่ออายุอยู่ไหม: รู้จาก subscription → entitlement เดียวกัน → ไม่รู้เลยถือว่าต่ออายุ */
function isStillRenewing(
  productId: string,
  info: CustomerInfoLike,
  activeEntitlement: EntitlementInfoLike | undefined,
): boolean {
  const subscription = info.subscriptionsByProductIdentifier?.[productId];
  if (subscription) return subscription.isActive !== false && subscription.willRenew;
  if (activeEntitlement?.productIdentifier === productId) return activeEntitlement.willRenew;
  return true;
}

/**
 * แปลง CustomerInfo → สถานะ
 * - active + ไม่มีวันหมดอายุ หรือเป็นสินค้าซื้อขาด → LIFETIME (ถ้ามีทั้งรายเดือนและซื้อขาด ซื้อขาดชนะ SPEC J5)
 * - active + มี billing issue → BILLING_GRACE (สโตร์ยังให้สิทธิ์ระหว่าง grace period)
 * - active + periodType TRIAL → TRIALING
 * - active อื่นๆ → SUBSCRIBED_MONTHLY
 * - ไม่ active แต่เคยมี → EXPIRED, ไม่เคยมีเลย → NO_ENTITLEMENT
 * ถ้า expirationDate ผ่านไปแล้วตามนาฬิกา now ถือว่าไม่ active (กันข้อมูลแคชเก่า)
 */
export function deriveSnapshot(info: CustomerInfoLike, now: number): EntitlementSnapshot {
  const activeEntitlement = info.entitlements.active[ENTITLEMENT_ID];
  const anyEntitlement = info.entitlements.all[ENTITLEMENT_ID];
  const ownsLifetime = (info.nonSubscriptionTransactions ?? []).some((t) =>
    isLifetimeProduct(t.productIdentifier),
  );

  if (activeEntitlement && activeEntitlement.isActive) {
    const expirationDate = toMs(activeEntitlement.expirationDate);
    const base = {
      productId: activeEntitlement.productIdentifier,
      periodType: normalizePeriod(activeEntitlement.periodType),
      expirationDate,
      willRenew: activeEntitlement.willRenew,
      billingIssueAt: toMs(activeEntitlement.billingIssueDetectedAt),
      verifiedAt: now,
      alsoRenewingMonthly: false,
    };
    const isLifetimeEntitlement =
      expirationDate === null || isLifetimeProduct(activeEntitlement.productIdentifier) || ownsLifetime;
    if (isLifetimeEntitlement) {
      return {
        ...base,
        state: 'LIFETIME',
        expirationDate: null,
        willRenew: false,
        periodType: 'NORMAL',
        alsoRenewingMonthly: hasRenewingMonthlySubscription(info, activeEntitlement, now),
      };
    }
    if (expirationDate > now) {
      if (base.billingIssueAt !== null) return { ...base, state: 'BILLING_GRACE' };
      if (base.periodType === 'TRIAL') return { ...base, state: 'TRIALING' };
      return { ...base, state: 'SUBSCRIBED_MONTHLY' };
    }
  }
  if (ownsLifetime && !anyEntitlement) {
    // ซื้อขาดไว้แต่ยังไม่มี entitlement เลย (เช่น แคชเก่า) ให้สิทธิ์ตามธุรกรรมจริง
    // ถ้ามี entitlement แต่ไม่ active (เช่น คืนเงินซื้อขาดแล้วแต่สโตร์ยังแสดงธุรกรรม) → ไม่ให้สิทธิ์
    return {
      ...EMPTY_SNAPSHOT,
      state: 'LIFETIME',
      periodType: 'NORMAL',
      verifiedAt: now,
      alsoRenewingMonthly: hasRenewingMonthlySubscription(info, undefined, now),
    };
  }
  if (anyEntitlement) {
    return {
      ...EMPTY_SNAPSHOT,
      state: 'EXPIRED',
      productId: anyEntitlement.productIdentifier ?? null,
      expirationDate: toMs(anyEntitlement.expirationDate),
      billingIssueAt: toMs(anyEntitlement.billingIssueDetectedAt),
      verifiedAt: now,
    };
  }
  return { ...EMPTY_SNAPSHOT, verifiedAt: now };
}

// ───────────── การตัดสินสิทธิ์รวมกับแคชออฟไลน์ (SPEC B9) ─────────────

/** ช่วงผ่อนผันหลังวันหมดอายุเมื่อออฟไลน์และยังตรวจกับ RevenueCat ไม่ได้ */
export const OFFLINE_GRACE_MS = 48 * 60 * 60 * 1000;

export interface AccessDecision {
  allowed: boolean;
  /** สถานะที่ใช้แสดงผล (เช่น ข้อความ Paywall) */
  state: EntitlementState;
  /** live = เพิ่งตรวจกับ RevenueCat, cache = ใช้แคชที่ยังไม่หมดอายุ, grace = เกินวันหมดอายุแต่ยังในช่วงผ่อนผันออฟไลน์ */
  source: 'live' | 'cache' | 'grace' | 'none';
  expirationDate: number | null;
}

export interface AccessInput {
  /** เจ้าของข้อมูลในเครื่อง (getOwner()) — สิทธิ์ผูกกับบัญชีสโตร์ผ่าน RevenueCat นิรนาม (D81) */
  userId: string | null;
  /** แคชสถานะล่าสุดของเจ้าของคนนี้ */
  cached: (EntitlementSnapshot & { userId: string }) | null;
  /** true ถ้าเพิ่งได้ข้อมูลสดจาก RevenueCat ในรอบนี้ */
  fresh: boolean;
  online: boolean;
  now: number;
  graceMs?: number;
}

export function resolveAccess(input: AccessInput): AccessDecision {
  const { userId, cached, fresh, online, now } = input;
  const graceMs = input.graceMs ?? OFFLINE_GRACE_MS;
  if (!userId || !cached || cached.userId !== userId) {
    return { allowed: false, state: 'NO_ENTITLEMENT', source: 'none', expirationDate: null };
  }
  const source: AccessDecision['source'] = fresh ? 'live' : 'cache';
  if (!hasAccess(cached.state)) {
    return { allowed: false, state: cached.state, source, expirationDate: cached.expirationDate };
  }
  if (cached.state === 'LIFETIME' || cached.expirationDate === null) {
    return { allowed: true, state: cached.state, source, expirationDate: null };
  }
  if (now <= cached.expirationDate) {
    return { allowed: true, state: cached.state, source, expirationDate: cached.expirationDate };
  }
  // เลยวันหมดอายุตามแคช: ออฟไลน์ → ผ่อนผันสั้นๆ, ออนไลน์ → ต้องรอผลตรวจใหม่ (ถือว่าหมด)
  if (!fresh && !online && now <= cached.expirationDate + graceMs) {
    return { allowed: true, state: cached.state, source: 'grace', expirationDate: cached.expirationDate };
  }
  return { allowed: false, state: 'EXPIRED', source, expirationDate: cached.expirationDate };
}
