import type { TextStyle } from 'react-native';

/** ชื่อฟอนต์ต้องตรงกับที่โหลดใน src/app/_layout.tsx (IBM Plex Sans Thai รองรับไทย/อังกฤษ SPEC DS) */
export const fonts = {
  light: 'IBMPlexSansThai_300Light',
  regular: 'IBMPlexSansThai_400Regular',
  medium: 'IBMPlexSansThai_500Medium',
  semibold: 'IBMPlexSansThai_600SemiBold',
} as const;

/** ฟอนต์ไทยต้องเผื่อ lineHeight สำหรับสระบน/ล่าง ไม่งั้นจะโดนตัด */
export const typography = {
  hero: { fontFamily: fonts.regular, fontSize: 32, lineHeight: 46 },
  heroSub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bigNumber: { fontFamily: fonts.light, fontSize: 48, lineHeight: 60, fontVariant: ['tabular-nums'] },
  rowTitle: { fontFamily: fonts.light, fontSize: 30, lineHeight: 42 },
  mediumNumber: { fontFamily: fonts.light, fontSize: 28, lineHeight: 38, fontVariant: ['tabular-nums'] },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 32 },
  headline: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  dayLetter: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  dayLetterOn: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  tabular: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** จำกัดการขยายฟอนต์ของตัวเลขใหญ่ไม่ให้ layout แตก แต่ยังรองรับ Dynamic Type (SPEC N5) */
export const BIG_TEXT_MAX_SCALE = 1.4;
export const BODY_MAX_SCALE = 2;
