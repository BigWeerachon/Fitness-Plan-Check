import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { setLanguage } from '@/i18n';
import { formatDateLong, formatDateShort, formatRelativeDay } from '@/i18n/format';
import { setClockForTests } from '@/utils/clock';

const TODAY = new Date(2026, 9, 13);
const daysFromToday = (offset: number) => new Date(2026, 9, 13 + offset);

describe('formatRelativeDay', () => {
  beforeAll(() => setLanguage('en'));
  afterEach(() => setClockForTests(null));

  it('labels today, yesterday, days and weeks', () => {
    expect(formatRelativeDay(TODAY, TODAY)).toBe('Today');
    expect(formatRelativeDay(daysFromToday(-1), TODAY)).toBe('Yesterday');
    expect(formatRelativeDay(daysFromToday(-3), TODAY)).toBe('3 days ago');
    expect(formatRelativeDay(daysFromToday(-6), TODAY)).toBe('6 days ago');
    expect(formatRelativeDay(daysFromToday(-7), TODAY)).toBe('1 week ago');
    expect(formatRelativeDay(daysFromToday(-27), TODAY)).toBe('3 weeks ago');
  });

  it('falls back to a short date after four weeks', () => {
    const old = daysFromToday(-28);
    expect(formatRelativeDay(old, TODAY)).toBe(formatDateShort(old, TODAY));
  });

  it('shows a future date as a date, never as a negative number of days', () => {
    const future = daysFromToday(3);
    const label = formatRelativeDay(future, TODAY);
    expect(label).toBe(formatDateShort(future, TODAY));
    expect(label).not.toContain('-');
  });

  it('uses the app clock when no reference date is given', () => {
    setClockForTests(() => new Date(2026, 9, 20, 12).getTime());
    expect(formatRelativeDay(TODAY)).toBe('1 week ago');
  });
});

describe('date formats follow the current language', () => {
  afterEach(() => setLanguage('en'));

  it('English', () => {
    setLanguage('en');
    expect(formatDateLong(TODAY)).toBe('Oct 13, 2026');
    expect(formatDateShort(TODAY, TODAY)).toBe('Tue, Oct 13');
  });

  it('Thai uses the Buddhist year', () => {
    setLanguage('th');
    expect(formatDateLong(TODAY)).toContain('2569');
    expect(formatDateShort(TODAY, TODAY)).not.toContain('2569');
  });
});
