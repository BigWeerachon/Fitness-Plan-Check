import { describe, expect, it } from '@jest/globals';
import {
  copyDay,
  estimateSessionMinutes,
  resolveDayPlan,
  resolveWeek,
  routinesOnWeekday,
  toggleDay,
  weekDates,
  weekDaysOrdered,
  WORK_SEC_PER_SET,
  type OverrideEntry,
  type PlanEntry,
} from '@/domain/schedule';

// 0 = อาทิตย์ … 6 = เสาร์ — 2026-10-05 เป็นวันจันทร์
const push: PlanEntry = { routineId: 'push', days: [1, 4], enabled: true, sortOrder: 0 };
const pull: PlanEntry = { routineId: 'pull', days: [3], enabled: true, sortOrder: 1 };
const legs: PlanEntry = { routineId: 'legs', days: [5], enabled: false, sortOrder: 2 };
const core: PlanEntry = { routineId: 'core', days: [1, 6], enabled: true, sortOrder: -1 };
const arms: PlanEntry = { routineId: 'arms', days: [6], enabled: true, sortOrder: 5 };
const entries = [push, pull, legs, core, arms];

const plan = (date: string, overrides: OverrideEntry[] = []) => resolveDayPlan({ entries, overrides, date });

describe('resolveDayPlan from the weekly plan', () => {
  it.each([
    ['2026-10-05', 'Mon', ['core', 'push']],
    ['2026-10-06', 'Tue', []],
    ['2026-10-07', 'Wed', ['pull']],
    ['2026-10-08', 'Thu', ['push']],
    ['2026-10-09', 'Fri (only a disabled routine)', []],
    ['2026-10-10', 'Sat', ['core', 'arms']],
    ['2026-10-11', 'Sun', []],
  ])('%s %s → %p', (date, _label, routineIds) => {
    expect(plan(date)).toEqual({
      kind: routineIds.length > 0 ? 'routines' : 'rest',
      routineIds,
      source: 'plan',
    });
  });

  it('repeats the same routine on several days (Push on Mon and Thu)', () => {
    expect(plan('2026-10-05').routineIds).toContain('push');
    expect(plan('2026-10-08').routineIds).toEqual(['push']);
    expect(plan('2026-10-12').routineIds).toEqual(['core', 'push']); // จันทร์ถัดไป
  });

  it('works across month, year and leap-day boundaries', () => {
    expect(plan('2026-10-31').routineIds).toEqual(['core', 'arms']); // เสาร์
    expect(plan('2026-11-01').kind).toBe('rest'); // อาทิตย์
    expect(plan('2026-11-02').routineIds).toEqual(['core', 'push']); // จันทร์
    expect(plan('2026-12-31').routineIds).toEqual(['push']); // พฤหัส
    expect(plan('2027-01-01').kind).toBe('rest'); // ศุกร์
    expect(plan('2027-01-02').routineIds).toEqual(['core', 'arms']); // เสาร์
    expect(plan('2028-02-29').kind).toBe('rest'); // อังคาร
  });

  it('ignores disabled and deleted rows', () => {
    expect(
      resolveDayPlan({ entries: [{ ...legs, enabled: true }], overrides: [], date: '2026-10-09' }),
    ).toEqual({
      kind: 'routines',
      routineIds: ['legs'],
      source: 'plan',
    });
    expect(
      resolveDayPlan({ entries: [{ ...push, deletedAt: 123 }], overrides: [], date: '2026-10-05' }).kind,
    ).toBe('rest');
  });

  it('lists a routine once even if two rows hold it, keeping input order for equal sortOrder', () => {
    const rows: PlanEntry[] = [
      { routineId: 'b', days: [2], enabled: true, sortOrder: 0 },
      { routineId: 'a', days: [2], enabled: true, sortOrder: 0 },
      { routineId: 'b', days: [2], enabled: true, sortOrder: 3 },
    ];
    expect(routinesOnWeekday(rows, 2)).toEqual(['b', 'a']);
  });

  it('is rest when there is no plan at all', () => {
    expect(resolveDayPlan({ entries: [], overrides: [], date: '2026-10-05' })).toEqual({
      kind: 'rest',
      routineIds: [],
      source: 'plan',
    });
  });
});

