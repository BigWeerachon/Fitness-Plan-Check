import { describe, expect, it } from '@jest/globals';
import {
  cmToFtIn,
  displayWeight,
  formatWeight,
  ftInToCm,
  KG_PER_LB,
  kgToLb,
  lbToKg,
  roundTo,
  roundToStep,
  roundWeightToStep,
  weightToKg,
} from '@/domain/units';

describe('roundTo', () => {
  it('rounds half away from zero without binary floating point surprises', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.45, 1)).toBe(2.5);
    expect(roundTo(2.44, 1)).toBe(2.4);
    expect(roundTo(0.5)).toBe(1);
    expect(roundTo(-0.5)).toBe(-1);
    expect(roundTo(-1.25, 1)).toBe(-1.3);
    expect(roundTo(1234.5678, 2)).toBe(1234.57);
  });

  it('defaults to whole numbers and leaves non-finite values alone', () => {
    expect(roundTo(2207.2)).toBe(2207);
    expect(roundTo(Number.NaN, 1)).toBeNaN();
    expect(roundTo(Number.POSITIVE_INFINITY, 1)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('roundToStep', () => {
  it('rounds to the nearest multiple of the step (half goes up)', () => {
    expect(roundToStep(61.25, 2.5)).toBe(62.5); // 24.5 ก้าว → 25
    expect(roundToStep(61.2, 2.5)).toBe(60); // 24.48 ก้าว → 24
    expect(roundToStep(72, 2.5)).toBe(72.5); // 28.8 → 29
    expect(roundToStep(60.6, 1.25)).toBe(60); // 48.48 ก้าว → 48
    expect(roundToStep(60.7, 1.25)).toBe(61.25); // 48.56 ก้าว → 49
  });

  it('cleans floating point noise in the quotient', () => {
    // 0.1 + 0.2 = 0.30000000000000004 → ก้าว 0.1 ต้องได้ 0.3 พอดี
    expect(roundToStep(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(roundToStep(7.5 * 0.9, 2.5)).toBe(7.5); // 6.75 → 2.7 ก้าว → 3 → 7.5
  });

  it('returns the value unchanged when the step is not positive', () => {
    expect(roundToStep(7.3, 0)).toBe(7.3);
    expect(roundToStep(7.3, -2.5)).toBe(7.3);
    expect(roundToStep(Number.NaN, 2.5)).toBeNaN();
  });
});

describe('weight conversion', () => {
  it('converts kg ↔ lb with the exact international pound', () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(kgToLb(100)).toBeCloseTo(220.46226, 5);
    expect(lbToKg(5)).toBeCloseTo(2.26796185, 8);
    expect(lbToKg(kgToLb(83.7))).toBeCloseTo(83.7, 10);
    expect(kgToLb(0)).toBe(0);
  });

  it('shows weights in the user unit rounded to 0.1', () => {
    expect(displayWeight(45.359237, 'lb')).toBe(100);
    expect(displayWeight(45.359237, 'kg')).toBe(45.4);
    expect(displayWeight(102.25, 'kg')).toBe(102.3);
    expect(displayWeight(60, 'lb')).toBe(132.3); // 132.277…
  });

  it('formats without a trailing .0 (unit label comes from i18n)', () => {
    expect(formatWeight(100, 'kg')).toBe('100');
    expect(formatWeight(45.359237, 'lb')).toBe('100');
    expect(formatWeight(45.359237, 'kg')).toBe('45.4');
    expect(formatWeight(102.25, 'kg')).toBe('102.3');
  });

  it('stores user input as exact kg so it displays back unchanged', () => {
    expect(weightToKg(100, 'lb')).toBeCloseTo(45.359237, 9);
    expect(weightToKg(62.5, 'kg')).toBe(62.5);
    expect(displayWeight(weightToKg(137.5, 'lb'), 'lb')).toBe(137.5);
  });
});

describe('height conversion', () => {
  it('converts cm to whole feet/inches', () => {
    expect(cmToFtIn(175)).toEqual({ ft: 5, in: 9 }); // 68.9 นิ้ว → 69
    expect(cmToFtIn(182.88)).toEqual({ ft: 6, in: 0 });
    expect(cmToFtIn(152.4)).toEqual({ ft: 5, in: 0 });
    expect(cmToFtIn(0)).toEqual({ ft: 0, in: 0 });
  });

  it('carries 12 rounded inches into the next foot', () => {
    // 182.5 cm = 71.85 นิ้ว → 72 → 6'0" ไม่ใช่ 5'12"
    expect(cmToFtIn(182.5)).toEqual({ ft: 6, in: 0 });
    // 180.1 cm = 70.9 นิ้ว → 71 → 5'11"
    expect(cmToFtIn(180.1)).toEqual({ ft: 5, in: 11 });
  });

  it('converts feet/inches to cm', () => {
    expect(ftInToCm(5, 9)).toBeCloseTo(175.26, 10);
    expect(ftInToCm(6, 0)).toBeCloseTo(182.88, 10);
    expect(ftInToCm(0, 10)).toBeCloseTo(25.4, 10);
    expect(cmToFtIn(ftInToCm(5, 7))).toEqual({ ft: 5, in: 7 });
  });
});

describe('roundWeightToStep (unit aware)', () => {
  it('rounds to kg steps in kg', () => {
    expect(roundWeightToStep(72, 2.5, 'kg')).toBe(72.5);
    expect(roundWeightToStep(61.3, 1.25, 'kg')).toBe(61.25);
    expect(roundWeightToStep(90, 2.5, 'kg')).toBe(90);
  });

  it('rounds to whole lb steps when the unit is lb and returns kg', () => {
    const step = lbToKg(5);
    // 46 kg = 101.41 lb → 100 lb
    expect(kgToLb(roundWeightToStep(46, step, 'lb'))).toBeCloseTo(100, 4);
    // 47 kg = 103.62 lb → 105 lb
    const r = roundWeightToStep(47, step, 'lb');
    expect(r).toBeCloseTo(47.627199, 6);
    expect(displayWeight(r, 'lb')).toBe(105);
    // ก้าว 2.5 lb: 101.41 lb → 102.5 lb (40.56 ก้าว → 41)
    expect(displayWeight(roundWeightToStep(46, lbToKg(2.5), 'lb'), 'lb')).toBe(102.5);
  });

  it('does not round when the step is not positive', () => {
    expect(roundWeightToStep(61.3, 0, 'kg')).toBe(61.3);
  });
});
