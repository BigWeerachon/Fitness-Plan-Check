import { describe, expect, it } from '@jest/globals';
import { previousSetFor, resizeSets, retargetSet } from '@/domain/sessionEdit';

const pending = (over: Partial<Parameters<typeof retargetSet>[0]> = {}) => ({
  done: false,
  weightKg: 60,
  reps: 8,
  targetWeightKg: 60,
  targetReps: 8,
  ...over,
});

describe('retargetSet (G2 change target mid-workout)', () => {
  const target = { targetWeightKg: 65, targetReps: 6 };

  it('prefills untouched sets (values still equal the previous target)', () => {
    expect(retargetSet(pending(), target)).toEqual({
      targetWeightKg: 65,
      targetReps: 6,
      weightKg: 65,
      reps: 6,
    });
  });

  it('prefills empty values', () => {
    expect(retargetSet(pending({ weightKg: null, reps: null }), target)).toEqual({
      targetWeightKg: 65,
      targetReps: 6,
      weightKg: 65,
      reps: 6,
    });
  });

  it('keeps values the user already typed, field by field', () => {
    expect(retargetSet(pending({ weightKg: 62.5 }), target)).toEqual({
      targetWeightKg: 65,
      targetReps: 6,
      reps: 6,
    });
    expect(retargetSet(pending({ reps: 10 }), target)).toEqual({
      targetWeightKg: 65,
      targetReps: 6,
      weightKg: 65,
    });
    expect(retargetSet(pending({ weightKg: 70, reps: 5 }), target)).toEqual({
      targetWeightKg: 65,
      targetReps: 6,
    });
  });

  it('treats tiny float differences (lb ↔ kg) as untouched', () => {
    expect(retargetSet(pending({ weightKg: 60.0000001 }), target)?.weightKg).toBe(65);
  });

  it('handles targets without weight (bodyweight)', () => {
    const bw = pending({ weightKg: null, targetWeightKg: null, reps: 12, targetReps: 12 });
    expect(retargetSet(bw, { targetWeightKg: null, targetReps: 15 })).toEqual({
      targetWeightKg: null,
      targetReps: 15,
      weightKg: null,
      reps: 15,
    });
    // ผู้ใช้ใส่น้ำหนักเสริมเอง (เช่น เวสต์ถ่วง) → ไม่ถูกล้าง
    expect(retargetSet({ ...bw, weightKg: 10 }, { targetWeightKg: null, targetReps: 15 })).toEqual({
      targetWeightKg: null,
      targetReps: 15,
      reps: 15,
    });
  });

  it('never touches done sets', () => {
    expect(retargetSet(pending({ done: true }), target)).toBeNull();
  });
});

describe('resizeSets (change the number of sets mid-workout)', () => {
  const sets = (...done: boolean[]) => done.map((d, i) => ({ id: `s${i}`, done: d }));

  it('adds sets at the end when there are fewer than wanted', () => {
    expect(resizeSets(sets(true, false), 4)).toEqual({ add: 2, removeIds: [] });
    expect(resizeSets(sets(false, false, false), 3)).toEqual({ add: 0, removeIds: [] });
  });

  it('removes not-done sets from the end', () => {
    expect(resizeSets(sets(true, false, false, false), 2)).toEqual({ add: 0, removeIds: ['s3', 's2'] });
  });

  it('never removes done sets (may stay above the wanted count)', () => {
    expect(resizeSets(sets(true, false, true), 1)).toEqual({ add: 0, removeIds: ['s1'] });
    expect(resizeSets(sets(true, true, true), 2)).toEqual({ add: 0, removeIds: [] });
  });

  it('keeps at least one set', () => {
    expect(resizeSets(sets(false, false), 0)).toEqual({ add: 0, removeIds: ['s1'] });
    expect(resizeSets([], 0)).toEqual({ add: 1, removeIds: [] });
  });
});

describe('previousSetFor', () => {
  const previous = [
    { weightKg: 60, reps: 10 },
    { weightKg: 62.5, reps: 8 },
  ];

  it('returns the previous set at the same index', () => {
    expect(previousSetFor(previous, 0)).toBe(previous[0]);
    expect(previousSetFor(previous, 1)).toBe(previous[1]);
  });

  it('falls back to the last previous set when there are more sets now than before', () => {
    expect(previousSetFor(previous, 2)).toBe(previous[1]);
  });

  it('returns undefined without history', () => {
    expect(previousSetFor([], 0)).toBeUndefined();
  });
});
