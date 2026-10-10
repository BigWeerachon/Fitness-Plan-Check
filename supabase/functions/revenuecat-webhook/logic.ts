/**
 * RevenueCat webhook → สถานะสิทธิ์บนเซิร์ฟเวอร์ (SPEC J6, B8) — ส่วนตรรกะล้วน ทดสอบด้วย Jest ได้
 * ไฟล์ index.ts (Deno) แค่ต่อกับฐานข้อมูลจริง
 * - ตรวจ Authorization header ตามค่าที่ตั้งใน RevenueCat dashboard
 * - กันเหตุการณ์ซ้ำด้วย event.id (RevenueCat ส่งซ้ำได้)
 * - ใช้ state machine ตัวเดียวกับแอป (สำเนาใน _shared) และข้ามเหตุการณ์ที่เก่ากว่าที่ประมวลผลไปแล้ว
 * - สนใจเฉพาะ app_user_id ที่เป็น id ผู้ใช้ Supabase (UUID) — ผู้ใช้นิรนามของ RevenueCat ไม่มีข้อมูลบนคลาวด์
 */
import {
  EMPTY_SNAPSHOT,
  ENTITLEMENT_ID,
  ENTITLEMENT_STATES,
  applyEvent,
  type CancelReason,
  type EntitlementEvent,
  type EntitlementSnapshot,
  type EntitlementState,
  type PeriodType,
  type RcEventType,
} from '../_shared/entitlement-machine.ts';

export interface RcWebhookEvent {
  id: string;
  type: string;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  aliases?: string[] | null;
  transferred_from?: string[] | null;
  transferred_to?: string[] | null;
  product_id?: string | null;
  period_type?: string | null;
  event_timestamp_ms?: number | null;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  cancel_reason?: string | null;
  entitlement_ids?: string[] | null;
  environment?: string | null;
}

export interface EntitlementRow {
  user_id: string;
  state: EntitlementState;
  product_id: string | null;
  period_type: string | null;
  expiration_at: string | null;
  will_renew: boolean;
  billing_issue_at: string | null;
  last_event_id: string | null;
  last_event_at: string | null;
  updated_at: string;
}

export interface RecordedEvent {
  id: string;
  type: string;
  app_user_id: string | null;
  event_at: string | null;
}

export interface WebhookStore {
  eventSeen(id: string): Promise<boolean>;
  getEntitlement(userId: string): Promise<EntitlementRow | null>;
  /** 'unknown_user' = ไม่มีบัญชีนี้ใน auth.users แล้ว (เช่น ลบบัญชีไปแล้ว) */
  saveEntitlement(row: EntitlementRow): Promise<'saved' | 'unknown_user'>;
  recordEvent(event: RecordedEvent): Promise<void>;
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

const EVENT_TYPES: readonly RcEventType[] = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_PAUSED',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'TRANSFER',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'REFUND_REVERSED',
  'TEST',
];

const CANCEL_REASONS: readonly CancelReason[] = [
  'UNSUBSCRIBE',
  'BILLING_ERROR',
  'DEVELOPER_INITIATED',
  'PRICE_INCREASE',
  'CUSTOMER_SUPPORT',
  'UNKNOWN',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** เทียบแบบเวลาคงที่ กันการเดาค่าลับทีละตัวอักษรจากเวลาตอบกลับ */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** RevenueCat ส่งค่า Authorization ตามที่ตั้งไว้ตรงๆ — รับได้ทั้ง "Bearer <secret>" และ "<secret>" */
export function isAuthorized(header: string | null, secret: string): boolean {
  if (!secret || !header) return false;
  const value = header.startsWith('Bearer ') ? header.slice(7) : header;
  return safeEqual(value, secret);
}

export function isSupabaseUserId(id: string | null | undefined): id is string {
  return typeof id === 'string' && UUID.test(id);
}

export function parseEvent(body: unknown): RcWebhookEvent | null {
  if (!body || typeof body !== 'object') return null;
  const ev = (body as { event?: unknown }).event;
  if (!ev || typeof ev !== 'object') return null;
  const e = ev as Partial<RcWebhookEvent>;
  if (typeof e.id !== 'string' || !e.id || typeof e.type !== 'string') return null;
  return e as RcWebhookEvent;
}

/** เหตุการณ์ที่เกี่ยวกับสิทธิ์ "pro" (TRANSFER ไม่มี entitlement_ids แต่ย้ายสิทธิ์ทั้งหมด) */
export function isRelevant(ev: RcWebhookEvent): boolean {
  if (!(EVENT_TYPES as readonly string[]).includes(ev.type) || ev.type === 'TEST') return false;
  if (ev.type === 'TRANSFER') return true;
  return !ev.entitlement_ids || ev.entitlement_ids.includes(ENTITLEMENT_ID);
}

export interface Target {
  userId: string;
  direction?: 'to' | 'from';
}

/** บัญชีที่ต้องอัปเดตจากเหตุการณ์นี้ */
export function targetsOf(ev: RcWebhookEvent): Target[] {
  if (ev.type === 'TRANSFER') {
    const from = (ev.transferred_from ?? [])
      .filter(isSupabaseUserId)
      .map((userId) => ({ userId, direction: 'from' as const }));
    const to = (ev.transferred_to ?? [])
      .filter(isSupabaseUserId)
      .map((userId) => ({ userId, direction: 'to' as const }));
    return [...from, ...to];
  }
  const ids = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])].filter(isSupabaseUserId);
  return [...new Set(ids)].map((userId) => ({ userId }));
}

