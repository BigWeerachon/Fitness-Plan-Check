import type { ConfigContext, ExpoConfig } from 'expo/config';

// ค่าที่ต้องเปลี่ยนก่อน build จริง อ่านจาก .env (ดู docs/HUMAN_TASKS.md)
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.example.fitnese';
// ปลั๊กอิน Google Sign-In บังคับให้มี iosUrlScheme ตอน prebuild ถ้ายังไม่มีคีย์จริงใช้ค่าชั่วคราวไปก่อน
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.placeholder';

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
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
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
    // ไม่ใช้ Face ID/ไบโอเมตริก → ไม่ขอสิทธิ์ (ข้อมูลขั้นต่ำ B13)
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-apple-authentication',
    ['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }],
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
});
