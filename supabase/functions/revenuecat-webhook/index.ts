// Supabase Edge Function (Deno): POST จาก RevenueCat webhook → อัปเดต public.user_entitlements
// ตั้งค่า secret: supabase secrets set REVENUECAT_WEBHOOK_SECRET=<ค่าเดียวกับ Authorization ใน RevenueCat>
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleWebhook, type EntitlementRow, type WebhookStore } from './logic.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const store: WebhookStore = {
  async eventSeen(id) {
    const { data, error } = await supabase.from('revenuecat_events').select('id').eq('id', id).maybeSingle();
    if (error) throw error;
    return !!data;
  },
  async getEntitlement(userId) {
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as EntitlementRow | null) ?? null;
  },
  async saveEntitlement(row) {
    const { error } = await supabase.from('user_entitlements').upsert(row, { onConflict: 'user_id' });
    // 23503 = foreign key: ไม่มีผู้ใช้นี้แล้ว (ลบบัญชีไปแล้ว) → ไม่ต้องให้ RevenueCat ส่งซ้ำ
    if (error?.code === '23503') return 'unknown_user';
    if (error) throw error;
    return 'saved';
  },
  async recordEvent(event) {
    const { error } = await supabase.from('revenuecat_events').insert(event);
    // 23505 = ส่งซ้ำพร้อมกันสองครั้ง → ถือว่าบันทึกแล้ว
    if (error && error.code !== '23505') throw error;
  },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }
  try {
    const result = await handleWebhook(
      { authorization: req.headers.get('authorization'), body },
      { secret: Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '', store, now: Date.now() },
    );
    return Response.json(result.body, { status: result.status });
  } catch (e) {
    console.error('revenuecat-webhook failed', e);
    // 500 → RevenueCat จะส่งซ้ำภายหลัง
    return Response.json({ error: 'internal error' }, { status: 500 });
  }
});