export function toEntitlementEvent(ev: RcWebhookEvent, direction?: 'to' | 'from'): EntitlementEvent {
  const reason = (CANCEL_REASONS as readonly string[]).includes(ev.cancel_reason ?? '')
    ? (ev.cancel_reason as CancelReason)
    : ev.cancel_reason
      ? 'UNKNOWN'
      : null;
  return {
    type: ev.type as RcEventType,
    eventAt: ev.event_timestamp_ms ?? 0,
    productId: ev.product_id ?? null,
    periodType: ev.period_type ?? null,
    expirationAt: ev.expiration_at_ms ?? null,
    cancelReason: reason,
    gracePeriodExpirationAt: ev.grace_period_expiration_at_ms ?? null,
    transferDirection: direction,
  };
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const ms = (value: string | null) => (value === null ? null : Date.parse(value));

export function snapshotFromRow(row: EntitlementRow | null): EntitlementSnapshot {
  if (!row) return EMPTY_SNAPSHOT;
  return {
    state: (ENTITLEMENT_STATES as readonly string[]).includes(row.state) ? row.state : 'NO_ENTITLEMENT',
    productId: row.product_id,
    periodType: (row.period_type as PeriodType | null) ?? null,
    expirationDate: ms(row.expiration_at),
    willRenew: row.will_renew,
    billingIssueAt: ms(row.billing_issue_at),
    verifiedAt: ms(row.last_event_at) ?? 0,
  };
}

export function rowFromSnapshot(
  userId: string,
  s: EntitlementSnapshot,
  ev: RcWebhookEvent,
  now: number,
): EntitlementRow {
  return {
    user_id: userId,
    state: s.state,
    product_id: s.productId,
    period_type: s.periodType,
    expiration_at: iso(s.expirationDate),
    will_renew: s.willRenew,
    billing_issue_at: iso(s.billingIssueAt),
    last_event_id: ev.id,
    last_event_at: iso(s.verifiedAt || null),
    updated_at: new Date(now).toISOString(),
  };
}

export async function handleWebhook(
  req: { authorization: string | null; body: unknown },
  deps: { secret: string; store: WebhookStore; now: number },
): Promise<WebhookResult> {
  if (!deps.secret) return { status: 500, body: { error: 'webhook secret is not configured' } };
  if (!isAuthorized(req.authorization, deps.secret)) return { status: 401, body: { error: 'unauthorized' } };
  const ev = parseEvent(req.body);
  if (!ev) return { status: 400, body: { error: 'invalid event' } };
  if (await deps.store.eventSeen(ev.id)) return { status: 200, body: { duplicate: true } };

  const record = () =>
    deps.store.recordEvent({
      id: ev.id,
      type: ev.type,
      app_user_id: ev.app_user_id ?? null,
      event_at: ev.event_timestamp_ms ? new Date(ev.event_timestamp_ms).toISOString() : null,
    });

  if (!isRelevant(ev)) {
    await record();
    return { status: 200, body: { ignored: true } };
  }

  const results: Record<string, string> = {};
  for (const target of targetsOf(ev)) {
    const row = await deps.store.getEntitlement(target.userId);
    const prev = snapshotFromRow(row);
    const event = toEntitlementEvent(ev, target.direction);
    // เหตุการณ์ที่มาช้ากว่าเหตุการณ์ที่ประมวลผลไปแล้ว → ไม่ย้อนสถานะ
    if (row && event.eventAt < prev.verifiedAt) {
      results[target.userId] = 'stale';
      continue;
    }
    const next = applyEvent(prev, event);
    results[target.userId] = await deps.store.saveEntitlement(
      rowFromSnapshot(target.userId, next, ev, deps.now),
    );
  }
  await record();
  return { status: 200, body: { results } };
}
