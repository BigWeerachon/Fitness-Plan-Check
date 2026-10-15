import {
  AA_GRAPHIC,
  AA_LARGE,
  AA_TEXT,
  clamp,
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
    textSecondary: '#98989F',
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
    textSecondary: '#636366',
    danger: '#B71C1C',
    success: '#176B3B',
    warning: '#8A5A00',
    tabBar: 'rgba(255,255,255,0.92)',
    switchOff: '#D1D1D6',
    overlay: 'rgba(0,0,0,0.35)',
    inputBg: '#F2F2F7',
  },
} as const;

/** สีพื้นที่ข้อความสีหลักต้องอ่านออก (AA 4.5:1) ในแต่ละโหมด */
export const TEXT_SURFACES: Record<ThemeMode, string[]> = {
  dark: [NEUTRALS.dark.background, NEUTRALS.dark.card, NEUTRALS.dark.elevated],
  light: [NEUTRALS.light.background, NEUTRALS.light.card, NEUTRALS.light.elevated],
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
  /** สีทึบที่ได้จริงเมื่อ soft วางบนการ์ด/พื้น — ข้อความสีหลักบน chip/แท็บที่เลือกต้องผ่าน 4.5:1 กับสีนี้ */
  softSurfaces: string[];
}

export { AA_GRAPHIC, AA_LARGE, AA_TEXT };
const DARK_SOFT_ALPHA = 0.45;
const LIGHT_SOFT_ALPHA = 0.35;

export function resolveAccentBase(setting: AccentSetting | string | null | undefined): string {
  const preset = ACCENT_PRESETS.find((p) => p.id === setting);
  if (preset) return preset.base;
  if (typeof setting === 'string' && isHexColor(setting)) return normalizeHex(setting);
  return ACCENT_PRESETS[0].base;
}

const GLOW_OPACITY_STEP = 0.01;
const GLOW_OPACITY_MIN = 0.12;

/**
 * ความทึบของแสงเรือง: เริ่มจากค่าตาม SPEC (~30%) แล้วลดทีละน้อยจนข้อความรอง (สีเทา) ที่วางบน
 * จุดสว่างสุดของแสงผ่าน AA 4.5:1 — สีหลักที่สว่างมาก (เหลือง/เขียวอ่อน) จึงได้แสงจางกว่าเล็กน้อย
 */
function glowOpacityFor(glow: string, start: number, mode: ThemeMode): number {
  const neutrals = NEUTRALS[mode];
  let opacity = start;
  while (
    opacity > GLOW_OPACITY_MIN &&
    contrastRatio(neutrals.textSecondary, composite(glow, opacity, neutrals.background)) < AA_TEXT
  ) {
    opacity = Math.round((opacity - GLOW_OPACITY_STEP) * 100) / 100;
  }
  return opacity;
}

export function deriveAccent(baseHex: string, mode: ThemeMode): AccentSet {
  const base = normalizeHex(baseHex);
  const hsl = hexToHsl(base);
  const neutrals = NEUTRALS[mode];
  if (mode === 'dark') {
    const glow = hslToHex({ h: hsl.h, s: clamp(hsl.s, 0.35, 0.75), l: 0.55 });
    const glowOpacity = glowOpacityFor(glow, 0.3, mode);
    // หัวข้อใหญ่วางบนแสงเรือง จึงให้ข้อความสีหลักผ่าน 4.5:1 กับจุดที่สว่างที่สุดของแสงด้วย
    const peak = composite(glow, glowOpacity, neutrals.background);
    const softBase = hslToHex({ h: hsl.h, s: clamp(hsl.s, 0.25, 0.6), l: 0.4 });
    const softSurfaces = [neutrals.card, neutrals.background].map((bg) =>
      composite(softBase, DARK_SOFT_ALPHA, bg),
    );
    const text = ensureContrast(base, [...TEXT_SURFACES.dark, peak, ...softSurfaces], AA_TEXT);
    const fill = ensureContrast(base, [neutrals.card], AA_GRAPHIC);
    return {
      text,
      fill,
      onFill: onColor(fill),
      glow,
      glowOpacity,
      soft: withAlpha(softBase, DARK_SOFT_ALPHA),
      softSurfaces,
    };
  }
  const glow = hslToHex({ h: hsl.h, s: clamp(hsl.s, 0.4, 0.85), l: 0.78 });
  const glowOpacity = glowOpacityFor(glow, 0.35, mode);
  const peak = composite(glow, glowOpacity, neutrals.background);
  const softSurfaces = [neutrals.card, neutrals.background].map((bg) =>
    composite(base, LIGHT_SOFT_ALPHA, bg),
  );
  const text = ensureContrast(base, [...TEXT_SURFACES.light, peak, ...softSurfaces], AA_TEXT);
  const fill = ensureContrast(text, [neutrals.card, neutrals.background], AA_GRAPHIC);
  return {
    text,
    fill,
    onFill: onColor(fill),
    glow,
    glowOpacity,
    soft: withAlpha(base, LIGHT_SOFT_ALPHA),
    softSurfaces,
  };
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
  /** สีทึบของ accentSoft บนการ์ด/พื้น (ใช้ตรวจ contrast) */
  accentSoftSurfaces: string[];
  /** สีชุดสำหรับกราฟ (เริ่มจากสีหลัก แล้วหมุนโทน) ผ่าน 3:1 บนการ์ด */
  chart: string[];
}

