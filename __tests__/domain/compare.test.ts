import { describe, expect, it } from '@jest/globals';
import { compareStrings } from '@/domain/compare';

describe('compareStrings', () => {
  it('returns -1, 0, 1 by code unit order', () => {
    expect(compareStrings('a', 'b')).toBe(-1);
    expect(compareStrings('b', 'a')).toBe(1);
    expect(compareStrings('a', 'a')).toBe(0);
  });

  it('is locale independent: uppercase sorts before lowercase', () => {
    expect(compareStrings('B', 'a')).toBe(-1);
  });

  it('orders YYYY-MM-DD dates chronologically', () => {
    expect(compareStrings('2026-01-31', '2026-02-01')).toBe(-1);
    expect(compareStrings('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('sorts arrays when used as a comparator', () => {
    expect(['b', 'c', 'a'].sort(compareStrings)).toEqual(['a', 'b', 'c']);
  });
});
