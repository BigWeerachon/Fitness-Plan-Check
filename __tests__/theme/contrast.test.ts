import { describe, expect, it } from '@jest/globals';
import { contrastRatio, ensureContrast, hexToHsl, hslToHex, onColor } from '@/theme/color';
import {
  ACCENT_PRESETS,
  buildPalette,
  chartColors,
  contrastReport,
  NEUTRALS,
  passesAA,
  type ThemeMode,
} from '@/theme/tokens';

const MODES: ThemeMode[] = ['dark', 'light'];

describe('color utilities', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });

  it('round-trips hex ↔ hsl', () => {
    for (const hex of ['#E5A9DC', '#123456', '#00FF00', '#808080']) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex);
    }
  });

  it('ensureContrast lifts colors until they pass', () => {
    const fixed = ensureContrast('#550055', ['#1C1C1E'], 4.5);
    expect(contrastRatio(fixed, '#1C1C1E')).toBeGreaterThanOrEqual(4.5);
    const darker = ensureContrast('#FFDDEE', ['#FFFFFF', '#F2F2F7'], 4.5);
    expect(contrastRatio(darker, '#F2F2F7')).toBeGreaterThanOrEqual(4.5);
  });

  it('onColor always returns AA text for any fill', () => {
    for (let h = 0; h < 360; h += 15) {
      for (const l of [0.2, 0.45, 0.5, 0.55, 0.8]) {
        const fill = hslToHex({ h, s: 0.6, l });
        expect(contrastRatio(onColor(fill), fill)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('accent palettes (SPEC DS / N5)', () => {
  it('has exactly 8 presets with the default pink first', () => {
    expect(ACCENT_PRESETS).toHaveLength(8);
    expect(ACCENT_PRESETS[0]).toEqual({ id: 'pink', base: '#E5A9DC' });
  });

  it.each(ACCENT_PRESETS.flatMap((a) => MODES.map((m) => [a.id, m] as const)))(
    '%s in %s mode passes WCAG AA',
    (id, mode) => {
      const report = contrastReport(buildPalette(mode, id));
      expect(passesAA(report)).toBe(true);
    },
  );

  it('keeps the dark default accent at the reference pink', () => {
    expect(buildPalette('dark', 'pink').accent).toBe('#E5A9DC');
  });

  it('auto-corrects any custom color to pass AA in both modes', () => {
    for (let h = 0; h < 360; h += 20) {
      for (const s of [0.1, 0.6, 1]) {
        for (const l of [0.05, 0.3, 0.5, 0.7, 0.95]) {
          const custom = hslToHex({ h, s, l });
          for (const mode of MODES) {
            expect(passesAA(contrastReport(buildPalette(mode, custom)))).toBe(true);
          }
        }
      }
    }
  });

  it('chart colors stay distinguishable from the card (3:1)', () => {
    for (const mode of MODES) {
      for (const c of chartColors('#E5A9DC', mode)) {
        expect(contrastRatio(c, NEUTRALS[mode].card)).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
