/**
 * ฟังก์ชันสีล้วน (ไม่มี side effect) ใช้คำนวณพาเลตจากสีหลักและตรวจ contrast ตาม WCAG 2.x
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** เกณฑ์ contrast ตาม WCAG 2.x AA (อยู่ที่นี่เพราะ onColor ใช้ และ tokens.ts import color.ts) */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
export const AA_GRAPHIC = 3;

/** จำกัดค่า v ให้อยู่ระหว่าง lo ถึง hi (ต้อง lo <= hi) */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function normalizeHex(value: string): string {
  const m = HEX_RE.exec(value.trim());
  if (!m) throw new Error(`Invalid hex color: ${value}`);
  let hex = m[1].toUpperCase();
  if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
  return `#${hex}`;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/** แปลง HSL เป็น RGB ตามสูตรมาตรฐาน W3C (q, p, conv ตามสูตรนั้น) */
export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hh = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const conv = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return { r: conv(hh + 1 / 3) * 255, g: conv(hh) * 255, b: conv(hh - 1 / 3) * 255 };
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: Hsl): string {
  return rgbToHex(hslToRgb(hsl));
}

/** ค่าความสว่างสัมพัทธ์ตามนิยาม WCAG */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** อัตราส่วน contrast 1–21 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** ผสมสี a กับ b ตามสัดส่วน t (0 = a, 1 = b) */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/** วางสี fg ที่ความทึบ alpha ลงบนพื้น bg แล้วได้สีผลลัพธ์ทึบ */
export function composite(fg: string, alpha: number, bg: string): string {
  return mix(bg, fg, alpha);
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** ฉากหลังที่ luminance ต่ำกว่านี้ถือว่ามืด (ปรับสีให้สว่างขึ้นแทนมืดลง) */
const DARK_BACKGROUND_LUMINANCE = 0.2;
const LIGHTNESS_STEP = 0.01;
const MAX_LIGHTNESS_STEPS = 100;
/** ความสว่าง HSL ของสีเข้มอมโทนเดียวกับ fill ที่ onColor ใช้เป็นตัวเลือกแรก */
const DARK_TINT_LIGHTNESS = 0.08;

/**
 * ปรับความสว่างของสี fg (คงโทนสีเดิม) จนผ่าน contrast ขั้นต่ำกับพื้นทุกสีที่ให้มา
 * พื้นเข้ม → ทำให้สว่างขึ้น, พื้นสว่าง → ทำให้เข้มขึ้น
 * ถ้าไม่มีทางผ่านได้ (เช่น พื้นเทากลาง) จะคืนขาวหรือดำที่ดีที่สุด
 */
export function ensureContrast(fg: string, backgrounds: string[], min: number): string {
  const passes = (c: string) => backgrounds.every((bg) => contrastRatio(c, bg) >= min);
  if (passes(fg)) return normalizeHex(fg);
  const backgroundsAreDark = backgrounds.every((bg) => relativeLuminance(bg) < DARK_BACKGROUND_LUMINANCE);
  const hsl = hexToHsl(fg);
  for (let i = 1; i <= MAX_LIGHTNESS_STEPS; i++) {
    const offset = LIGHTNESS_STEP * i;
    const l = backgroundsAreDark ? Math.min(1, hsl.l + offset) : Math.max(0, hsl.l - offset);
    const candidate = hslToHex({ ...hsl, l });
    if (passes(candidate)) return candidate;
  }
  const white = '#FFFFFF';
  const black = '#000000';
  const minRatio = (c: string) => Math.min(...backgrounds.map((bg) => contrastRatio(c, bg)));
  return minRatio(white) >= minRatio(black) ? white : black;
}

/**
 * สีตัวอักษรบนพื้น fill (เช่น ข้อความบนปุ่ม) เลือกระหว่างสีเข้มอมโทนเดียวกับ fill หรือขาว
 * แล้วรับประกันว่าผ่าน min (ค่าเริ่มต้น AA 4.5)
 */
export function onColor(fill: string, min = AA_TEXT): string {
  const hsl = hexToHsl(fill);
  const darkTint = hslToHex({ h: hsl.h, s: Math.min(1, hsl.s * 0.9), l: DARK_TINT_LIGHTNESS });
  const candidates = [darkTint, '#FFFFFF', '#000000'];
  const best = candidates.reduce((a, b) => (contrastRatio(b, fill) > contrastRatio(a, fill) ? b : a));
  if (contrastRatio(best, fill) >= min) return best;
  return ensureContrast(best, [fill], min);
}
