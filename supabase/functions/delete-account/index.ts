// Supabase Edge Function (Deno): ลบบัญชีและข้อมูลทั้งหมดของผู้ใช้ที่ล็อกอินอยู่ (เรียกจากแอปด้วย JWT ของผู้ใช้)
// secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8), APPLE_CLIENT_ID (Bundle ID), REVENUECAT_SECRET_API_KEY (ไม่บังคับ)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { appleClientSecret, handleDeleteAccount, revokeAppleToken, type DeleteDeps } from './logic.ts';

const env = (k: string) => Deno.env.get(k) ?? '';
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const appleConfigured = !!(
  env('APPLE_TEAM_ID') &&
  env('APPLE_KEY_ID') &&
  env('APPLE_PRIVATE_KEY') &&
  env('APPLE_CLIENT_ID')
);
const rcKey = env('REVENUECAT_SECRET_API_KEY');

const deps: DeleteDeps = {
  async getUser(token) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, provider: (data.user.app_metadata?.provider as string | undefined) ?? null };
  },
  revokeApple: appleConfigured
    ? async (code) => {
        const clientSecret = await appleClientSecret({
          teamId: env('APPLE_TEAM_ID'),
          keyId: env('APPLE_KEY_ID'),
          clientId: env('APPLE_CLIENT_ID'),
          privateKeyPem: env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
          nowSec: Math.floor(Date.now() / 1000),
          subtle: crypto.subtle,
        });
        await revokeAppleToken({ code, clientId: env('APPLE_CLIENT_ID'), clientSecret, fetch });
      }
    : undefined,
  deleteRevenueCatCustomer: rcKey
    ? async (userId) => {
        const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${rcKey}` },
        });
        if (!res.ok && res.status !== 404) throw new Error(`revenuecat delete failed (${res.status})`);
      }
    : undefined,
  async deleteUser(userId) {
    // ลบผู้ใช้ → ทุกตาราง (user_id references auth.users on delete cascade) ถูกลบตาม
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  },
  log: (message, error) => console.error(message, error),
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const result = await handleDeleteAccount({ authorization: req.headers.get('authorization'), body }, deps);
  return Response.json(result.body, { status: result.status });
});