describe('day overrides take precedence without touching the plan', () => {
  it('rest on a training day', () => {
    expect(plan('2026-10-05', [{ date: '2026-10-05', kind: 'rest', routineId: null }])).toEqual({
      kind: 'rest',
      routineIds: [],
      source: 'override',
    });
  });

  it('another routine instead (even one disabled in the plan)', () => {
    expect(plan('2026-10-06', [{ date: '2026-10-06', kind: 'routine', routineId: 'legs' }])).toEqual({
      kind: 'routines',
      routineIds: ['legs'],
      source: 'override',
    });
    expect(
      plan('2026-10-05', [{ date: '2026-10-05', kind: 'routine', routineId: 'pull' }]).routineIds,
    ).toEqual(['pull']);
  });

  it('empty session', () => {
    expect(plan('2026-10-07', [{ date: '2026-10-07', kind: 'empty', routineId: null }])).toEqual({
      kind: 'empty',
      routineIds: [],
      source: 'override',
    });
  });

  it('only affects its own date; the same weekday next week follows the plan', () => {
    const overrides: OverrideEntry[] = [{ date: '2026-10-05', kind: 'rest', routineId: null }];
    expect(plan('2026-10-12', overrides)).toEqual({
      kind: 'routines',
      routineIds: ['core', 'push'],
      source: 'plan',
    });
    expect(plan('2026-10-06', overrides).source).toBe('plan');
  });

  it('ignores deleted overrides and routine overrides without a routine', () => {
    expect(
      plan('2026-10-05', [
        { date: '2026-10-05', kind: 'rest', routineId: null, deletedAt: 5 },
        { date: '2026-10-05', kind: 'routine', routineId: null },
      ]),
    ).toEqual({ kind: 'routines', routineIds: ['core', 'push'], source: 'plan' });
  });

  it('uses the most recently updated override when a date has several (later row wins a tie)', () => {
    const rows: OverrideEntry[] = [
      { date: '2026-10-05', kind: 'routine', routineId: 'pull', updatedAt: 200 },
      { date: '2026-10-05', kind: 'rest', routineId: null, updatedAt: 100 },
    ];
    expect(plan('2026-10-05', rows).routineIds).toEqual(['pull']);
    expect(
      plan('2026-10-05', [...rows, { date: '2026-10-05', kind: 'empty', routineId: null, updatedAt: 200 }])
        .kind,
    ).toBe('empty');
  });

  it('falls back to the later row when overrides carry no update time', () => {
    const rows: OverrideEntry[] = [
      { date: '2026-10-05', kind: 'rest', routineId: null },
      { date: '2026-10-05', kind: 'routine', routineId: 'arms' },
    ];
    expect(plan('2026-10-05', rows)).toEqual({ kind: 'routines', routineIds: ['arms'], source: 'override' });
  });

  it('works for overrides across a year boundary', () => {
    const overrides: OverrideEntry[] = [{ date: '2027-01-01', kind: 'routine', routineId: 'push' }];
    expect(plan('2027-01-01', overrides)).toMatchObject({ routineIds: ['push'], source: 'override' });
    expect(plan('2026-12-31', overrides).source).toBe('plan');
  });
});

