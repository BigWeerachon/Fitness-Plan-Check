import { describe, expect, it } from '@jest/globals';
import {
  adjustTarget,
  preferredWeightStepKg,
  weightStepOptionsKg,
  applySuggestion,
  changeProgressionMode,
  customWeekIndex,
  defaultWeightStepKg,
  skipSuggestion,
  suggestNext,
  WEIGHT_STEP_OPTIONS,
  type PerformedSet,
  type ProgressionConfig,
} from '@/domain/progression';
import { displayWeight, lbToKg } from '@/domain/units';

const NOW = new Date(2026, 9, 9, 18, 0).getTime(); // ศุกร์ 9 ต.ค. 2026 (เวลาท้องถิ่น)
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0).getTime();

function set(weightKg: number | null, reps: number | null, done = true, targetReps: number | null = null) {
  return { weightKg, reps, done, targetReps } satisfies PerformedSet;
}
const times = (n: number, s: PerformedSet) => Array.from({ length: n }, () => ({ ...s }));

const double: ProgressionConfig = {
  progressionMode: 'double',
  sets: 3,
  repMin: 8,
  repMax: 12,
  weightStepKg: 2.5,
  customWeeks: null,
  baseWeightKg: null,
  failStreak: 0,
  progressionStartedAt: null,
  targetWeightKg: 60,
  targetReps: 10,
};

const linear: ProgressionConfig = {
  ...double,
  progressionMode: 'linear',
  sets: 5,
  repMin: 5,
  repMax: 5,
  targetWeightKg: 100,
  targetReps: 5,
};

const weeks = [
  { reps: 8, percent: 70 },
  { reps: 6, percent: 80 },
  { reps: 4, percent: 90 },
];
const custom: ProgressionConfig = {
  ...double,
  progressionMode: 'custom',
  customWeeks: weeks,
  baseWeightKg: 100,
  progressionStartedAt: at(2026, 10, 5, 7), // จันทร์ 5 ต.ค. 07:00
};

const suggest = (
  config: ProgressionConfig,
  lastSets: PerformedSet[] | null,
  unit: 'kg' | 'lb' = 'kg',
  now = NOW,
) => suggestNext({ config, lastSets, unit, now });

describe('weight steps', () => {
  it('defaults to 2.5 kg or 5 lb, adjustable to 1.25 kg / 2.5 lb', () => {
    expect(WEIGHT_STEP_OPTIONS).toEqual({ kg: [2.5, 1.25], lb: [5, 2.5] });
    expect(defaultWeightStepKg('kg')).toBe(2.5);
    expect(defaultWeightStepKg('lb')).toBeCloseTo(2.26796185, 8);
  });
});

