/**
 * ลบบัญชีและข้อมูล (SPEC B12, N1 Guideline 5.1.1(v)) — ส่วนตรรกะล้วน ทดสอบด้วย Jest ได้
 * ลำดับ: ยืนยันตัวตนจาก JWT → (Apple) เพิกถอนโทเค็นกับ Apple → ลบลูกค้าใน RevenueCat (ถ้าตั้งค่า)
 *        → ลบผู้ใช้ใน auth.users ซึ่งลบข้อมูลทุกตารางตามด้วย on delete cascade
 * การลบไม่ยกเลิกการสมัครในสโตร์ แอปจึงเตือนผู้ใช้และมีลิงก์ไปหน้าจัดการสมาชิกก่อนกดลบ
 */

export interface AuthUserInfo {
  id: string;
  provider: string | null;
}

export interface DeleteDeps {
  getUser(accessToken: string): Promise<AuthUserInfo | null>;
  /** แลก authorization code เป็น refresh token แล้วเพิกถอน (ต้องทำตามข้อกำหนด Sign in with Apple) */
  revokeApple?(authorizationCode: string): Promise<void>;
  deleteRevenueCatCustomer?(userId: string): Promise<void>;
  /** บันทึกเหตุการณ์ webhook ของผู้ใช้ (ไม่มี FK กับ auth.users จึงต้องลบเอง) */
  deleteWebhookEvents(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  log?(message: string, error?: unknown): void;
}

export interface DeleteResult {
  status: number;
  body: Record<string, unknown>;
}

export function bearerToken(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function handleDeleteAccount(
  req: { authorization: string | null; body: unknown },
  deps: DeleteDeps,
): Promise<DeleteResult> {
  const token = bearerToken(req.authorization);
  if (!token) return { status: 401, body: { error: 'unauthorized' } };
  const user = await deps.getUser(token);
  if (!user) return { status: 401, body: { error: 'unauthorized' } };

  const code =
    req.body && typeof req.body === 'object'
      ? (req.body as { appleAuthorizationCode?: unknown }).appleAuthorizationCode
      : null;

  // เพิกถอนโทเค็น Apple: ถ้าล้มเหลวยังลบข้อมูลต่อ (สิทธิ์ของผู้ใช้ในการลบข้อมูลสำคัญกว่า) และรายงานผลกลับ
  let appleRevoked = false;
  if (user.provider === 'apple' && typeof code === 'string' && code && deps.revokeApple) {
    try {
      await deps.revokeApple(code);
      appleRevoked = true;
    } catch (e) {
      deps.log?.('apple revoke failed', e);
    }
  }

  let revenueCatDeleted = false;
  if (deps.deleteRevenueCatCustomer) {
    try {
      await deps.deleteRevenueCatCustomer(user.id);
      revenueCatDeleted = true;
    } catch (e) {
      deps.log?.('revenuecat delete failed', e);
    }
  }

  try {
    await deps.deleteWebhookEvents(user.id);
    await deps.deleteUser(user.id);
  } catch (e) {
    deps.log?.('delete user failed', e);
    return { status: 500, body: { error: 'delete failed' } };
  }
  return { status: 200, body: { deleted: true, appleRevoked, revenueCatDeleted } };
}

// ───────────── Sign in with Apple: client secret (JWT ES256) + revoke ─────────────

function base64url(bytes: Uint8Array | string): string {
  const bin = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8(text: string): string {
  return String.fromCharCode(...new TextEncoder().encode(text));
}

export function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface AppleSecretInput {
  teamId: string;
  keyId: string;
  /** Bundle ID (iOS เข้าสู่ระบบแบบเนทีฟ) */
  clientId: string;
  /** เนื้อหาไฟล์ .p8 จาก Apple Developer */
  privateKeyPem: string;
  nowSec: number;
  subtle: SubtleCrypto;
}

/** client_secret ของ Apple = JWT ES256 อายุสั้น (5 นาที) เซ็นด้วยคีย์ Sign in with Apple */
export async function appleClientSecret(i: AppleSecretInput): Promise<string> {
  const header = base64url(utf8(JSON.stringify({ alg: 'ES256', kid: i.keyId, typ: 'JWT' })));
  const payload = base64url(
    utf8(
      JSON.stringify({
        iss: i.teamId,
        iat: i.nowSec,
        exp: i.nowSec + 300,
        aud: 'https://appleid.apple.com',
        sub: i.clientId,
      }),
    ),
  );
  const key = await i.subtle.importKey(
    'pkcs8',
    pemToPkcs8(i.privateKeyPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signingInput = `${header}.${payload}`;
  // WebCrypto คืนลายเซ็นแบบ r||s (64 ไบต์) ซึ่งเป็นรูปแบบที่ JWS ES256 ต้องการพอดี
  const sig = await i.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(new Uint8Array(sig))}`;
}

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** แลก authorization code → refresh token แล้วเพิกถอน (https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens) */
export async function revokeAppleToken(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  fetch: FetchLike;
}): Promise<void> {
  const form = (params: Record<string, string>) => new URLSearchParams(params).toString();
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const tokenRes = await input.fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers,
    body: form({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error(`apple token exchange failed (${tokenRes.status})`);
  const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) throw new Error('apple returned no token to revoke');
  const revokeRes = await input.fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers,
    body: form({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }),
  });
  if (!revokeRes.ok) throw new Error(`apple revoke failed (${revokeRes.status})`);
}
