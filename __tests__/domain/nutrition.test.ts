import { describe, expect, it } from '@jest/globals';
import type { ActivityLevel, Intensity, Sex } from '@/db/schema';
import {
  ACTIVITY_LEVELS,
  ACTIVITY_MULTIPLIERS,
  bmr,
  DEFAULT_MET,
  dailyExpenditure,
  exerciseKcal,
  GOALS,
  KCAL_FLOOR,
  macros,
  metFor,
  nutritionSummary,
  PROTEIN_PER_KG_DEFAULT,
  PROTEIN_PER_KG_RANGE,
  targetCalories,
  tdee,
  type NutritionProfile,
} from '@/domain/nutrition';

// ตัวอย่างหลักที่คำนวณมือ: ชาย 30 ปี 180 cm 80 kg
// BMR = 10×80 + 6.25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5 = 1780
const male = { sex: 'male' as const, age: 30, heightCm: 180, weightKg: 80 };

describe('BMR (Mifflin-St Jeor)', () => {
  it('uses +5 for men', () => {
    expect(bmr(male)).toBe(1780);
  });

  it('uses −161 for women', () => {
    // 10×60 + 6.25×165 − 5×25 − 161 = 600 + 1031.25 − 125 − 161
    expect(bmr({ sex: 'female', age: 25, heightCm: 165, weightKg: 60 })).toBe(1345.25);
  });

  it('differs by exactly 166 kcal between sexes for the same body', () => {
    expect(bmr(male) - bmr({ ...male, sex: 'female' })).toBe(166);
  });

  it('drops 5 kcal per year of age', () => {
    expect(bmr({ ...male, age: 31 })).toBe(1775);
  });
});

describe('TDEE', () => {
  it('lists the five activity levels in order with their multipliers', () => {
    expect(ACTIVITY_LEVELS).toEqual(['sedentary', 'light', 'moderate', 'active', 'very_active']);
    expect(ACTIVITY_LEVELS.map((l) => ACTIVITY_MULTIPLIERS[l])).toEqual([1.2, 1.375, 1.55, 1.725, 1.9]);
    expect(GOALS).toEqual(['lose', 'maintain', 'gain']);
  });

  it.each<[ActivityLevel, number]>([
    ['sedentary', 2136],
    ['light', 2447.5],
    ['moderate', 2759],
    ['active', 3070.5],
    ['very_active', 3382],
  ])('BMR 1780 × %s = %d', (level, expected) => {
    expect(tdee(1780, level)).toBeCloseTo(expected, 9);
  });
});

