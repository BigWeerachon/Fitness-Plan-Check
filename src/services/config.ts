import { Platform } from 'react-native';

/**
 * ค่าตั้งค่าจาก .env (EXPO_PUBLIC_* ถูกฝังตอน build ต้องอ้างอิงแบบตรงตัวเท่านั้น)
 * ไม่มีคีย์ RevenueCat → ใช้ร้านค้าจำลอง (dev/test) ดู docs/HUMAN_TASKS.md
 * แอปออฟไลน์ล้วน (D81): ไม่มีคีย์ของ backend/ล็อกอินอีกแล้ว
 */
export const env = {
  useMocksFlag: process.env.EXPO_PUBLIC_USE_MOCKS === '1',
  mockScenario: process.env.EXPO_PUBLIC_MOCK_SCENARIO ?? 'new',
  rcIosKey: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  rcAndroidKey: process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
};

export function missingKeys(): string[] {
  const missing: string[] = [];
  if (!env.rcIosKey && !env.rcAndroidKey) missing.push('EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY');
  return missing;
}

export interface MockDecisionInput {
  flag: boolean;
  dev: boolean;
  web: boolean;
  missing: number;
}

/**
 * ใช้ mock เฉพาะ dev build หรือพรีวิวเว็บ (สั่งด้วย flag หรือยังไม่มีคีย์)
 * release build บนมือถือไม่ใช้ mock เด็ดขาดแม้ตั้ง EXPO_PUBLIC_USE_MOCKS=1 ผิด — ไม่งั้นใครก็ "ซื้อ" ฟรีได้ (B2)
 */
export function decideMocks({ flag, dev, web, missing }: MockDecisionInput): boolean {
  if (!dev && !web) return false;
  return flag || missing > 0;
}

export function shouldUseMocks(): boolean {
  return decideMocks({
    flag: env.useMocksFlag,
    dev: typeof __DEV__ !== 'undefined' && __DEV__,
    web: Platform.OS === 'web',
    missing: missingKeys().length,
  });
}