const GOLDEN_ANGLE = 137.508;

/** จำนวนสีกราฟ ≥ จำนวนกลุ่มกล้ามเนื้อ (11) เพื่อไม่ให้ชิ้นสุดท้ายซ้ำสีชิ้นแรก (I2) */
export const CHART_COLOR_COUNT = 12;

/** fillColor = สีปุ่มของสีหลักนี้ ถ้าคำนวณไว้แล้วให้ส่งมาเพื่อไม่ต้องคำนวณซ้ำ */
export function chartColors(
  baseHex: string,
  mode: ThemeMode,
  count = CHART_COLOR_COUNT,
  fillColor: string = deriveAccent(baseHex, mode).fill,
): string[] {
  const hsl = hexToHsl(baseHex);
  const neutrals = NEUTRALS[mode];
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = hsl.h + i * GOLDEN_ANGLE;
    const s = clamp(hsl.s, 0.45, 0.8);
    const l = mode === 'dark' ? 0.72 : 0.42;
    colors.push(ensureContrast(hslToHex({ h, s, l }), [neutrals.card], AA_GRAPHIC));
  }
  colors[0] = fillColor;
  return colors;
}

export function buildPalette(mode: ThemeMode, accent: AccentSetting | string): Palette {
  const base = resolveAccentBase(accent);
  const accentSet = deriveAccent(base, mode);
  return {
    mode,
    ...NEUTRALS[mode],
    accent: accentSet.text,
    accentFill: accentSet.fill,
    onAccent: accentSet.onFill,
    glow: accentSet.glow,
    glowOpacity: accentSet.glowOpacity,
    accentSoft: accentSet.soft,
    accentSoftSurfaces: accentSet.softSurfaces,
    chart: chartColors(base, mode, CHART_COLOR_COUNT, accentSet.fill),
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
  /** ข้อความรอง (subtitle ของ hero) บนจุดสว่างสุดของแสงเรือง */
  secondaryOnGlow: number;
  secondaryOnCard: number;
  /** ข้อความสีหลักบน chip/แท็บที่เลือก (ค่าต่ำสุดของทุกพื้น) */
  accentOnSoft: number;
  /** ข้อความรองบนพื้นยก (sheet/ช่องกรอก) */
  secondaryOnElevated: number;
}

export function contrastReport(p: Palette): ContrastReport {
  return {
    accentOnBackground: contrastRatio(p.accent, p.background),
    accentOnCard: contrastRatio(p.accent, p.card),
    onAccentOnFill: contrastRatio(p.onAccent, p.accentFill),
    fillOnCard: contrastRatio(p.accentFill, p.card),
    heroOnGlow: contrastRatio(p.accent, glowPeakColor(p)),
    secondaryOnGlow: contrastRatio(p.textSecondary, glowPeakColor(p)),
    secondaryOnCard: contrastRatio(p.textSecondary, p.card),
    accentOnSoft: Math.min(...p.accentSoftSurfaces.map((bg) => contrastRatio(p.accent, bg))),
    secondaryOnElevated: Math.min(
      contrastRatio(p.textSecondary, p.elevated),
      contrastRatio(p.textSecondary, p.inputBg),
    ),
  };
}

/** เกณฑ์ขั้นต่ำของแต่ละข้อ — Record บังคับให้ทุก field ของ ContrastReport มีเกณฑ์ */
const MIN_RATIO: Record<keyof ContrastReport, number> = {
  accentOnBackground: AA_TEXT,
  accentOnCard: AA_TEXT,
  onAccentOnFill: AA_TEXT,
  fillOnCard: AA_GRAPHIC,
  heroOnGlow: AA_TEXT,
  secondaryOnGlow: AA_TEXT,
  secondaryOnCard: AA_TEXT,
  accentOnSoft: AA_TEXT,
  secondaryOnElevated: AA_TEXT,
};

/** ชื่อข้อที่ contrast ต่ำกว่าเกณฑ์ (ว่าง = ผ่านหมด) */
export function failingChecks(r: ContrastReport): (keyof ContrastReport)[] {
  return (Object.keys(MIN_RATIO) as (keyof ContrastReport)[]).filter((k) => r[k] < MIN_RATIO[k]);
}

export function passesAA(r: ContrastReport): boolean {
  return failingChecks(r).length === 0;
}

export const radius = { card: 28, row: 20, button: 16, pill: 999, sheet: 28, input: 14 } as const;
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
/** ปุ่มสำคัญไม่เล็กกว่า 48 dp (Android) / 44 pt (iOS) ตาม SPEC A2 — ใช้ 48 ทั้งสองแพลตฟอร์ม */
export const MIN_TOUCH = 48;
export const motion = { fast: 150, normal: 250, slow: 400 } as const;