describe('target calories', () => {
  const base = { tdee: 2759, sex: 'male' as const, age: 30 };

  it('loses 20% by default', () => {
    // 2759 × 0.8 = 2207.2
    expect(targetCalories({ ...base, goal: 'lose' })).toEqual({
      kcal: 2207,
      goal: 'lose',
      adjustPct: 20,
      floorApplied: false,
      minorNoDeficit: false,
    });
  });

  it.each([
    [9, 10, 2483], // บีบขึ้นเป็น 10%: 2759 × 0.9 = 2483.1
    [10, 10, 2483],
    [15, 15, 2345], // 2345.15
    [25, 25, 2069], // 2069.25
    [26, 25, 2069], // บีบลงเป็น 25%
    [null, 20, 2207],
    [Number.NaN, 20, 2207],
  ])('deficit %p%% → applies %d%% → %d kcal', (deficitPct, applied, kcal) => {
    const t = targetCalories({ ...base, goal: 'lose', deficitPct });
    expect(t.adjustPct).toBe(applied);
    expect(t.kcal).toBe(kcal);
  });

  it('keeps TDEE for maintain and ignores deficit/surplus settings', () => {
    expect(targetCalories({ ...base, goal: 'maintain', deficitPct: 25, surplusPct: 20 })).toEqual({
      kcal: 2759,
      goal: 'maintain',
      adjustPct: 0,
      floorApplied: false,
      minorNoDeficit: false,
    });
  });

  it.each([
    [undefined, 10, 3035], // 2759 × 1.1 = 3034.9
    [4, 5, 2897], // บีบขึ้นเป็น 5%: 2896.95
    [15, 15, 3173], // 3172.85
    [20, 20, 3311], // 3310.8
    [21, 20, 3311], // บีบลงเป็น 20%
  ])('surplus %p%% → applies %d%% → %d kcal', (surplusPct, applied, kcal) => {
    const t = targetCalories({ ...base, goal: 'gain', surplusPct });
    expect(t.adjustPct).toBe(applied);
    expect(t.kcal).toBe(kcal);
    expect(t.goal).toBe('gain');
  });

  describe('age < 18 gets no weight-loss target', () => {
    it('age 17 choosing lose → maintain + minorNoDeficit', () => {
      expect(targetCalories({ ...base, age: 17, goal: 'lose' })).toEqual({
        kcal: 2759,
        goal: 'maintain',
        adjustPct: 0,
        floorApplied: false,
        minorNoDeficit: true,
      });
    });

    it('age 18 choosing lose → normal deficit', () => {
      const t = targetCalories({ ...base, age: 18, goal: 'lose' });
      expect(t).toMatchObject({ kcal: 2207, goal: 'lose', minorNoDeficit: false });
    });

    it('age 17 may still maintain or gain', () => {
      expect(targetCalories({ ...base, age: 17, goal: 'gain' })).toMatchObject({
        kcal: 3035,
        goal: 'gain',
        minorNoDeficit: false,
      });
      expect(targetCalories({ ...base, age: 17, goal: 'maintain' })).toMatchObject({
        kcal: 2759,
        minorNoDeficit: false,
      });
    });
  });

  describe('safety floor (female 1,200 / male 1,500)', () => {
    it('exposes the floors', () => {
      expect(KCAL_FLOOR).toEqual({ female: 1200, male: 1500 });
    });

    it('raises a small woman’s deficit target to 1,200', () => {
      // หญิง 30 ปี 155 cm 50 kg: BMR = 500 + 968.75 − 150 − 161 = 1157.75; TDEE ×1.2 = 1389.3; −20% = 1111.44
      const t = tdee(bmr({ sex: 'female', age: 30, heightCm: 155, weightKg: 50 }), 'sedentary');
      expect(t).toBeCloseTo(1389.3, 9);
      expect(targetCalories({ tdee: t, sex: 'female', age: 30, goal: 'lose' })).toEqual({
        kcal: 1200,
        goal: 'lose',
        adjustPct: 20,
        floorApplied: true,
        minorNoDeficit: false,
      });
    });

    it('raises an older man’s deficit target to 1,500', () => {
      // ชาย 60 ปี 165 cm 55 kg: BMR = 550 + 1031.25 − 300 + 5 = 1286.25; TDEE = 1543.5; −20% = 1234.8
      const t = tdee(bmr({ sex: 'male', age: 60, heightCm: 165, weightKg: 55 }), 'sedentary');
      expect(targetCalories({ tdee: t, sex: 'male', age: 60, goal: 'lose' })).toMatchObject({
        kcal: 1500,
        floorApplied: true,
      });
    });

    it.each<[Sex, number, number, boolean]>([
      ['female', 1500, 1200, false], // 1200 พอดี = ไม่ต่ำกว่า
      ['female', 1499.99, 1200, false], // 1199.992 ปัดเป็น 1200
      ['female', 1499, 1200, true], // 1199.2 → 1199 < 1200
      ['female', 1700, 1360, false], // ต่ำกว่าพื้นของชายแต่ไม่ต่ำกว่าของหญิง
      ['male', 1875, 1500, false],
      ['male', 1874, 1500, true], // 1499.2 → 1499
    ])('%s with TDEE %d losing 20%% → %d kcal (floor %p)', (sex, t, kcal, floorApplied) => {
      expect(targetCalories({ tdee: t, sex, age: 40, goal: 'lose' })).toMatchObject({ kcal, floorApplied });
    });

    it('also applies to maintain targets', () => {
      expect(targetCalories({ tdee: 1000, sex: 'female', age: 80, goal: 'maintain' })).toMatchObject({
        kcal: 1200,
        floorApplied: true,
      });
    });

    it('combines with the minor rule', () => {
      expect(targetCalories({ tdee: 1100, sex: 'female', age: 16, goal: 'lose' })).toEqual({
        kcal: 1200,
        goal: 'maintain',
        adjustPct: 0,
        floorApplied: true,
        minorNoDeficit: true,
      });
    });
  });
});

