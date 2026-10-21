import { describe, expect, it } from '@jest/globals';
import { getBuiltIn } from '@/data/exerciseLibrary';
import { PROGRAM_TEMPLATES, trainingDaysPerWeek } from '@/data/templates';

const TYPES = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'other'];

describe('program templates (SPEC F4, F5)', () => {
  it('provides PPL 3 & 6 days, Upper/Lower, Full Body 3, Bro Split and 5x5', () => {
    expect(PROGRAM_TEMPLATES.map((t) => t.key)).toEqual([
      'ppl3',
      'ppl6',
      'upper_lower',
      'full_body3',
      'bro_split',
      'starter_5x5',
    ]);
    const days = Object.fromEntries(PROGRAM_TEMPLATES.map((t) => [t.key, trainingDaysPerWeek(t)]));
    expect(days).toEqual({ ppl3: 3, ppl6: 6, upper_lower: 4, full_body3: 3, bro_split: 5, starter_5x5: 3 });
  });

  it.each(PROGRAM_TEMPLATES.map((t) => [t.key, t] as const))('%s is valid', (_key, t) => {
    expect(t.name.en && t.name.th && t.description.en && t.description.th).toBeTruthy();
    const keys = t.routines.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of t.routines) {
      expect(TYPES).toContain(r.type);
      expect(r.days.length).toBeGreaterThan(0);
      for (const d of r.days) expect(d >= 0 && d <= 6).toBe(true);
      expect(r.exercises.length).toBeGreaterThan(0);
      for (const ex of r.exercises) {
        expect([ex.exerciseId, !!getBuiltIn(ex.exerciseId)]).toEqual([ex.exerciseId, true]);
        expect(ex.sets).toBeGreaterThan(0);
        expect(ex.repMin).toBeLessThanOrEqual(ex.repMax);
        expect(ex.restSec).toBeGreaterThan(0);
      }
    }
  });

  it('PPL tags routines push/pull/legs automatically (used by stats I2)', () => {
    const ppl = PROGRAM_TEMPLATES.find((t) => t.key === 'ppl3')!;
    expect(ppl.routines.map((r) => r.type)).toEqual(['push', 'pull', 'legs']);
  });

  it('5x5 uses linear progression with 5 reps', () => {
    const t = PROGRAM_TEMPLATES.find((x) => x.key === 'starter_5x5')!;
    for (const r of t.routines)
      for (const e of r.exercises)
        expect(e).toMatchObject({ progressionMode: 'linear', repMin: 5, repMax: 5 });
  });
});
