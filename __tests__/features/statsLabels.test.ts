import { afterAll, describe, expect, it } from '@jest/globals';
import {
  buildShareItems,
  groupLabels,
  parseRangeParams,
  periodLabel,
  rangeText,
  sessionLine,
} from '@/features/stats/labels';
import type { BreakdownView } from '@/features/stats/statsView';
import { setLanguage, t } from '@/i18n';

afterAll(() => setLanguage('en'));

const fmt = (d: string) => `d:${d}`;

describe('sessionLine (I1)', () => {
  it('uses singular forms for one exercise / one set', () => {
    setLanguage('en');
    expect(sessionLine(t, { exercises: 1, sets: 1, volumeKg: 500 }, 'kg')).toBe(
      '1 exercise · 1 set · 500 kg',
    );
    expect(sessionLine(t, { exercises: 0, sets: 0, volumeKg: 0 }, 'kg')).toBe('0 exercises · 0 sets · 0 kg');
  });

  it('uses plural forms otherwise and converts the unit', () => {
    setLanguage('en');
    expect(sessionLine(t, { exercises: 2, sets: 5, volumeKg: 100 }, 'lb')).toBe(
      '2 exercises · 5 sets · 221 lb',
    );
  });

  it('reads naturally in Thai', () => {
    setLanguage('th');
    expect(sessionLine(t, { exercises: 1, sets: 1, volumeKg: 500 }, 'kg')).toBe('1 ท่า · 1 เซ็ต · 500 กก.');
  });
});

describe('groupLabels (I5)', () => {
  const g = (key: string, programName: string | null, lastDate: string) => ({ key, programName, lastDate });

  it('keeps unique names untouched and names the no-program group', () => {
    const labels = groupLabels(
      [g('a', 'PPL', '2026-10-05'), g('none', null, '2026-10-01')],
      'No program',
      fmt,
    );
    expect(labels.get('a')).toBe('PPL');
    expect(labels.get('none')).toBe('No program');
  });

  it('adds the last-trained date to groups that share a name', () => {
    const labels = groupLabels(
      [g('a', 'PPL', '2026-10-05'), g('b', 'PPL', '2026-10-06'), g('c', 'Other', '2026-10-06')],
      'No program',
      fmt,
    );
    expect(labels.get('a')).toBe('PPL · d:2026-10-05');
    expect(labels.get('b')).toBe('PPL · d:2026-10-06');
    expect(labels.get('c')).toBe('Other');
  });

  it('still separates groups that share both name and date', () => {
    const labels = groupLabels([g('a', 'PPL', '2026-10-05'), g('b', 'PPL', '2026-10-05')], 'No program', fmt);
    expect(labels.get('a')).toBe('PPL · d:2026-10-05');
    expect(labels.get('b')).toBe('PPL · d:2026-10-05 (2)');
    expect(new Set(labels.values()).size).toBe(2);
  });

  it('treats a program literally named like the no-program label as a duplicate of it', () => {
    const labels = groupLabels(
      [g('a', 'No program', '2026-10-05'), g('none', null, '2026-10-04')],
      'No program',
      fmt,
    );
    expect(new Set(labels.values()).size).toBe(2);
  });
});

describe('buildShareItems (I2)', () => {
  const colors = ['#c1', '#c2'];
  const ctx = (metric: 'sets' | 'volume' = 'sets') => ({
    t,
    metric,
    unit: 'kg' as const,
    chartColors: colors,
    groupLabel: (key: string, name: string | null) => `g:${key}:${name}`,
  });

  it('returns null while the routine-type view still needs a group', () => {
    expect(buildShareItems({ view: 'needsGroup' }, ctx())).toBeNull();
  });

  it('labels program shares with the disambiguated group label and cycles chart colours', () => {
    setLanguage('en');
    const breakdown: BreakdownView = {
      view: 'program',
      breakdown: {
        metric: 'sets',
        total: 6,
        entries: [
          { key: 'a', programId: 'a', programName: 'PPL', value: 3, percent: 50 },
          { key: 'b', programId: 'b', programName: null, value: 2, percent: 33 },
          { key: 'c', programId: 'c', programName: 'X', value: 1, percent: 17 },
        ],
      },
    };
    const result = buildShareItems(breakdown, ctx())!;
    expect(result.total).toBe(6);
    expect(result.items.map((i) => [i.key, i.label, i.color, i.valueLabel])).toEqual([
      ['a', 'g:a:PPL', '#c1', '3 sets'],
      ['b', 'g:b:null', '#c2', '2 sets'],
      ['c', 'g:c:X', '#c1', '1 set'],
    ]);
  });

  it('labels routine types and muscles from translations', () => {
    setLanguage('en');
    const routineType = buildShareItems(
      {
        view: 'routineType',
        breakdown: { metric: 'sets', total: 4, entries: [{ key: 'push', value: 4, percent: 100 }] },
      },
      ctx(),
    )!;
    expect(routineType.items[0].label).toBe(t('programs.types.push'));
    const muscle = buildShareItems(
      {
        view: 'muscle',
        breakdown: { metric: 'volume', total: 500, entries: [{ key: 'chest', value: 500, percent: 100 }] },
      },
      ctx('volume'),
    )!;
    expect(muscle.items[0].label).toBe(t('exercises.muscles.chest'));
    expect(muscle.items[0].valueLabel).toBe('500 kg lifted');
    expect(muscle.total).toBe(500);
  });
});

describe('parseRangeParams (I5)', () => {
  it('accepts a complete YYYY-MM-DD range and a known period', () => {
    expect(parseRangeParams({ from: '2026-10-05', to: '2026-10-11', period: 'week' })).toEqual({
      range: { start: '2026-10-05', end: '2026-10-11' },
      period: 'week',
    });
  });

  it('ignores a missing, half or malformed range and an unknown period', () => {
    expect(parseRangeParams({})).toEqual({ range: null, period: undefined });
    expect(parseRangeParams({ from: '2026-10-05' }).range).toBeNull();
    expect(parseRangeParams({ to: '2026-10-11' }).range).toBeNull();
    expect(parseRangeParams({ from: '2026-10-05', to: 'yesterday' }).range).toBeNull();
    expect(parseRangeParams({ from: '10/05/2026', to: '2026-10-11' }).range).toBeNull();
    expect(parseRangeParams({ period: 'decade' }).period).toBeUndefined();
  });
});

describe('rangeText (I5)', () => {
  const range = { start: '2026-10-05', end: '2026-10-11' };

  it('is null without a range', () => {
    expect(rangeText(null, 'week', '2026-10-13')).toBeNull();
  });

  it('uses the period label when the period is known', () => {
    setLanguage('en');
    expect(rangeText(range, 'week', '2026-10-13')).toBe(periodLabel('week', range, '2026-10-13'));
    expect(rangeText(range, 'month', '2026-10-13')).toBe(periodLabel('month', range, '2026-10-13'));
  });

  it('falls back to "start – end" for a custom range', () => {
    setLanguage('en');
    expect(rangeText(range, undefined, '2026-10-13')).toBe('Mon, Oct 5 – Sun, Oct 11');
  });
});
