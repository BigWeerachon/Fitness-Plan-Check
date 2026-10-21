import type { ConfigContext, ExpoConfig } from 'expo/config';

// ค่าที่ต้องเปลี่ยนก่อน build จริง อ่านจาก .env (ดู docs/HUMAN_TASKS.md)
const BASE_BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.example.fitnese';
// slug ต้องตรงกับโปรเจกต์บน expo.dev ถ้าเจ้าของตั้งชื่อต่างจาก 'fitnese' ให้ตั้ง APP_SLUG (ไม่กระทบ build ที่ส่งสโตร์นอกจากชื่อโปรเจกต์)
const SLUG = process.env.APP_SLUG || 'fitnese';
// บิลด์ทดลอง APK (D85, โปรไฟล์ EAS `tryout`): ชื่อ/รหัสแอปแยก เพื่อไม่ให้ถูกส่งสโตร์หรือทับแอปจริง และติดตั้งคู่กันได้
const TRYOUT = process.env.EXPO_PUBLIC_TRYOUT_BUILD === '1';
const BUNDLE_ID = TRYOUT ? `${BASE_BUNDLE_ID}.tryout` : BASE_BUNDLE_ID;
const APP_NAME = TRYOUT ? 'Fitnese (Test)' : 'Fitnese';
// รหัสโปรเจกต์ EAS: ได้จาก `eas init` — ตั้งเป็นตัวแปร EAS_PROJECT_ID (EAS environment variable) หรือวางค่าแทน '' ตรงนี้
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '';

/**
 * ประเภทข้อมูลที่ "ออกจากเครื่อง" (D81, D83) — ข้อมูลการฝึก/โปรไฟล์/สุขภาพอยู่ใน SQLite บนเครื่องเท่านั้น จึงไม่ประกาศ
 * เหลือเฉพาะสิ่งที่ RevenueCat ได้รับ (ตรงกับ store-metadata/privacy-labels.md และนโยบายความเป็นส่วนตัว)
 * Linked: true แบบระมัดระวัง (รหัสนิรนามคงที่ผูกกับประวัติการซื้อ) — ความไม่แน่ใจบันทึกใน OPEN_QUESTIONS Q21
 */
const COLLECTED_DATA_TYPES = [
  'NSPrivacyCollectedDataTypeUserID', // app user id นิรนามที่ SDK ของ RevenueCat สร้าง (ไม่มีบัญชี/ล็อกอิน)
  'NSPrivacyCollectedDataTypePurchaseHistory', // ประวัติการซื้อ/สถานะสมาชิกผ่าน RevenueCat
].map((type) => ({
  NSPrivacyCollectedDataType: type,
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
}));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: SLUG,
  scheme: 'fitnese',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#000000',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    appleTeamId: process.env.APPLE_TEAM_ID || undefined,
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: COLLECTED_DATA_TYPES,
      NSPrivacyAccessedAPITypes: [],
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // แอปไม่ใช้สิทธิ์เหล่านี้ ตัดออกเพื่อให้ Data safety ตรงกับความจริง
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
    ],
  },
  locales: {
    th: './src/i18n/native/th.json',
    en: './src/i18n/native/en.json',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-localization',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/splash-icon.png',
        imageWidth: 160,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  // ไม่ใส่ extra.eas ถ้ายังไม่มีรหัส (eas init จะถามหา/แจ้งให้เพิ่มเอง เพราะไฟล์นี้เป็นแบบเขียนโค้ด)
  ...(EAS_PROJECT_ID ? { extra: { eas: { projectId: EAS_PROJECT_ID } } } : {}),
});