describe('double progression (default)', () => {
  it('adds the step and drops to the bottom of the range when every set hits the top', () => {
    expect(suggest(double, times(3, set(60, 12)))).toEqual({
      targetWeightKg: 62.5,
      targetReps: 8,
      reason: 'increase',
      failStreak: 0,
      deloadOffered: false,
    });
  });

  it('keeps the weight and targets lowest reps + 1 otherwise', () => {
    expect(suggest(double, [set(60, 12), set(60, 12), set(60, 11)])).toEqual({
      targetWeightKg: 60,
      targetReps: 12,
      reason: 'addRep',
      failStreak: 0,
      deloadOffered: false,
    });
    expect(suggest(double, [set(60, 10), set(60, 9), set(60, 8)])).toMatchObject({
      targetWeightKg: 60,
      targetReps: 9,
      reason: 'addRep',
    });
  });

  it('never targets above the top of the range (repeat when already there)', () => {
    // ทำได้ 12 ครบแต่แค่ 2 จาก 3 เซ็ต → เป้า min(12, 13) = 12
    expect(suggest(double, [set(60, 12), set(60, 12), set(60, 12, false)])).toMatchObject({
      targetWeightKg: 60,
      targetReps: 12,
      reason: 'repeat',
    });
  });

  it('never targets below the bottom of the range', () => {
    // ต่ำสุด 5 → 6 แต่ขอบล่างคือ 8
    expect(suggest(double, [set(60, 6), set(60, 6), set(60, 5)])).toMatchObject({
      targetWeightKg: 60,
      targetReps: 8,
      reason: 'addRep',
    });
  });

  it('requires the planned sets at the same (working) weight', () => {
    // 57.5 ตรงกลางทำให้ที่ 60 ครบแค่ 2 เซ็ต
    expect(suggest(double, [set(60, 12), set(57.5, 12), set(60, 12)])).toMatchObject({
      targetWeightKg: 60,
      targetReps: 12,
      reason: 'repeat',
    });
  });

  it('ignores lighter back-off sets and extra sets beyond the plan', () => {
    expect(suggest(double, [...times(3, set(60, 12)), set(50, 15)]).reason).toBe('increase');
    expect(suggest(double, [...times(3, set(60, 12)), set(60, 9)])).toMatchObject({
      targetWeightKg: 62.5,
      reason: 'increase',
    });
  });

  it('ignores sets that were not ticked or have no reps', () => {
    expect(suggest(double, [set(60, 12), set(60, 12), set(60, null), set(80, 12, false)])).toMatchObject({
      targetWeightKg: 60,
      targetReps: 12,
      reason: 'repeat',
    });
  });

  it('respects a 1.25 kg step', () => {
    expect(suggest({ ...double, weightStepKg: 1.25 }, times(3, set(60, 12))).targetWeightKg).toBe(61.25);
  });

  it('rounds to whole lb steps for lb users', () => {
    const lbConfig = { ...double, weightStepKg: lbToKg(5) };
    // 100 lb → 105 lb
    const s = suggest(lbConfig, times(3, set(lbToKg(100), 12)), 'lb');
    expect(displayWeight(s.targetWeightKg as number, 'lb')).toBe(105);
    expect(s.targetWeightKg).toBeCloseTo(47.627199, 6);
    // 60 kg = 132.28 lb + 5 = 137.28 → ปัดเป็น 135 lb
    const off = suggest(lbConfig, times(3, set(60, 12)), 'lb');
    expect(off.targetWeightKg).toBeCloseTo(61.23497, 5);
    expect(displayWeight(off.targetWeightKg as number, 'lb')).toBe(135);
  });

  it('cannot add load to bodyweight sets: stays at the top of the range', () => {
    expect(suggest(double, times(3, set(null, 12)))).toEqual({
      targetWeightKg: null,
      targetReps: 12,
      reason: 'repeat',
      failStreak: 0,
      deloadOffered: false,
    });
    expect(suggest(double, times(3, set(0, 12)))).toMatchObject({ targetWeightKg: 0, reason: 'repeat' });
    expect(suggest(double, [set(null, 10), set(null, 9), set(null, 9)])).toMatchObject({
      targetWeightKg: null,
      targetReps: 10,
      reason: 'addRep',
    });
  });

  it('walks the whole cycle 8 → 12 reps then adds weight', () => {
    let config: ProgressionConfig = { ...double, targetWeightKg: 60, targetReps: 8 };
    const reasons: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const s = suggest(config, times(3, set(config.targetWeightKg, config.targetReps)));
      reasons.push(`${s.reason}:${s.targetWeightKg}x${s.targetReps}`);
      config = { ...config, ...applySuggestion(s) };
    }
    expect(reasons).toEqual([
      'addRep:60x9',
      'addRep:60x10',
      'addRep:60x11',
      'addRep:60x12',
      'increase:62.5x8',
    ]);
  });

  describe('first session (no history)', () => {
    it('uses the existing target when there is one', () => {
      expect(suggest(double, null)).toEqual({
        targetWeightKg: 60,
        targetReps: 10,
        reason: 'first',
        failStreak: 0,
        deloadOffered: false,
      });
    });

    it('falls back to base weight / bottom of range, or null weight', () => {
      const fresh = { ...double, targetWeightKg: null, targetReps: null };
      expect(suggest(fresh, [])).toMatchObject({ targetWeightKg: null, targetReps: 8, reason: 'first' });
      expect(suggest({ ...fresh, baseWeightKg: 40 }, null)).toMatchObject({
        targetWeightKg: 40,
        targetReps: 8,
        reason: 'first',
      });
    });

    it('treats a session where no set was ticked as no history', () => {
      expect(suggest(double, times(3, set(60, 12, false))).reason).toBe('first');
    });
  });
});

