import { describe, expect, it } from '@jest/globals';
import {
  addDays,
  diffDays,
  isLocalDate,
  parseLocalDate,
  startOfWeek,
  toLocalDate,
  weekdayOf,
} from '@/domain/dates';

describe('local dates', () => {
  it('formats and parses local dates', () => {
    expect(toLocalDate(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09');
    expect(parseLocalDate('2026-10-09').getDate()).toBe(9);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-02-28')).toBe(true);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-12-25', '2027-01-01')).toBe(7);
  });

  it('computes weekdays and week starts (Mon or Sun)', () => {
    expect(weekdayOf('2026-10-09')).toBe(5); // ศุกร์
    expect(startOfWeek('2026-10-09', 1)).toBe('2026-10-05');
    expect(startOfWeek('2026-10-09', 0)).toBe('2026-10-04');
    expect(startOfWeek('2026-10-05', 1)).toBe('2026-10-05');
    expect(startOfWeek('2026-10-04', 1)).toBe('2026-09-28');
  });
});
