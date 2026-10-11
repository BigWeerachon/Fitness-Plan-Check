import { afterAll, describe, expect, it } from '@jest/globals';
import { groupLabels, sessionLine } from '@/features/stats/labels';
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