describe('macros', () => {
  it('keeps the default protein per goal within 1.6–2.2 g/kg (lose = high end)', () => {
    expect(PROTEIN_PER_KG_DEFAULT).toEqual({ lose: 2.2, maintain: 1.8, gain: 2.0 });
    for (const g of GOALS) {
      expect(PROTEIN_PER_KG_DEFAULT[g]).toBeGreaterThanOrEqual(PROTEIN_PER_KG_RANGE.min);
      expect(PROTEIN_PER_KG_DEFAULT[g]).toBeLessThanOrEqual(PROTEIN_PER_KG_RANGE.max);
    }
    expect(PROTEIN_PER_KG_DEFAULT.lose).toBe(PROTEIN_PER_KG_RANGE.max);
  });

  it('lose: 2207 kcal, 80 kg', () => {
    // โปรตีน 2.2 × 80 = 176 g (704 kcal); ไขมัน 2207 × 25% / 9 = 61.3 g; คาร์บ (2207 − 704 − 551.75) / 4 = 237.8 g
    expect(macros({ targetKcal: 2207, weightKg: 80, goal: 'lose' })).toEqual({
      proteinG: 176,
      fatG: 61,
      carbsG: 238,
      proteinPerKg: 2.2,
      fatPct: 25,
      clamped: false,
    });
  });

  it('maintain: 2759 kcal, 80 kg', () => {
    // 1.8 × 80 = 144 g (576); 2759 × .25 / 9 = 76.6; (2759 − 576 − 689.75) / 4 = 373.3
    expect(macros({ targetKcal: 2759, weightKg: 80, goal: 'maintain' })).toMatchObject({
      proteinG: 144,
      fatG: 77,
      carbsG: 373,
      proteinPerKg: 1.8,
    });
  });

  it('gain: 3035 kcal, 80 kg', () => {
    // 2.0 × 80 = 160 g (640); 3035 × .25 / 9 = 84.3; (3035 − 640 − 758.75) / 4 = 409.06
    expect(macros({ targetKcal: 3035, weightKg: 80, goal: 'gain' })).toMatchObject({
      proteinG: 160,
      fatG: 84,
      carbsG: 409,
      proteinPerKg: 2,
    });
  });

  it('uses the user’s protein g/kg and fat % when set', () => {
    // 1.6 × 80 = 128 g (512); 2207 × 30% / 9 = 73.57; (2207 − 512 − 662.1) / 4 = 258.2
    expect(macros({ targetKcal: 2207, weightKg: 80, goal: 'lose', proteinPerKg: 1.6, fatPct: 30 })).toEqual({
      proteinG: 128,
      fatG: 74,
      carbsG: 258,
      proteinPerKg: 1.6,
      fatPct: 30,
      clamped: false,
    });
  });

  it.each([null, undefined, 0, -1, Number.NaN])('falls back to the goal default for protein %p', (p) => {
    expect(macros({ targetKcal: 2207, weightKg: 80, goal: 'lose', proteinPerKg: p }).proteinPerKg).toBe(2.2);
  });

  it('falls back to 25% fat when fat % is missing and bounds it to 0–100', () => {
    expect(macros({ targetKcal: 2000, weightKg: 50, goal: 'maintain', fatPct: null }).fatPct).toBe(25);
    expect(macros({ targetKcal: 2000, weightKg: 50, goal: 'maintain', fatPct: -5 })).toMatchObject({
      fatPct: 0,
      fatG: 0,
      // (2000 − 360) / 4 = 410
      carbsG: 410,
    });
    // ไขมัน 120% → 100%: โปรตีน 90 g (360) + ไขมัน 2000 เกิน → ไขมัน = (2000 − 360) / 9 = 182.2
    expect(macros({ targetKcal: 2000, weightKg: 50, goal: 'maintain', fatPct: 120 })).toEqual({
      proteinG: 90,
      fatG: 182,
      carbsG: 0,
      proteinPerKg: 1.8,
      fatPct: 100,
      clamped: true,
    });
  });

  it('keeps carbs at the remainder exactly when protein + fat still fit', () => {
    // 1.8 × 150 = 270 g (1080); ไขมัน 1500 × 25% = 375 kcal = 41.7 g; คาร์บ (1500 − 1080 − 375) / 4 = 11.25
    expect(macros({ targetKcal: 1500, weightKg: 150, goal: 'maintain' })).toMatchObject({
      proteinG: 270,
      fatG: 42,
      carbsG: 11,
      clamped: false,
    });
  });

  it('trims fat (carbs 0) when protein + fat exceed the target', () => {
    // โปรตีน 1080 kcal + ไขมัน 40% (600) = 1680 > 1500 → ไขมัน = 420 / 9 = 46.7 g
    expect(macros({ targetKcal: 1500, weightKg: 150, goal: 'maintain', fatPct: 40 })).toMatchObject({
      proteinG: 270,
      fatG: 47,
      carbsG: 0,
      clamped: true,
    });
  });

  it('caps protein at the whole target when protein alone exceeds it', () => {
    // 2.2 × 150 = 330 g = 1320 kcal > 1200 → โปรตีน 1200 / 4 = 300 g
    expect(macros({ targetKcal: 1200, weightKg: 150, goal: 'lose' })).toMatchObject({
      proteinG: 300,
      fatG: 0,
      carbsG: 0,
      proteinPerKg: 2.2,
      clamped: true,
    });
  });

  it('never returns negative grams', () => {
    const m = macros({ targetKcal: -100, weightKg: 80, goal: 'maintain' });
    expect(m).toMatchObject({ proteinG: 0, fatG: 0, carbsG: 0, clamped: true });
  });
});

