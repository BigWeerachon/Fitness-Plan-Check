import {
  composite,
  contrastRatio,
  ensureContrast,
  hexToHsl,
  hslToHex,
  isHexColor,
  normalizeHex,
  onColor,
  withAlpha,
} from './color';

/**
 * Design tokens ตามหมวด [DS] ของ SPEC และภาพอ้างอิง docs/reference/theme-reference.jpg
 * ทุกสีที่ขึ้นกับสีหลักคำนวณจากฟังก์ชันเดียว (deriveAccent) ทั้งพาเลต 8 สีและสีที่ผู้ใช้เลือกเอง
 * จึงรับประกัน contrast WCAG AA ได้ทุกกรณี (มี unit test ครอบ)
 */

export type ThemeMode = 'dark' | 'light';
export type ThemePreference = ThemeMode | 'system';

export const ACCENT_PRESETS = [
  { id: 'pink', base: '#E5A9DC' },
  { id: 'lavender', base: '#C3B4F7' },
  { id: 'sky', base: '#A9D2F7' },
  { id: 'mint', base: '#9BE3CB' },
  { id: 'lime', base: '#C8E59B' },
  { id: 'gold', base: '#F2D58C' },
  { id: 'peach', base: '#F7C2A2' },
  { id: 'coral', base: '#F5A3A8' },
] as const;

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id'];
/** ค่าที่เก็บในการตั้งค่า: id ของพาเลต หรือ hex ที่ผู้ใช้เลือกเอง */
export type AccentSetting = AccentPresetId | `#${string}`;

export const DEFAULT_ACCENT: AccentPresetId = 'pink';

export const NEUTRALS = {
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    cardPressed: '#2C2C2E',
    elevated: '#2C2C2E',
    separator: 'rgba(255,255,255,0.10)',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    danger: '#FF7A7A',
    success: '#7EE2A8',
    warning: '#F5C46B',
    tabBar: 'rgba(36,36,38,0.88)',
    switchOff: '#39393D',
    overlay: 'rgba(0,0,0,0.6)',
    inputBg: '#2C2C2E',
  },
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    cardPressed: '#E5E5EA',
    elevated: '#FFFFFF',
    separator: 'rgba(0,0,0,0.10)',
    text: '#000000',
    textSecondary: '#6C6C70',
    danger: '#C62828',
    success: '#1B7A44',
    warning: '#8A5A00',
    tabBar: 'rgba(255,255,255,0.92)',
    switchOff: '#D1D1D6',
    overlay: 'rgba(0,0,0,0.35)',
    inputBg: '#F2F2F7',
  },
} as const;

/** สีพื้นที่ข้อความสีหลักต้องอ่านออก (AA 4.5:1) ในแต่ละโหมด */
export const TEXT_SURFACES: Record<ThemeMode, string[]> = {
  dark: [NEUTRALS.dark.background, NEUTRALS.dark.card],
  light: [NEUTRALS.light.background, NEUTRALS.light.card],
};

export interface AccentSet {
  /** ข้อความ/ไอคอนสีหลัก ผ่าน AA 4.5:1 บนพื้นและการ์ด */
  text: string;
  /** พื้นปุ่ม สวิตช์ ติ๊กเซ็ต (ผ่าน 3:1 กับการ์ดสำหรับองค์ประกอบกราฟิก) */
  fill: string;
  /** ข้อความบนพื้น fill ผ่าน AA 4.5:1 (ปรับอัตโนมัติ) */
  onFill: string;
  /** สีแสงเรืองด้านบนหน้าจอ */
  glow: string;
  /** ความทึบสูงสุดของแสงเรือง (~20–30% ตาม SPEC) */
  glowOpacity: number;
  /** พื้นวงรีของแท็บที่เลือก / chip ที่เลือก (สีหลักเข้มโปร่งแสง) */
  soft: string;
}

export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
export const AA_GRAPHIC = 3;

export function resolveAccentBase(setting: AccentSetting | string | null | undefined): string {
  const preset = ACCENT_PRESETS.find((p) => p.id === setting);
  if (preset) return preset.base;
  if (typeof setting === 'string' && isHexColor(setting)) return normalizeHex(setting);
  return ACCENT_PRESETS[0].base;
}

export function deriveAccent(baseHex: string, mode: ThemeMode): AccentSet {
  const base = normalizeHex(baseHex);
  const hsl = hexToHsl(base);
  const n = NEUTRALS[mode];
  if (mode === 'dark') {
    const glow = hslToHex({ h: hsl.h, s: Math.min(0.75, Math.max(0.35, hsl.s)), l: 0.55 });
    const glowOpacity = 0.3;
    // หัวข้อใหญ่วางบนแสงเรือง จึงให้ข้อความสีหลักผ่าน 4.5:1 กับจุดที่สว่างที่สุดของแสงด้วย
    const peak = composite(glow, glowOpacity, n.background);
    const text = ensureContrast(base, [...TEXT_SURFACES.dark, peak], AA_TEXT);
    const fill = ensureContrast(base, [n.card], AA_GRAPHIC);
    const softBase = hslToHex({ h: hsl.h, s: Math.min(0.6, Math.max(0.25, hsl.s)), l: 0.4 });
    return { text, fill, onFill: onColor(fill), glow, glowOpacity, soft: withAlpha(softBase, 0.45) };
  }
  const glow = hslToHex({ h: hsl.h, s: Math.min(0.85, Math.max(0.4, hsl.s)), l: 0.78 });
  const glowOpacity = 0.35;
  const peak = composite(glow, glowOpacity, n.background);
  const text = ensureContrast(base, [...TEXT_SURFACES.light, peak], AA_TEXT);
  const fill = ensureContrast(text, [n.card, n.background], AA_GRAPHIC);
  return { text, fill, onFill: onColor(fill), glow, glowOpacity, soft: withAlpha(base, 0.35) };
}