describe('linear progression', () => {
  it('adds the step when every planned set hits the target and resets the miss count', () => {
    expect(suggest({ ...linear, failStreak: 1 }, times(5, set(100, 5)))).toEqual({
      targetWeightKg: 102.5,
      targetReps: 5,
      reason: 'increase',
      failStreak: 0,
      deloadOffered: false,
    });
  });

  it('first miss: same weight, miss count 1, no deload yet', () => {
    expect(suggest(linear, [...times(3, set(100, 5)), set(100, 4), set(100, 4)])).toEqual({
      targetWeightKg: 100,
      targetReps: 5,
      reason: 'repeat',
      failStreak: 1,
      deloadOffered: false,
    });
  });

  it('second miss in a row (1 → 2): offers a ~10% deload rounded to the step', () => {
    expect(suggest({ ...linear, failStreak: 1 }, [...times(4, set(100, 5)), set(100, 3)])).toEqual({
      targetWeightKg: 90,
      targetReps: 5,
      reason: 'deload',
      failStreak: 2,
      deloadOffered: true,
    });
  });

  it('keeps offering the deload after it was rejected and the lifter misses again', () => {
    expect(suggest({ ...linear, failStreak: 2 }, times(5, set(100, 4)))).toMatchObject({
      targetWeightKg: 90,
      reason: 'deload',
      failStreak: 3,
      deloadOffered: true,
    });
  });

  it('counts a planned set that was not done as a miss', () => {
    expect(suggest(linear, [...times(4, set(100, 5)), set(100, 5, false)])).toMatchObject({
      reason: 'repeat',
      failStreak: 1,
    });
  });

  it('uses each set’s own target (e.g. lowered for today only)', () => {
    expect(suggest(linear, times(5, set(100, 3, true, 3)))).toMatchObject({
      targetWeightKg: 102.5,
      targetReps: 5,
      reason: 'increase',
    });
  });

  it('falls back to the bottom of the range when no target reps are stored', () => {
    const cfg = { ...linear, targetReps: null, repMin: 6, repMax: 8 };
    expect(suggest(cfg, times(5, set(100, 6)))).toMatchObject({ targetReps: 6, reason: 'increase' });
    expect(suggest(cfg, times(5, set(100, 5)))).toMatchObject({ targetReps: 6, reason: 'repeat' });
  });

  it('rounds the deload to the step in kg', () => {
    // 82.5 × 0.9 = 74.25 → 75
    expect(suggest({ ...linear, failStreak: 1 }, times(5, set(82.5, 4))).targetWeightKg).toBe(75);
  });

  it('rounds the deload to whole lb for lb users', () => {
    // 185 lb × 0.9 = 166.5 lb → 165 lb
    const s = suggest(
      { ...linear, failStreak: 1, weightStepKg: lbToKg(5) },
      times(5, set(lbToKg(185), 4)),
      'lb',
    );
    expect(displayWeight(s.targetWeightKg as number, 'lb')).toBe(165);
    expect(s.targetWeightKg).toBeCloseTo(74.842741, 6);
  });

  it('deloads at least one step on light weights', () => {
    // 10 × 0.9 = 9 ปัดกลับเป็น 10 → ลด 1 ก้าวเป็น 7.5
    expect(suggest({ ...linear, failStreak: 1 }, times(5, set(10, 4))).targetWeightKg).toBe(7.5);
  });

  it('does not offer a deload that would reach zero', () => {
    expect(suggest({ ...linear, failStreak: 1 }, times(5, set(2.5, 4)))).toEqual({
      targetWeightKg: 2.5,
      targetReps: 5,
      reason: 'repeat',
      failStreak: 2,
      deloadOffered: false,
    });
  });

  it('handles bodyweight sets without changing load', () => {
    expect(suggest(linear, times(5, set(null, 5)))).toMatchObject({
      targetWeightKg: null,
      reason: 'repeat',
      failStreak: 0,
    });
    expect(suggest({ ...linear, failStreak: 1 }, times(5, set(null, 4)))).toMatchObject({
      targetWeightKg: null,
      reason: 'repeat',
      failStreak: 2,
      deloadOffered: false,
    });
  });

  it('first session keeps the stored miss count', () => {
    expect(suggest({ ...linear, failStreak: 1 }, null)).toEqual({
      targetWeightKg: 100,
      targetReps: 5,
      reason: 'first',
      failStreak: 1,
      deloadOffered: false,
    });
  });
});