describe('exercise kcal (MET × kg × hours)', () => {
  it('has the default METs light 3.5 / moderate 5 / hard 6', () => {
    expect(DEFAULT_MET).toEqual({ light: 3.5, moderate: 5, hard: 6 });
  });

  it.each<[Intensity, number, number, number]>([
    ['moderate', 80, 3600, 400], // 5 × 80 × 1
    ['light', 70, 2700, 184], // 3.5 × 70 × 0.75 = 183.75
    ['hard', 60, 5400, 540], // 6 × 60 × 1.5
  ])('%s, %d kg, %d s → %d kcal', (intensity, weightKg, durationSec, kcal) => {
    expect(exerciseKcal({ intensity, weightKg, durationSec })).toBe(kcal);
  });

  it('uses the user’s MET overrides when positive', () => {
    expect(metFor('hard', { hard: 8 })).toBe(8);
    expect(exerciseKcal({ intensity: 'hard', weightKg: 60, durationSec: 5400, mets: { hard: 8 } })).toBe(720);
    expect(metFor('light', { light: null })).toBe(3.5);
    expect(metFor('moderate', { moderate: 0 })).toBe(5);
    expect(metFor('moderate', { hard: 9 })).toBe(5);
    expect(metFor('moderate', null)).toBe(5);
  });

  it('returns 0 for missing duration or weight', () => {
    expect(exerciseKcal({ intensity: 'moderate', weightKg: 80, durationSec: 0 })).toBe(0);
    expect(exerciseKcal({ intensity: 'moderate', weightKg: 0, durationSec: 3600 })).toBe(0);
    expect(exerciseKcal({ intensity: 'moderate', weightKg: 80, durationSec: -60 })).toBe(0);
  });
});

