import { describe, expect, it } from '@jest/globals';
import { planMerge } from '@/domain/recordMerge';

interface R {
  id: string;
  createdAt: number;
  updatedAt: number;
  age: number | null;
  goal: string | null;
}
const row = (
  id: string,
  createdAt: number,
  updatedAt: number,
  age: number | null,
  goal: string | null,
): R => ({
  id,
  createdAt,
  updatedAt,
  age,
  goal,
});

describe('planMerge (duplicate logical rows across devices)', () => {
  it('returns null when there is nothing to merge', () => {
    expect(planMerge([row('a', 1, 1, 30, null)], ['age', 'goal'])).toBeNull();
  });

  it('keeps the oldest-created row and takes each field from the most recently edited row that has it', () => {
    const plan = planMerge([row('b', 5, 20, 31, null), row('a', 1, 10, 30, 'lose')], ['age', 'goal'])!;
    expect(plan.survivorId).toBe('a');
    expect(plan.duplicateIds).toEqual(['b']);
    expect(plan.patch).toEqual({ age: 31 });
  });

  it('is deterministic regardless of input order and breaks ties by id', () => {
    const rows = [row('x', 1, 10, 40, 'gain'), row('y', 1, 10, 41, 'lose')];
    const one = planMerge(rows, ['age', 'goal']);
    const two = planMerge([...rows].reverse(), ['age', 'goal']);
    expect(one).toEqual(two);
    expect(one!.survivorId).toBe('x');
    expect(one!.patch).toEqual({ age: 41, goal: 'lose' });
  });

  it('merges three rows', () => {
    const plan = planMerge(
      [row('a', 1, 1, null, null), row('b', 2, 2, 20, null), row('c', 3, 3, null, 'gain')],
      ['age', 'goal'],
    )!;
    expect(plan.patch).toEqual({ age: 20, goal: 'gain' });
    expect(plan.duplicateIds.sort()).toEqual(['b', 'c']);
  });
});