describe('resolveWeek', () => {
  it('returns the 7 days of the week (Monday start) with overrides applied', () => {
    const week = resolveWeek({
      entries,
      overrides: [{ date: '2026-10-07', kind: 'rest', routineId: null }],
      date: '2026-10-09',
      weekStart: 1,
    });
    expect(week.map((d) => d.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(week.map((d) => `${d.plan.kind}/${d.plan.source}`)).toEqual([
      'routines/plan',
      'rest/plan',
      'rest/override',
      'routines/plan',
      'rest/plan',
      'routines/plan',
      'rest/plan',
    ]);
  });

  it('starts on Sunday when configured', () => {
    expect(resolveWeek({ entries, overrides: [], date: '2026-10-09', weekStart: 0 })[0].date).toBe(
      '2026-10-04',
    );
  });
});

describe('editing the week plan', () => {
  it('toggleDay turns a day on and off, keeping days sorted and unique', () => {
    expect(toggleDay([1, 4], 3)).toEqual([1, 3, 4]);
    expect(toggleDay([1, 3, 4], 3)).toEqual([1, 4]);
    expect(toggleDay([], 0)).toEqual([0]);
    expect(toggleDay([4, 1, 1], 6)).toEqual([1, 4, 6]);
  });

  it('toggleDay does not mutate its input and rejects invalid days', () => {
    const days = [1, 4];
    toggleDay(days, 1);
    expect(days).toEqual([1, 4]);
    expect(() => toggleDay(days, 7)).toThrow(RangeError);
    expect(() => toggleDay(days, -1)).toThrow(RangeError);
    expect(() => toggleDay(days, 1.5)).toThrow(RangeError);
  });

  it('copyDay makes the target day hold exactly the source day’s routines', () => {
    // จันทร์ = {push, core} → เสาร์ (เดิม {core, arms})
    const next = copyDay(entries, 1, 6);
    expect(next.map((e) => [e.routineId, e.days])).toEqual([
      ['push', [1, 4, 6]],
      ['pull', [3]],
      ['legs', [5]],
      ['core', [1, 6]],
      ['arms', []],
    ]);
    expect(routinesOnWeekday(next, 6)).toEqual(routinesOnWeekday(entries, 1));
  });

  it('copyDay returns the same object for unchanged rows so only changes get saved', () => {
    const next = copyDay(entries, 1, 6);
    expect(next[0]).not.toBe(push);
    expect(next[1]).toBe(pull);
    expect(next[3]).toBe(core);
    expect(next[4]).not.toBe(arms);
    expect(push.days).toEqual([1, 4]); // ของเดิมไม่ถูกแก้
    expect(copyDay(entries, 2, 2).every((e, i) => e === entries[i])).toBe(true);
  });

  it('copyDay also copies disabled rows so re-enabling stays consistent', () => {
    const next = copyDay(entries, 5, 2);
    expect(next[2].days).toEqual([2, 5]);
    expect(resolveDayPlan({ entries: next, overrides: [], date: '2026-10-06' }).kind).toBe('rest');
  });

  it('copyDay copies a rest day by clearing the target day', () => {
    const next = copyDay(entries, 0, 1);
    expect(routinesOnWeekday(next, 1)).toEqual([]);
    expect(() => copyDay(entries, 0, 8)).toThrow(RangeError);
  });
});

describe('week ordering and dates', () => {
  it('orders weekdays from the configured week start', () => {
    expect(weekDaysOrdered(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekDaysOrdered(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(() => weekDaysOrdered(7)).toThrow(RangeError);
  });

  it('lists the dates of a week across month and year boundaries', () => {
    expect(weekDates('2026-12-31', 1)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
    expect(weekDates('2026-11-01', 1)[0]).toBe('2026-10-26');
    expect(weekDates('2026-11-01', 0)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
  });
});

describe('estimateSessionMinutes', () => {
  it('assumes 45 s of work per set plus the rest after every set except the last', () => {
    expect(WORK_SEC_PER_SET).toBe(45);
    // 9 เซ็ต × (45 + 90) − 90 = 1125 วิ = 18.75 นาที
    const ex = { sets: 3, restSec: 90 };
    expect(estimateSessionMinutes([ex, ex, ex], 90)).toBe(19);
  });

  it('uses the default rest for exercises without their own and 0 when the timer is off', () => {
    // 10 เซ็ต × 45 = 450 + พัก 3×90 + 3×60 + 4×0 = 450 → 900 วิ = 15 นาที
    expect(
      estimateSessionMinutes(
        [
          { sets: 3, restSec: null },
          { sets: 3, restSec: 60 },
          { sets: 4, restSec: 0 },
        ],
        90,
      ),
    ).toBe(15);
  });

  it('skips exercises without sets when finding the last rest', () => {
    // 3 × 135 − 90 = 315 วิ = 5.25 นาที
    expect(
      estimateSessionMinutes(
        [
          { sets: 3, restSec: 90 },
          { sets: 0, restSec: 300 },
        ],
        120,
      ),
    ).toBe(5);
  });

  it('returns at least 1 minute when there is any set, and 0 when there is none', () => {
    expect(estimateSessionMinutes([{ sets: 1, restSec: 90 }], 90)).toBe(1);
    expect(estimateSessionMinutes([{ sets: 1, restSec: -30 }], 90)).toBe(1);
    expect(estimateSessionMinutes([], 90)).toBe(0);
    expect(estimateSessionMinutes([{ sets: 0, restSec: 90 }], 90)).toBe(0);
  });
});
