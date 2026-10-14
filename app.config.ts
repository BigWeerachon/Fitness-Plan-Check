import type { ConfigContext, ExpoConfig } from 'expo/config';

// ค่าที่ต้องเปลี่ยนก่อน build จริง อ่านจาก .env (ดู docs/HUMAN_TASKS.md)
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.example.fitnese';
// รหัสโปรเจกต์ EAS: ได้จาก `eas init` — ตั้งเป็นตัวแปร EAS_PROJECT_ID (EAS environment variable) หรือวางค่าแทน '' ตรงนี้
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '';

/**
 * ประเภทข้อมูลที่แอปเก็บ (ตรงกับตาราง App Privacy ใน docs/HUMAN_TASKS.md ส่วน R และนโยบายความเป็นส่วนตัว)
 * ทุกประเภท: เชื่อมกับตัวตนผู้ใช้ ไม่ใช้ติดตาม ใช้เพื่อการทำงานของแอปเท่านั้น
 */
const COLLECTED_DATA_TYPES = [
  'NSPrivacyCollectedDataTypeUserID', // app user id นิรนามของ RevenueCat (ไม่มีบัญชี/ล็อกอิน D81)
  'NSPrivacyCollectedDataTypeHealth', // ส่วนสูง น้ำหนักตัว แคลอรี่ที่กิน
  'NSPrivacyCollectedDataTypeFitness', // โปรแกรมและบันทึกการฝึก
  'NSPrivacyCollectedDataTypePurchaseHistory', // สถานะสมาชิกผ่าน RevenueCat
  'NSPrivacyCollectedDataTypeOtherDataTypes', // เพศ อายุ (ไม่บังคับ)
].map((type) => ({
  NSPrivacyCollectedDataType: type,
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
}));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Fitnese',
  slug: 'fitnese',
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