export interface Palette {
  mode: ThemeMode;
  background: string;
  card: string;
  cardPressed: string;
  elevated: string;
  separator: string;
  text: string;
  textSecondary: string;
  danger: string;
  success: string;
  warning: string;
  tabBar: string;
  switchOff: string;
  overlay: string;
  inputBg: string;
  accent: string;
  accentFill: string;
  onAccent: string;
  glow: string;
  glowOpacity: number;
  accentSoft: string;
  /** สีชุดสำหรับกราฟ (เริ่มจากสีหลัก แล้วหมุนโทน) ผ่าน 3:1 บนการ์ด */
  chart: string[];
}

const GOLDEN_ANGLE = 137.508;

export function chartColors(baseHex: string, mode: ThemeMode, count = 10): string[] {
  const hsl = hexToHsl(baseHex);
  const n = NEUTRALS[mode];
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = hsl.h + i * GOLDEN_ANGLE;
    const s = Math.max(0.45, Math.min(0.8, hsl.s));
    const l = mode === 'dark' ? 0.72 : 0.42;
    colors.push(ensureContrast(hslToHex({ h, s, l }), [n.card], AA_GRAPHIC));
  }
  colors[0] = deriveAccent(baseHex, mode).fill;
  return colors;
}

export function buildPalette(mode: ThemeMode, accent: AccentSetting | string): Palette {
  const base = resolveAccentBase(accent);
  const a = deriveAccent(base, mode);
  return {
    mode,
    ...NEUTRALS[mode],
    accent: a.text,
    accentFill: a.fill,
    onAccent: a.onFill,
    glow: a.glow,
    glowOpacity: a.glowOpacity,
    accentSoft: a.soft,
    chart: chartColors(base, mode),
  };
}

/** สีที่หัวข้อใหญ่ (hero) ทับอยู่จริง = แสงเรืองที่จุดเข้มสุดซ้อนบนพื้น ใช้ตรวจ contrast ข้อความใหญ่ */
export function glowPeakColor(p: Palette): string {
  return composite(p.glow, p.glowOpacity, p.background);
}

export interface ContrastReport {
  accentOnBackground: number;
  accentOnCard: number;
  onAccentOnFill: number;
  fillOnCard: number;
  heroOnGlow: number;
  secondaryOnCard: number;
}

export function contrastReport(p: Palette): ContrastReport {
  return {
    accentOnBackground: contrastRatio(p.accent, p.background),
    accentOnCard: contrastRatio(p.accent, p.card),
    onAccentOnFill: contrastRatio(p.onAccent, p.accentFill),
    fillOnCard: contrastRatio(p.accentFill, p.card),
    heroOnGlow: contrastRatio(p.accent, glowPeakColor(p)),
    secondaryOnCard: contrastRatio(p.textSecondary, p.card),
  };
}

export function passesAA(r: ContrastReport): boolean {
  return (
    r.accentOnBackground >= AA_TEXT &&
    r.accentOnCard >= AA_TEXT &&
    r.onAccentOnFill >= AA_TEXT &&
    r.fillOnCard >= AA_GRAPHIC &&
    r.heroOnGlow >= AA_TEXT &&
    r.secondaryOnCard >= AA_TEXT
  );
}

export const radius = { card: 28, row: 20, button: 16, pill: 999, sheet: 28, input: 14 } as const;
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
/** ปุ่มสำคัญไม่เล็กกว่า 48 dp (Android) / 44 pt (iOS) ตาม SPEC A2 — ใช้ 48 ทั้งสองแพลตฟอร์ม */
export const MIN_TOUCH = 48;
export const motion = { fast: 150, normal: 250, slow: 400 } as const;

/** สีตามแนวทางแบรนด์ของปุ่มล็อกอิน (SPEC B10 "ใช้ปุ่มตามแนวทางแบรนด์") — ห้ามเปลี่ยนตามสีหลัก */
export const BRAND = {
  google: {
    light: { background: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
    dark: { background: '#131314', border: '#8E918F', text: '#E3E3E3' },
    logo: { blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' },
  },
  apple: {
    /** พื้นมืดใช้ปุ่มขาว พื้นสว่างใช้ปุ่มดำ (Apple HIG) */
    light: { background: '#000000', text: '#FFFFFF' },
    dark: { background: '#FFFFFF', text: '#000000' },
  },
} as const;
