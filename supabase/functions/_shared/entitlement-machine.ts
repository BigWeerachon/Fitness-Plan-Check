/**
 * State machine ของสิทธิ์การใช้งาน (SPEC B8) — โมดูลเดียวที่ทุกหน้าใช้ตัดสินสิทธิ์
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน ไม่ import อะไรจากแอป เพื่อให้ Edge Function (Deno) ใช้สำเนาเดียวกันได้
 * สำเนาอยู่ที่ supabase/functions/_shared/entitlement-machine.ts และมีเทสต์ตรวจว่าเหมือนกันทุกตัวอักษร
 * ห้ามแก้สำเนาโดยตรง ให้แก้ไฟล์นี้แล้วรัน `node scripts/sync-shared.js`
 *
 * ไม่มีตัวนับเวลาทดลองในแอป (SPEC B2): สถานะทั้งหมดมาจาก RevenueCat (customerInfo / webhook event)
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
}

export const EMPTY_SNAPSHOT: EntitlementSnapshot = {
  state: 'NO_ENTITLEMENT',
  productId: null,
  periodType: null,
  expirationDate: null,
  willRenew: false,
  billingIssueAt: null,
  verifiedAt: 0,
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
 * แปลง CustomerInfo → สถานะ
 * - active + ไม่มีวันหมดอายุ หรือเป็นสินค้าซื้อขาด → LIFETIME (ถ้ามีทั้งรายเดือนและซื้อขาด ซื้อขาดชนะ SPEC J5)
 * - active + มี billing issue → BILLING_GRACE (สโตร์ยังให้สิทธิ์ระหว่าง grace period)
 * - active + periodType TRIAL → TRIALING
 * - active อื่นๆ → SUBSCRIBED_MONTHLY
 * - ไม่ active แต่เคยมี → EXPIRED, ไม่เคยมีเลย → NO_ENTITLEMENT
 * ถ้า expirationDate ผ่านไปแล้วตามนาฬิกา now ถือว่าไม่ active (กันข้อมูลแคชเก่า)
 */
export function deriveSnapshot(info: CustomerInfoLike, now: number): EntitlementSnapshot {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  const everHad =
    !!info.entitlements.all[ENTITLEMENT_ID] ||
    (info.nonSubscriptionTransactions ?? []).some((t) => isLifetimeProduct(t.productIdentifier));
  const ownsLifetime = (info.nonSubscriptionTransactions ?? []).some((t) =>
    isLifetimeProduct(t.productIdentifier),
  );

  if (ent && ent.isActive) {
    const expirationDate = toMs(ent.expirationDate);
    const base = {
      productId: ent.productIdentifier,
      periodType: normalizePeriod(ent.periodType),
      expirationDate,
      willRenew: ent.willRenew,
      billingIssueAt: toMs(ent.billingIssueDetectedAt),
      verifiedAt: now,
    };
    if (expirationDate === null || isLifetimeProduct(ent.productIdentifier) || ownsLifetime) {
      return { ...base, state: 'LIFETIME', expirationDate: null, willRenew: false, periodType: 'NORMAL' };
    }
    if (expirationDate > now) {
      if (base.billingIssueAt !== null) return { ...base, state: 'BILLING_GRACE' };
      if (base.periodType === 'TRIAL') return { ...base, state: 'TRIALING' };
      return { ...base, state: 'SUBSCRIBED_MONTHLY' };
    }
  }
  if (ownsLifetime) {
    // ซื้อขาดไว้แต่ entitlement ยังไม่อัปเดต (เช่น แคชเก่า) ให้สิทธิ์ตามธุรกรรมจริง
    return { ...EMPTY_SNAPSHOT, state: 'LIFETIME', periodType: 'NORMAL', verifiedAt: now };
  }
  const last = info.entitlements.all[ENTITLEMENT_ID];
  if (everHad) {
    return {
      ...EMPTY_SNAPSHOT,
      state: 'EXPIRED',
      productId: last?.productIdentifier ?? null,
      expirationDate: toMs(last?.expirationDate),
      billingIssueAt: toMs(last?.billingIssueDetectedAt),
      verifiedAt: now,
    };
  }
  return { ...EMPTY_SNAPSHOT, verifiedAt: now };
}

// ───────────── เหตุการณ์จาก RevenueCat webhook (ใช้ฝั่ง Edge Function และเทสต์ตารางเปลี่ยนสถานะ) ─────────────

export type RcEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'TRANSFER'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TEMPORARY_ENTITLEMENT_GRANT'
  | 'REFUND_REVERSED'
  | 'TEST';

export type CancelReason =
  'UNSUBSCRIBE' | 'BILLING_ERROR' | 'DEVELOPER_INITIATED' | 'PRICE_INCREASE' | 'CUSTOMER_SUPPORT' | 'UNKNOWN';

export interface EntitlementEvent {
  type: RcEventType;
  eventAt: number;
  productId?: string | null;
  periodType?: string | null;
  expirationAt?: number | null;
  cancelReason?: CancelReason | null;
  gracePeriodExpirationAt?: number | null;
  /** สำหรับ TRANSFER: บัญชีนี้เป็นฝ่ายที่ได้สิทธิ์ ('to') หรือเสียสิทธิ์ ('from') */
  transferDirection?: 'to' | 'from';
}