describe('custom weekly progression', () => {
  it.each([
    ['same week (day 4)', at(2026, 10, 9), 70, 8],
    ['last day of week 0 (day 6)', at(2026, 10, 11, 23), 70, 8],
    ['week 1 (day 7)', at(2026, 10, 12, 0), 80, 6],
    ['week 2', at(2026, 10, 19), 90, 4],
    ['wraps to week 0 after the cycle', at(2026, 10, 26), 70, 8],
    ['wraps again to week 1', at(2026, 11, 2), 80, 6],
  ])('%s → %d kg × %d', (_label, now, weight, reps) => {
    expect(suggest(custom, null, 'kg', now)).toEqual({
      targetWeightKg: weight,
      targetReps: reps,
      reason: 'custom',
      failStreak: 0,
      deloadOffered: false,
    });
  });

  it('counts weeks across month and year boundaries', () => {
    expect(customWeekIndex(at(2026, 10, 26), at(2026, 11, 2), 3)).toBe(1);
    expect(customWeekIndex(at(2026, 12, 28), at(2027, 1, 3), 3)).toBe(0);
    expect(customWeekIndex(at(2026, 12, 28), at(2027, 1, 4), 3)).toBe(1);
    expect(customWeekIndex(at(2026, 12, 28), at(2027, 1, 18), 3)).toBe(0);
  });

  it('starts at week 0 when not started yet or the clock is behind', () => {
    expect(customWeekIndex(null, NOW, 3)).toBe(0);
    expect(customWeekIndex(at(2026, 10, 20), NOW, 3)).toBe(0);
    expect(customWeekIndex(at(2026, 10, 1), NOW, 0)).toBe(0);
    expect(suggest({ ...custom, progressionStartedAt: null }, null, 'kg', at(2027, 3, 1))).toMatchObject({
      targetWeightKg: 70,
      targetReps: 8,
    });
  });

  it('rounds base × percent to the step', () => {
    // 82.5 × 70% = 57.75 → 57.5
    expect(suggest({ ...custom, baseWeightKg: 82.5 }, null).targetWeightKg).toBe(57.5);
  });

  it('rounds to whole lb for lb users', () => {
    const s = suggest(
      { ...custom, baseWeightKg: lbToKg(100), weightStepKg: lbToKg(5) },
      null,
      'lb',
      at(2026, 10, 12),
    );
    expect(displayWeight(s.targetWeightKg as number, 'lb')).toBe(80);
    expect(s.targetWeightKg).toBeCloseTo(36.28739, 5);
  });

  it('gives reps only when there is no base weight', () => {
    expect(suggest({ ...custom, baseWeightKg: null }, null)).toMatchObject({
      targetWeightKg: null,
      targetReps: 8,
      reason: 'custom',
    });
  });

  it('ignores last session performance', () => {
    expect(suggest(custom, times(3, set(95, 2))).targetWeightKg).toBe(70);
  });

  it('behaves like "off" while no weeks are defined', () => {
    expect(suggest({ ...custom, customWeeks: [] }, [set(60, 10), set(60, 8)])).toMatchObject({
      targetWeightKg: 60,
      targetReps: 8,
      reason: 'off',
    });
    expect(suggest({ ...custom, customWeeks: null }, null).reason).toBe('off');
  });
});

