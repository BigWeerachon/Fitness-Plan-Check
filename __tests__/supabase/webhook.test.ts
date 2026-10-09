import { describe, expect, it } from '@jest/globals';
import {
  handleWebhook,
  isAuthorized,
  targetsOf,
  type EntitlementRow,
  type RecordedEvent,
  type RcWebhookEvent,
  type WebhookStore,
} from '../../supabase/functions/revenuecat-webhook/logic';

const SECRET = 'whsec_test';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const DAY = 86_400_000;
const T0 = Date.parse('2026-10-09T09:00:00Z');

class MemoryStore implements WebhookStore {
  rows = new Map<string, EntitlementRow>();
  events = new Map<string, RecordedEvent>();
  users = new Set([A, B]);
  async eventSeen(id: string) {
    return this.events.has(id);
  }
  async getEntitlement(userId: string) {
    return this.rows.get(userId) ?? null;
  }
  async saveEntitlement(row: EntitlementRow) {
    if (!this.users.has(row.user_id)) return 'unknown_user' as const;
    this.rows.set(row.user_id, row);
    return 'saved' as const;
  }
  async recordEvent(e: RecordedEvent) {
    this.events.set(e.id, e);
  }
}

let n = 0;
function event(patch: Partial<RcWebhookEvent>): { event: RcWebhookEvent } {
  n++;
  return {
    event: {
      id: `evt_${n}`,
      type: 'INITIAL_PURCHASE',
      app_user_id: A,
      original_app_user_id: A,
      aliases: [A],
      product_id: 'fitnese_monthly',
      period_type: 'TRIAL',
      event_timestamp_ms: T0,
      expiration_at_ms: T0 + 7 * DAY,
      entitlement_ids: ['pro'],
      environment: 'SANDBOX',
      ...patch,
    },
  };
}

function send(store: MemoryStore, body: unknown, authorization: string | null = `Bearer ${SECRET}`) {
  return handleWebhook({ authorization, body }, { secret: SECRET, store, now: T0 });
}