function subscriptionStateFor(periodType: PeriodType): EntitlementState {
  return periodType === 'TRIAL' ? 'TRIALING' : 'SUBSCRIBED_MONTHLY';
}

/**
 * ตารางเปลี่ยนสถานะ (ดู docs/ARCHITECTURE.md §4) — คืน snapshot ใหม่เสมอ ไม่แก้ของเดิม
 * กติกาหลัก:
 * - LIFETIME ไม่ถูกลดสถานะจากเหตุการณ์ของรายเดือน (ยกเว้นคืนเงินสินค้าซื้อขาดเอง)
 * - CANCELLATION แบบผู้ใช้ยกเลิก = ยังใช้ได้จนหมดรอบ (willRenew=false) SPEC J5
 * - CANCELLATION เพราะคืนเงิน (CUSTOMER_SUPPORT) = สิทธิ์หมดทันที
 * - BILLING_ISSUE ที่ยังมี grace → BILLING_GRACE, หมด grace → EXPIRATION จะตามมา
 */
export function applyEvent(prev: EntitlementSnapshot, ev: EntitlementEvent): EntitlementSnapshot {
  const period = normalizePeriod(ev.periodType);
  const lifetimeEvent = isLifetimeProduct(ev.productId);
  const next = (patch: Partial<EntitlementSnapshot>): EntitlementSnapshot => ({
    ...prev,
    ...patch,
    verifiedAt: Math.max(prev.verifiedAt, ev.eventAt),
  });

  switch (ev.type) {
    case 'TEST':
      return prev;

    case 'NON_RENEWING_PURCHASE':
      if (!lifetimeEvent) return prev;
      return next({
        state: 'LIFETIME',
        productId: ev.productId ?? null,
        periodType: 'NORMAL',
        expirationDate: null,
        willRenew: false,
        billingIssueAt: null,
      });

    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'SUBSCRIPTION_EXTENDED':
    case 'TEMPORARY_ENTITLEMENT_GRANT':
    case 'REFUND_REVERSED': {
      if (prev.state === 'LIFETIME') return next({});
      if (lifetimeEvent) {
        return next({
          state: 'LIFETIME',
          productId: ev.productId ?? null,
          expirationDate: null,
          willRenew: false,
        });
      }
      const state =
        ev.type === 'UNCANCELLATION' && hasAccess(prev.state) ? prev.state : subscriptionStateFor(period);
      return next({
        state,
        productId: ev.productId ?? prev.productId,
        periodType: ev.type === 'UNCANCELLATION' ? prev.periodType : period,
        expirationDate: ev.expirationAt ?? prev.expirationDate,
        willRenew: true,
        billingIssueAt: ev.type === 'UNCANCELLATION' ? prev.billingIssueAt : null,
      });
    }

    case 'CANCELLATION': {
      if (ev.cancelReason === 'CUSTOMER_SUPPORT') {
        // คืนเงิน: ถ้าคืนเงินสินค้าซื้อขาด หรือสถานะไม่ใช่ซื้อขาด → หมดสิทธิ์ทันที
        if (prev.state === 'LIFETIME' && !lifetimeEvent) return next({});
        return next({ state: 'EXPIRED', willRenew: false, expirationDate: ev.eventAt });
      }
      if (prev.state === 'LIFETIME') return next({});
      // ยกเลิกต่ออายุ: ยังใช้ได้จนถึงวันหมดอายุเดิม
      return next({ willRenew: false, expirationDate: ev.expirationAt ?? prev.expirationDate });
    }

    case 'BILLING_ISSUE': {
      if (prev.state === 'LIFETIME') return next({});
      const graceEnd = ev.gracePeriodExpirationAt ?? null;
      if (graceEnd !== null && graceEnd > ev.eventAt) {
        return next({ state: 'BILLING_GRACE', billingIssueAt: ev.eventAt, expirationDate: graceEnd });
      }
      return next({ billingIssueAt: ev.eventAt });
    }

    case 'EXPIRATION':
      if (prev.state === 'LIFETIME') return next({});
      return next({ state: 'EXPIRED', willRenew: false, expirationDate: ev.expirationAt ?? ev.eventAt });

    case 'SUBSCRIPTION_PAUSED':
      // Google Play: หยุดชั่วคราวมีผลเมื่อสิ้นรอบ → ระหว่างนี้ยังใช้ได้ แล้ว EXPIRATION จะตามมา
      if (prev.state === 'LIFETIME') return next({});
      return next({ willRenew: false });

    case 'PRODUCT_CHANGE':
      // เปลี่ยนแพ็กเกจ: ข้อมูลจริงมากับ RENEWAL/INITIAL_PURCHASE ถัดไป
      return next({});

    case 'TRANSFER':
      if (ev.transferDirection === 'from') {
        return next({
          ...EMPTY_SNAPSHOT,
          state: 'EXPIRED',
          verifiedAt: Math.max(prev.verifiedAt, ev.eventAt),
        });
      }
      return next({});

    default:
      return prev;
  }
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
  /** ผู้ใช้ที่ล็อกอินอยู่ (สิทธิ์ผูกกับบัญชี SPEC J3) */
  userId: string | null;
  /** แคชสถานะล่าสุดของผู้ใช้คนนี้ */
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
