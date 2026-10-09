import { describe, expect, it } from '@jest/globals';
import { addDays, weekdayOf } from '@/domain/dates';
import {
  bucketKeyFor,
  daysInMonth,
  eachDay,
  intersectRange,
  isInRange,
  isLeapYear,
  PERIODS,
  periodBuckets,
  periodRange,
  rangeDays,
  shiftPeriod,
  type Period,
} from '@/domain/periods';

const MON = 1;
const SUN = 0;

describe('calendar helpers', () => {
  it('knows leap years (Gregorian rules)', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
  });

  it('knows month lengths', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInMonth(2026, m))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it('lists the four periods of the stats switcher', () => {
    expect(PERIODS).toEqual(['day', 'week', 'month', 'year']);
  });
});

describe('periodRange', () => {
  it('day = the anchor itself', () => {
    expect(periodRange('day', '2026-10-09')).toEqual({ start: '2026-10-09', end: '2026-10-09' });
  });

  it('week starts on Monday by default and on Sunday when configured', () => {
    // 2026-10-09 เป็นวันศุกร์
    expect(periodRange('week', '2026-10-09')).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(periodRange('week', '2026-10-09', MON)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(periodRange('week', '2026-10-09', SUN)).toEqual({ start: '2026-10-04', end: '2026-10-10' });
  });

  it('week edges: anchor on the first and last day of the week', () => {
    expect(periodRange('week', '2026-10-05', MON)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(periodRange('week', '2026-10-11', MON)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    // วันอาทิตย์: สัปดาห์เริ่มจันทร์ → เป็นวันสุดท้าย, สัปดาห์เริ่มอาทิตย์ → เป็นวันแรก
    expect(periodRange('week', '2026-10-11', SUN)).toEqual({ start: '2026-10-11', end: '2026-10-17' });
    expect(periodRange('week', '2026-10-10', SUN)).toEqual({ start: '2026-10-04', end: '2026-10-10' });
  });

  it('week crosses month and year boundaries', () => {
    // 2026-01-01 เป็นวันพฤหัสบดี
    expect(periodRange('week', '2026-01-01', MON)).toEqual({ start: '2025-12-29', end: '2026-01-04' });
    expect(periodRange('week', '2026-01-01', SUN)).toEqual({ start: '2025-12-28', end: '2026-01-03' });
    expect(periodRange('week', '2026-03-01', MON)).toEqual({ start: '2026-02-23', end: '2026-03-01' });
  });

  it('every day of a week maps to the same week, starting on the configured weekday', () => {
    for (const weekStart of [MON, SUN]) {
      const first = periodRange('week', '2026-06-17', weekStart);
      expect(weekdayOf(first.start)).toBe(weekStart);
      expect(rangeDays(first)).toBe(7);
      for (const day of eachDay(first)) expect(periodRange('week', day, weekStart)).toEqual(first);
    }
  });

  it('month covers the whole calendar month (28/29/30/31 days)', () => {
    expect(periodRange('month', '2026-01-31')).toEqual({ start: '2026-01-01', end: '2026-01-31' });
    expect(periodRange('month', '2026-02-14')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(periodRange('month', '2024-02-01')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(periodRange('month', '2026-04-30')).toEqual({ start: '2026-04-01', end: '2026-04-30' });
    expect(periodRange('month', '2026-12-01')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('year covers Jan 1 to Dec 31', () => {
    expect(periodRange('year', '2026-07-15')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    expect(rangeDays(periodRange('year', '2024-02-29'))).toBe(366);
    expect(rangeDays(periodRange('year', '2026-02-28'))).toBe(365);
  });

  it('rejects invalid anchors and week starts', () => {
    expect(() => periodRange('day', '2026-02-30')).toThrow(RangeError);
    expect(() => periodRange('month', '2026/01/01')).toThrow(RangeError);
    expect(() => periodRange('week', '2026-01-01', 7)).toThrow(RangeError);
    expect(() => periodRange('week', '2026-01-01', 1.5)).toThrow(RangeError);
  });
});

describe('shiftPeriod (browsing history)', () => {
  it('shifts days and weeks across month/year boundaries', () => {
    expect(shiftPeriod('day', '2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftPeriod('day', '2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftPeriod('week', '2026-01-01', -1)).toBe('2025-12-25');
    expect(shiftPeriod('week', '2026-10-09', 3)).toBe('2026-10-30');
    expect(shiftPeriod('day', '2026-10-09', 0)).toBe('2026-10-09');
  });

  it('shifts months and clamps the day to the target month length', () => {
    expect(shiftPeriod('month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftPeriod('month', '2024-01-31', 1)).toBe('2024-02-29');
    expect(shiftPeriod('month', '2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftPeriod('month', '2026-05-31', 1)).toBe('2026-06-30');
    expect(shiftPeriod('month', '2026-12-15', 1)).toBe('2027-01-15');
    expect(shiftPeriod('month', '2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftPeriod('month', '2026-01-15', -13)).toBe('2024-12-15');
    expect(shiftPeriod('month', '2026-01-15', 24)).toBe('2028-01-15');
  });

  it('shifts years and clamps Feb 29 in non-leap years', () => {
    expect(shiftPeriod('year', '2024-02-29', 1)).toBe('2025-02-28');
    expect(shiftPeriod('year', '2024-02-29', 4)).toBe('2028-02-29');
    expect(shiftPeriod('year', '2026-10-09', -1)).toBe('2025-10-09');
  });

  it('rejects non-integer deltas', () => {
    expect(() => shiftPeriod('month', '2026-01-01', 0.5)).toThrow(RangeError);
  });

  it('consecutive periods are contiguous with no gap or overlap', () => {
    const anchors = ['2024-02-29', '2025-12-31', '2026-01-01', '2026-03-31', '2026-10-09'];
    for (const period of PERIODS) {
      for (const weekStart of [MON, SUN]) {
        for (const anchor of anchors) {
          let current = anchor;
          for (let i = 0; i < 14; i++) {
            const range = periodRange(period, current, weekStart);
            const next = shiftPeriod(period, current, 1);
            const nextRange = periodRange(period, next, weekStart);
            expect(nextRange.start).toBe(addDays(range.end, 1));
            // ย้อนกลับ 1 ช่วงต้องได้ช่วงเดิม
            expect(periodRange(period, shiftPeriod(period, next, -1), weekStart)).toEqual(range);
            current = next;
          }
        }
      }
    }
  });
});

describe('range helpers', () => {
  const week = { start: '2026-10-05', end: '2026-10-11' };

  it('isInRange includes both ends', () => {
    expect(isInRange('2026-10-05', week)).toBe(true);
    expect(isInRange('2026-10-11', week)).toBe(true);
    expect(isInRange('2026-10-08', week)).toBe(true);
    expect(isInRange('2026-10-04', week)).toBe(false);
    expect(isInRange('2026-10-12', week)).toBe(false);
  });

  it('rangeDays and eachDay', () => {
    expect(rangeDays(week)).toBe(7);
    expect(rangeDays({ start: '2026-10-05', end: '2026-10-05' })).toBe(1);
    expect(rangeDays({ start: '2026-10-05', end: '2026-10-04' })).toBe(0);
    expect(eachDay({ start: '2026-12-30', end: '2027-01-02' })).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
    expect(eachDay({ start: '2026-10-05', end: '2026-10-04' })).toEqual([]);
  });

  it('intersectRange', () => {
    expect(intersectRange(week, { start: '2026-10-01', end: '2026-10-07' })).toEqual({
      start: '2026-10-05',
      end: '2026-10-07',
    });
    expect(intersectRange(week, { start: '2026-10-11', end: '2026-12-01' })).toEqual({
      start: '2026-10-11',
      end: '2026-10-11',
    });
    expect(intersectRange(week, { start: '2026-10-12', end: '2026-10-20' })).toBeNull();
  });

  it('bucketKeyFor groups by day, or by month for the year view', () => {
    expect(bucketKeyFor('day', '2026-10-09')).toBe('2026-10-09');
    expect(bucketKeyFor('week', '2026-10-09')).toBe('2026-10-09');
    expect(bucketKeyFor('month', '2026-10-09')).toBe('2026-10-09');
    expect(bucketKeyFor('year', '2026-10-09')).toBe('2026-10');
    expect(() => bucketKeyFor('year', 'oops')).toThrow(RangeError);
  });
});

describe('periodBuckets (bar chart columns)', () => {
  it('day → a single bucket', () => {
    expect(periodBuckets('day', '2026-10-09')).toEqual([
      { key: '2026-10-09', start: '2026-10-09', end: '2026-10-09' },
    ]);
  });

  it('week → 7 daily buckets from the configured week start', () => {
    const mon = periodBuckets('week', '2026-10-09', MON);
    expect(mon.map((b) => b.key)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    const sun = periodBuckets('week', '2026-10-09', SUN);
    expect(sun[0].key).toBe('2026-10-04');
    expect(sun[6].key).toBe('2026-10-10');
    expect(sun.every((b) => b.start === b.key && b.end === b.key)).toBe(true);
  });

  it('month → one bucket per day of the month', () => {
    expect(periodBuckets('month', '2026-02-10')).toHaveLength(28);
    expect(periodBuckets('month', '2024-02-10')).toHaveLength(29);
    expect(periodBuckets('month', '2026-04-10')).toHaveLength(30);
    const jan = periodBuckets('month', '2026-01-10');
    expect(jan).toHaveLength(31);
    expect(jan[0].key).toBe('2026-01-01');
    expect(jan[30].key).toBe('2026-01-31');
  });

  it('year → 12 monthly buckets with correct month ends', () => {
    const leap = periodBuckets('year', '2024-06-01');
    expect(leap.map((b) => b.key)).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
      '2024-06',
      '2024-07',
      '2024-08',
      '2024-09',
      '2024-10',
      '2024-11',
      '2024-12',
    ]);
    expect(leap[1]).toEqual({ key: '2024-02', start: '2024-02-01', end: '2024-02-29' });
    expect(periodBuckets('year', '2026-06-01')[1].end).toBe('2026-02-28');
    expect(leap[11]).toEqual({ key: '2024-12', start: '2024-12-01', end: '2024-12-31' });
  });

  it('buckets tile the period range exactly and match bucketKeyFor', () => {
    const cases: [Period, string][] = [
      ['day', '2026-10-09'],
      ['week', '2026-01-01'],
      ['month', '2024-02-15'],
      ['year', '2025-05-05'],
    ];
    for (const [period, anchor] of cases) {
      for (const weekStart of [MON, SUN]) {
        const range = periodRange(period, anchor, weekStart);
        const buckets = periodBuckets(period, anchor, weekStart);
        expect(buckets[0].start).toBe(range.start);
        expect(buckets[buckets.length - 1].end).toBe(range.end);
        for (let i = 1; i < buckets.length; i++) {
          expect(buckets[i].start).toBe(addDays(buckets[i - 1].end, 1));
        }
        for (const day of eachDay(range)) {
          const owner = buckets.find((b) => isInRange(day, b));
          expect(owner?.key).toBe(bucketKeyFor(period, day));
        }
      }
    }
  });
});
