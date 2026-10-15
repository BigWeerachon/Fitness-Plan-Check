import { describe, expect, it } from '@jest/globals';
import type { RoutineExercise } from '@/db/schema';
import {
  buildSettingsPatch,
  defaultCustomWeeks,
  MIN_SAVED_REST_SEC,
  restChoiceOf,
  restSecOf,
  type ExerciseSettingsForm,
} from '@/domain/exerciseSettings';
import { KG_PER_LB } from '@/domain/units';

const NOW = 1_800_000_000_000;

const current = {
  progressionMode: 'double',
  failStreak: 2,
  progressionStartedAt: null,
  customWeeks: [{ reps: 8, percent: 100 }],
  baseWeightKg: 40,
} as unknown as RoutineExercise;

const form: ExerciseSettingsForm = {
  sets: 4,
  repMin: 12,
  repMax: 6,
  mode: 'double',
  step: 2.5,
  rir: null,
  rpe: 8,
  restChoice: 'default',
  customRestSec: 90,
  weeks: [{ reps: 10, percent: 100 }],
  baseWeight: null,
};

describe('rest choice mapping', () => {
  it('maps the stored value to a choice (null = default, 0 = off, positive = custom)', () => {
    expect(restChoiceOf(null)).toBe('default');
    expect(restChoiceOf(0)).toBe('off');
    expect(restChoiceOf(45)).toBe('custom');
  });

  it('maps a choice back to the stored value and never saves below the minimum', () => {
    expect(restSecOf('default', 90)).toBeNull();
    expect(restSecOf('off', 90)).toBe(0);
    expect(restSecOf('custom', 120)).toBe(120);
    expect(restSecOf('custom', 2)).toBe(MIN_SAVED_REST_SEC);
    expect(restSecOf('custom', 7)).toBe(7);
  });

  it('round-trips every stored value', () => {
    for (const stored of [null, 0, 30, 90]) {
      expect(restSecOf(restChoiceOf(stored), stored ?? 90)).toBe(stored);
    }
  });
});

describe('defaultCustomWeeks', () => {
  it('starts at the top of the rep range and adds weight as reps drop', () => {
    expect(defaultCustomWeeks(6, 10)).toEqual([
      { reps: 10, percent: 100 },
      { reps: 8, percent: 105 },
      { reps: 6, percent: 110 },
    ]);
  });

  it('never goes below the minimum reps', () => {
    expect(defaultCustomWeeks(9, 10)[1].reps).toBe(9);
  });
});

describe('buildSettingsPatch', () => {
  it('orders the rep range, keeps the progression state and converts the step for lb', () => {
    const patch = buildSettingsPatch(current, { ...form, step: 5 }, 'lb', NOW);
    expect(patch).toMatchObject({
      sets: 4,
      repMin: 6,
      repMax: 12,
      progressionMode: 'double',
      failStreak: 2,
      progressionStartedAt: null,
      rir: null,
      rpe: 8,
      restSec: null,
      customWeeks: current.customWeeks,
      baseWeightKg: 40,
    });
    expect(patch.weightStepKg).toBeCloseTo(5 * KG_PER_LB, 10);
  });

  it('starts the custom cycle now when switching to custom and saves the weeks', () => {
    const patch = buildSettingsPatch(current, { ...form, mode: 'custom', baseWeight: 100 }, 'kg', NOW);
    expect(patch).toMatchObject({
      progressionMode: 'custom',
      failStreak: 0,
      progressionStartedAt: NOW,
      customWeeks: form.weeks,
      baseWeightKg: 100,
      weightStepKg: 2.5,
    });
  });

  it('keeps the stored base weight unless a positive value is entered, and converts lb', () => {
    expect(buildSettingsPatch(current, { ...form, baseWeight: 0 }, 'kg', NOW).baseWeightKg).toBe(40);
    expect(buildSettingsPatch(current, { ...form, baseWeight: 100 }, 'lb', NOW).baseWeightKg).toBeCloseTo(
      100 * KG_PER_LB,
      10,
    );
  });

  it('saves the custom rest clamped to the minimum', () => {
    const patch = buildSettingsPatch(current, { ...form, restChoice: 'custom', customRestSec: 3 }, 'kg', NOW);
    expect(patch.restSec).toBe(MIN_SAVED_REST_SEC);
  });
});
