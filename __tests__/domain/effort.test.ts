import { describe, expect, it } from '@jest/globals';
import { parseEffort } from '@/domain/effort';

describe('parseEffort', () => {
  it('treats empty input as not set', () => {
    expect(parseEffort('', 'rir')).toEqual({ ok: true, value: null });
    expect(parseEffort('  ', 'rpe')).toEqual({ ok: true, value: null });
  });

  it('accepts RIR as a whole number from 0 to 10', () => {
    expect(parseEffort('0', 'rir')).toEqual({ ok: true, value: 0 });
    expect(parseEffort('10', 'rir')).toEqual({ ok: true, value: 10 });
    for (const bad of ['11', '-1', '1.5', 'abc', '2 3']) expect(parseEffort(bad, 'rir').ok).toBe(false);
  });

  it('accepts RPE from 1 to 10 in half steps', () => {
    expect(parseEffort('1', 'rpe')).toEqual({ ok: true, value: 1 });
    expect(parseEffort('7.5', 'rpe')).toEqual({ ok: true, value: 7.5 });
    expect(parseEffort('7,5', 'rpe')).toEqual({ ok: true, value: 7.5 });
    expect(parseEffort('10', 'rpe')).toEqual({ ok: true, value: 10 });
    for (const bad of ['0', '50', '10.5', '7.3', '-2', 'x']) expect(parseEffort(bad, 'rpe').ok).toBe(false);
  });
});