describe('progression off', () => {
  it('targets last performance (working weight × lowest reps)', () => {
    expect(
      suggest({ ...double, progressionMode: 'off', failStreak: 3 }, [set(60, 10), set(60, 9), set(60, 8)]),
    ).toEqual({ targetWeightKg: 60, targetReps: 8, reason: 'off', failStreak: 0, deloadOffered: false });
  });

  it('keeps the existing target without history', () => {
    expect(suggest({ ...double, progressionMode: 'off' }, null)).toMatchObject({
      targetWeightKg: 60,
      targetReps: 10,
      reason: 'off',
    });
    const bare = { ...double, progressionMode: 'off' as const, targetWeightKg: null, targetReps: null };
    expect(suggest(bare, null)).toMatchObject({ targetWeightKg: null, targetReps: 8 });
    expect(suggest({ ...bare, baseWeightKg: 40 }, null).targetWeightKg).toBe(40);
  });
});

describe('changing the progression mode', () => {
  it('switching to custom starts the weekly cycle today and resets misses', () => {
    expect(changeProgressionMode({ ...linear, failStreak: 2 }, 'custom', NOW)).toEqual({
      progressionMode: 'custom',
      failStreak: 0,
      progressionStartedAt: NOW,
    });
    // รอบเริ่มวันนี้ → สัปดาห์ถัดไปเดินเป็นสัปดาห์ที่ 2 ของรอบ
    const cfg = { ...custom, ...changeProgressionMode(double, 'custom', NOW) };
    expect(suggest(cfg, null, 'kg', at(2026, 10, 16)).targetReps).toBe(6);
  });

  it('switching to another mode resets misses and keeps the cycle start', () => {
    expect(changeProgressionMode({ ...custom, failStreak: 1 }, 'linear', NOW)).toEqual({
      progressionMode: 'linear',
      failStreak: 0,
      progressionStartedAt: custom.progressionStartedAt,
    });
    expect(changeProgressionMode(double, 'off', NOW)).toEqual({
      progressionMode: 'off',
      failStreak: 0,
      progressionStartedAt: null,
    });
  });

  it('choosing the same mode changes nothing (custom cycle keeps running)', () => {
    expect(changeProgressionMode({ ...custom, failStreak: 1 }, 'custom', NOW)).toEqual({
      progressionMode: 'custom',
      failStreak: 1,
      progressionStartedAt: custom.progressionStartedAt,
    });
  });
});

describe('accept / skip a suggestion', () => {
  it('accepting persists the target and miss count', () => {
    expect(applySuggestion(suggest(double, times(3, set(60, 12))))).toEqual({
      targetWeightKg: 62.5,
      targetReps: 8,
      failStreak: 0,
    });
    expect(applySuggestion(suggest(linear, times(5, set(100, 4))))).toEqual({
      targetWeightKg: 100,
      targetReps: 5,
      failStreak: 1,
    });
  });

  it('accepting a deload starts the miss count over', () => {
    const s = suggest({ ...linear, failStreak: 1 }, times(5, set(100, 4)));
    expect(s.reason).toBe('deload');
    expect(applySuggestion(s)).toEqual({ targetWeightKg: 90, targetReps: 5, failStreak: 0 });
  });

  it('rejecting a deload keeps the weight but remembers the misses', () => {
    const s = suggest({ ...linear, failStreak: 1 }, times(5, set(100, 4)));
    expect(skipSuggestion(s)).toEqual({ failStreak: 2 });
  });
});

