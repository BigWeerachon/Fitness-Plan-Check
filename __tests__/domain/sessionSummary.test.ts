import { describe, expect, it } from '@jest/globals';
import {
  isExerciseComplete,
  restRemainingSec,
  restSecondsFor,
  sessionDurationSec,
  sessionTotals,
} from '@/domain/sessionSummary';

describe('session summary (G1)', () => {
  it('totals done sets, volume, progress and muscles done/remaining', () => {
    const t = sessionTotals([
      { muscleGroup: 'chest', weightKg: 60, reps: 10, done: true },
      { muscleGroup: 'chest', weightKg: 60, reps: 8, done: true },
      { muscleGroup: 'triceps', weightKg: 20, reps: 12, done: false },
      { muscleGroup: 'core', weightKg: null, reps: 15, done: true },
    ]);
    expect(t).toEqual({
      setsDone: 3,
      setsTotal: 4,
      volumeKg: 1080,
      musclesDone: ['chest', 'core'],
      musclesRemaining: ['triceps'],
      progress: 0.75,
    });
    expect(sessionTotals([]).progress).toBe(0);
  });

  it('an exercise is complete when every set is ticked', () => {
    expect(isExerciseComplete([{ done: true }, { done: true }])).toBe(true);
    expect(isExerciseComplete([{ done: true }, { done: false }])).toBe(false);
    expect(isExerciseComplete([])).toBe(false);
  });

  it('computes durations and rest timers from wall-clock timestamps', () => {
    expect(sessionDurationSec(1000, 3_601_000)).toBe(3600);
    expect(sessionDurationSec(5000, 1000)).toBe(0);
    expect(restRemainingSec(10_000, 8_200)).toBe(2);
    expect(restRemainingSec(10_000, 12_000)).toBe(0);
    expect(restRemainingSec(null, 0)).toBe(0);
  });

  it('per-exercise rest overrides the default; disabled timer = 0 unless the exercise sets its own', () => {
    expect(restSecondsFor(null, 90, true)).toBe(90);
    expect(restSecondsFor(null, 90, false)).toBe(0);
    expect(restSecondsFor(120, 90, false)).toBe(120);
    expect(restSecondsFor(0, 90, true)).toBe(0);
  });
});
