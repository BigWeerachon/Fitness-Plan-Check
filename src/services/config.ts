/**
 * ค่าตั้งค่าจาก .env (EXPO_PUBLIC_* ถูกฝังตอน build ต้องอ้างอิงแบบตรงตัวเท่านั้น)
 * ไม่มีคีย์จริง → ใช้ mock adapter (dev/test) ดู docs/HUMAN_TASKS.md
 */
export const env = {
  useMocksFlag: process.env.EXPO_PUBLIC_USE_MOCKS === '1',
  mockScenario: process.env.EXPO_PUBLIC_MOCK_SCENARIO ?? 'new',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  rcIosKey: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  rcAndroidKey: process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
};

export function missingKeys(): string[] {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!env.rcIosKey && !env.rcAndroidKey) missing.push('EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY');
  if (!env.googleWebClientId) missing.push('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  return missing;
}

/** ใช้ mock เมื่อสั่งชัดเจน หรือเป็น dev build ที่ยังไม่มีคีย์ (release build ที่ไม่มีคีย์จะไม่แอบใช้ mock) */
export function shouldUseMocks(): boolean {
  if (env.useMocksFlag) return true;
  return typeof __DEV__ !== 'undefined' && __DEV__ && missingKeys().length > 0;
}