describe('adjust target: today only vs from now on', () => {
  it('"today only" changes the session sets but not the routine exercise', () => {
    expect(adjustTarget(double, { weightKg: 62.5, reps: 10 }, 'today', NOW)).toEqual({
      session: { targetWeightKg: 62.5, targetReps: 10 },
      routineExercise: null,
    });
  });

  it('"from now on" also persists the target on the routine exercise', () => {
    expect(adjustTarget(double, { weightKg: 62.5, reps: 9 }, 'forward', NOW)).toEqual({
      session: { targetWeightKg: 62.5, targetReps: 9 },
      routineExercise: { targetWeightKg: 62.5, targetReps: 9 },
    });
  });

  it('linear: a new forward weight resets the miss count, a reps-only change does not', () => {
    const cfg = { ...linear, failStreak: 2 };
    expect(adjustTarget(cfg, { weightKg: 92.5, reps: 5 }, 'forward', NOW).routineExercise).toEqual({
      targetWeightKg: 92.5,
      targetReps: 5,
      failStreak: 0,
    });
    expect(adjustTarget(cfg, { weightKg: 100, reps: 4 }, 'forward', NOW).routineExercise).toEqual({
      targetWeightKg: 100,
      targetReps: 4,
    });
    expect(
      adjustTarget({ ...cfg, targetWeightKg: null }, { weightKg: 50, reps: 5 }, 'forward', NOW)
        .routineExercise,
    ).toMatchObject({ failStreak: 0 });
    expect(
      adjustTarget({ ...cfg, targetWeightKg: null }, { weightKg: null, reps: 5 }, 'forward', NOW)
        .routineExercise,
    ).toEqual({ targetWeightKg: null, targetReps: 5 });
  });

  it('custom: rescales the base weight so the change sticks in later weeks', () => {
    // สัปดาห์ 1 (80%) ตั้ง 84 kg → ฐาน = 84 / 0.8 = 105
    const r = adjustTarget(custom, { weightKg: 84, reps: 6 }, 'forward', at(2026, 10, 12));
    expect(r.routineExercise).toEqual({ targetWeightKg: 84, targetReps: 6, baseWeightKg: 105 });
    // สัปดาห์ถัดไป (90%) ใช้ฐานใหม่: 105 × 0.9 = 94.5 → 95
    const next = { ...custom, ...r.routineExercise };
    expect(suggest(next, null, 'kg', at(2026, 10, 19)).targetWeightKg).toBe(95);
  });

  it('custom: a forward reps change edits the current week of the cycle', () => {
    const r = adjustTarget(custom, { weightKg: null, reps: 5 }, 'forward', at(2026, 10, 12));
    expect(r.routineExercise).toEqual({
      targetWeightKg: null,
      targetReps: 5,
      customWeeks: [
        { reps: 8, percent: 70 },
        { reps: 5, percent: 80 },
        { reps: 4, percent: 90 },
      ],
    });
    expect(weeks[1].reps).toBe(6); // ไม่แก้ array เดิม
  });

  it('custom without weeks only persists the target', () => {
    expect(
      adjustTarget({ ...custom, customWeeks: null }, { weightKg: 70, reps: 8 }, 'forward', NOW)
        .routineExercise,
    ).toEqual({ targetWeightKg: 70, targetReps: 8 });
  });
});

describe('preferredWeightStepKg (default step for new exercises)', () => {
  it('keeps a stored step that belongs to the current unit', () => {
    expect(preferredWeightStepKg('kg', 1.25)).toBe(1.25);
    const lbSmall = weightStepOptionsKg('lb')[1];
    expect(preferredWeightStepKg('lb', lbSmall)).toBe(lbSmall);
  });
  it('falls back to the unit default when the stored step does not fit', () => {
    expect(preferredWeightStepKg('lb', 2.5)).toBe(defaultWeightStepKg('lb'));
    expect(preferredWeightStepKg('kg', null)).toBe(2.5);
    expect(preferredWeightStepKg('kg', 3)).toBe(2.5);
  });
  it('lists options converted to kg', () => {
    expect(weightStepOptionsKg('kg')).toEqual([2.5, 1.25]);
    expect(weightStepOptionsKg('lb')[0]).toBeCloseTo(2.268, 3);
  });
});