describe('daily expenditure (H3)', () => {
  it('uses exercise kcal of the day when nothing was entered', () => {
    expect(dailyExpenditure({ manualKcal: null, sessionKcals: [400, 183.6, null] })).toEqual({
      kcal: 584,
      isManual: false,
      exerciseKcal: 584,
    });
    expect(dailyExpenditure({ manualKcal: undefined, sessionKcals: [] })).toEqual({
      kcal: 0,
      isManual: false,
      exerciseKcal: 0,
    });
  });

  it('prefers the manual value and flags it', () => {
    expect(dailyExpenditure({ manualKcal: 2500.6, sessionKcals: [400] })).toEqual({
      kcal: 2501,
      isManual: true,
      exerciseKcal: 400,
    });
    expect(dailyExpenditure({ manualKcal: 0, sessionKcals: [400] })).toMatchObject({
      kcal: 0,
      isManual: true,
    });
  });

  it('ignores invalid manual values and session kcal', () => {
    expect(dailyExpenditure({ manualKcal: -5, sessionKcals: [300] })).toMatchObject({
      kcal: 300,
      isManual: false,
    });
    expect(dailyExpenditure({ manualKcal: Number.NaN, sessionKcals: [Number.NaN, -20, 100] })).toEqual({
      kcal: 100,
      isManual: false,
      exerciseKcal: 100,
    });
  });
});

describe('nutrition summary from a profile', () => {
  const profile: NutritionProfile = {
    ...male,
    activityLevel: 'moderate',
    goal: 'lose',
  };

  it('computes BMR, TDEE, target and macros together', () => {
    expect(nutritionSummary(profile)).toEqual({
      bmr: 1780,
      tdee: 2759,
      target: { kcal: 2207, goal: 'lose', adjustPct: 20, floorApplied: false, minorNoDeficit: false },
      macros: { proteinG: 176, fatG: 61, carbsG: 238, proteinPerKg: 2.2, fatPct: 25, clamped: false },
    });
  });

  it('passes the user’s deficit, protein and fat settings through', () => {
    const s = nutritionSummary({ ...profile, deficitPct: 25, proteinPerKg: 2, fatPct: 30 });
    // 2759 × 0.75 = 2069.25 → 2069; โปรตีน 160 g (640); ไขมัน 2069 × .3 / 9 = 68.97; คาร์บ (2069 − 640 − 620.7) / 4 = 202.1
    expect(s?.target.kcal).toBe(2069);
    expect(s?.macros).toMatchObject({ proteinG: 160, fatG: 69, carbsG: 202 });
  });

  it('uses maintain protein for a minor who chose lose', () => {
    // อายุ 17: BMR = 800 + 1125 − 85 + 5 = 1845; TDEE = 2859.75 → คงที่ 2860
    // โปรตีน 1.8 × 80 = 144 g; ไขมัน 2860 × .25 / 9 = 79.4; คาร์บ (2860 − 576 − 715) / 4 = 392.25
    const s = nutritionSummary({ ...profile, age: 17 });
    expect(s?.bmr).toBe(1845);
    expect(s?.tdee).toBe(2860);
    expect(s?.target).toMatchObject({ kcal: 2860, goal: 'maintain', minorNoDeficit: true });
    expect(s?.macros).toMatchObject({ proteinG: 144, fatG: 79, carbsG: 392, proteinPerKg: 1.8 });
  });

  it.each<[keyof NutritionProfile, number | null]>([
    ['sex', null],
    ['age', null],
    ['heightCm', null],
    ['weightKg', null],
    ['activityLevel', null],
    ['goal', null],
    ['age', 0],
    ['weightKg', -70],
    ['heightCm', Number.NaN],
  ])('returns null when %s is %p (profile skipped or invalid)', (field, value) => {
    expect(nutritionSummary({ ...profile, [field]: value } as NutritionProfile)).toBeNull();
  });
});