describe('RevenueCat webhook (SPEC J6)', () => {
  it('rejects missing configuration, wrong secrets and malformed bodies', async () => {
    const store = new MemoryStore();
    expect(
      (await handleWebhook({ authorization: 'x', body: {} }, { secret: '', store, now: T0 })).status,
    ).toBe(500);
    expect((await send(store, event({}), 'Bearer nope')).status).toBe(401);
    expect((await send(store, event({}), null)).status).toBe(401);
    expect((await send(store, { nope: true })).status).toBe(400);
    expect(store.rows.size).toBe(0);
    expect(isAuthorized(SECRET, SECRET)).toBe(true);
    expect(isAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
  });

  it('tracks trial → paid → cancel (still active) → expiration, idempotently', async () => {
    const store = new MemoryStore();
    const start = event({});
    expect((await send(store, start)).status).toBe(200);
    expect(store.rows.get(A)).toMatchObject({
      state: 'TRIALING',
      product_id: 'fitnese_monthly',
      will_renew: true,
      expiration_at: new Date(T0 + 7 * DAY).toISOString(),
      last_event_id: start.event.id,
    });
    // ส่งซ้ำ → ไม่เปลี่ยน
    expect((await send(store, start)).body).toEqual({ duplicate: true });

    await send(
      store,
      event({
        type: 'RENEWAL',
        period_type: 'NORMAL',
        event_timestamp_ms: T0 + 7 * DAY,
        expiration_at_ms: T0 + 37 * DAY,
      }),
    );
    expect(store.rows.get(A)).toMatchObject({ state: 'SUBSCRIBED_MONTHLY', will_renew: true });

    await send(
      store,
      event({
        type: 'CANCELLATION',
        cancel_reason: 'UNSUBSCRIBE',
        period_type: 'NORMAL',
        event_timestamp_ms: T0 + 10 * DAY,
        expiration_at_ms: T0 + 37 * DAY,
      }),
    );
    // ยกเลิกแล้วยังใช้ได้จนสิ้นรอบบิล (J5)
    expect(store.rows.get(A)).toMatchObject({ state: 'SUBSCRIBED_MONTHLY', will_renew: false });

    await send(
      store,
      event({ type: 'EXPIRATION', event_timestamp_ms: T0 + 37 * DAY, expiration_at_ms: T0 + 37 * DAY }),
    );
    expect(store.rows.get(A)?.state).toBe('EXPIRED');
    expect(store.events.size).toBe(4);
  });

  it('ignores events older than the last processed one', async () => {
    const store = new MemoryStore();
    await send(
      store,
      event({
        type: 'RENEWAL',
        period_type: 'NORMAL',
        event_timestamp_ms: T0 + 5 * DAY,
        expiration_at_ms: T0 + 35 * DAY,
      }),
    );
    const late = await send(store, event({ type: 'EXPIRATION', event_timestamp_ms: T0 + DAY }));
    expect(late.body).toEqual({ results: { [A]: 'stale' } });
    expect(store.rows.get(A)?.state).toBe('SUBSCRIBED_MONTHLY');
  });

  it('handles billing grace, refunds and lifetime precedence', async () => {
    const store = new MemoryStore();
    await send(store, event({ type: 'RENEWAL', period_type: 'NORMAL', expiration_at_ms: T0 + 30 * DAY }));
    await send(
      store,
      event({
        type: 'BILLING_ISSUE',
        event_timestamp_ms: T0 + 30 * DAY,
        grace_period_expiration_at_ms: T0 + 46 * DAY,
      }),
    );
    expect(store.rows.get(A)).toMatchObject({
      state: 'BILLING_GRACE',
      expiration_at: new Date(T0 + 46 * DAY).toISOString(),
    });

    await send(
      store,
      event({
        type: 'NON_RENEWING_PURCHASE',
        product_id: 'fitnese_lifetime',
        period_type: 'NORMAL',
        event_timestamp_ms: T0 + 31 * DAY,
        expiration_at_ms: null,
      }),
    );
    expect(store.rows.get(A)).toMatchObject({ state: 'LIFETIME', expiration_at: null });
    // รายเดือนหมดอายุภายหลัง → ซื้อขาดไม่ถูกลดสถานะ
    await send(store, event({ type: 'EXPIRATION', event_timestamp_ms: T0 + 46 * DAY }));
    expect(store.rows.get(A)?.state).toBe('LIFETIME');

    // คืนเงินรายเดือนของอีกบัญชี → หมดสิทธิ์ทันที
    await send(
      store,
      event({ app_user_id: B, original_app_user_id: B, aliases: [B], period_type: 'NORMAL' }),
    );
    await send(
      store,
      event({
        app_user_id: B,
        original_app_user_id: B,
        aliases: [B],
        type: 'CANCELLATION',
        cancel_reason: 'CUSTOMER_SUPPORT',
        event_timestamp_ms: T0 + DAY,
      }),
    );
    expect(store.rows.get(B)?.state).toBe('EXPIRED');
  });

  it('only updates Supabase accounts and the "pro" entitlement; transfers revoke the old owner', async () => {
    const store = new MemoryStore();
    const anon = await send(
      store,
      event({ app_user_id: '$RCAnonymousID:abc', original_app_user_id: '$RCAnonymousID:abc', aliases: [] }),
    );
    expect(anon.body).toEqual({ results: {} });
    const other = await send(store, event({ entitlement_ids: ['something_else'] }));
    expect(other.body).toEqual({ ignored: true });
    const test = await send(store, event({ type: 'TEST' }));
    expect(test.body).toEqual({ ignored: true });
    expect(store.rows.size).toBe(0);

    await send(store, event({ period_type: 'NORMAL' }));
    const transfer = event({
      type: 'TRANSFER',
      app_user_id: null,
      original_app_user_id: null,
      aliases: null,
      entitlement_ids: null,
      transferred_from: [A],
      transferred_to: [B],
      event_timestamp_ms: T0 + DAY,
    });
    expect(targetsOf(transfer.event)).toEqual([
      { userId: A, direction: 'from' },
      { userId: B, direction: 'to' },
    ]);
    await send(store, transfer);
    expect(store.rows.get(A)?.state).toBe('EXPIRED');
  });

  it('acknowledges events for deleted accounts so RevenueCat stops retrying', async () => {
    const store = new MemoryStore();
    store.users.delete(A);
    const r = await send(store, event({}));
    expect(r).toEqual({ status: 200, body: { results: { [A]: 'unknown_user' } } });
  });
});
