import { describe, expect, it } from '@jest/globals';
import {
  CSV_BOM,
  DAILY_CSV_HEADER,
  WORKOUT_CSV_HEADER,
  csvCell,
  dailyLogCsv,
  localDateTime,
  toCsv,
  workoutCsv,
} from '@/domain/csv';

const lines = (csv: string) => csv.replace(CSV_BOM, '').split('\r\n').filter(Boolean);

describe('csvCell (RFC 4180)', () => {
  it('formats primitives', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(Number.NaN)).toBe('');
    expect(csvCell(true)).toBe('true');
    expect(csvCell('Push A')).toBe('Push A');
    expect(csvCell('อก')).toBe('อก');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formulas in user text', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-abc')).toBe("'-abc");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });
});

describe('toCsv', () => {
  it('adds BOM, header and CRLF line endings', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          [1, 'x'],
          [null, 'y,z'],
        ],
      ),
    ).toBe(`${CSV_BOM}a,b\r\n1,x\r\n,"y,z"\r\n`);
  });
});

describe('localDateTime', () => {
  it('formats local time', () => {
    expect(localDateTime(new Date('2026-10-09T07:05:00').getTime())).toBe('2026-10-09 07:05');
    expect(localDateTime(null)).toBeNull();
  });
});

describe('workoutCsv', () => {
  const base = {
    status: 'completed' as const,
    deletedAt: null,
    routineType: 'push' as const,
    intensity: 'hard' as const,
    durationSec: 3630,
    kcal: 420,
  };
  const sessions = [
    {
      ...base,
      id: 's2',
      date: '2026-10-09',
      startedAt: new Date('2026-10-09T08:00:00').getTime(),
      programName: 'PPL',
      routineName: 'Push, heavy',
    },
    {
      ...base,
      id: 's1',
      date: '2026-10-07',
      startedAt: new Date('2026-10-07T18:00:00').getTime(),
      programName: null,
      routineName: null,
    },
    {
      ...base,
      id: 'active',
      status: 'active' as const,
      date: '2026-10-09',
      startedAt: 0,
      programName: 'PPL',
      routineName: 'Pull',
    },
    {
      ...base,
      id: 'gone',
      deletedAt: 5,
      date: '2026-10-08',
      startedAt: 0,
      programName: 'PPL',
      routineName: 'Legs',
    },
  ];
  const set = (
    id: string,
    sessionId: string,
    se: string,
    exerciseId: string,
    setIndex: number,
    weightKg: number | null,
    reps: number | null,
    done = true,
  ) => ({
    id,
    sessionId,
    sessionExerciseId: se,
    exerciseId,
    muscleGroup: 'chest' as const,
    setIndex,
    weightKg,
    reps,
    done,
    deletedAt: null,
  });
  const sets = [
    set('a', 's2', 'e2', 'triceps_pushdown', 0, 20, 12),
    set('b', 's2', 'e1', 'bench_press', 1, 60, 8, false),
    set('c', 's2', 'e1', 'bench_press', 0, 60, 10),
    set('d', 's1', 'e3', 'push_up', 0, null, 15),
    set('e', 'active', 'e4', 'pull_up', 0, null, 5),
    { ...set('f', 's2', 'e1', 'bench_press', 2, 60, 8), deletedAt: 9 },
  ];
  const csv = workoutCsv({
    sessions,
    sets,
    exerciseOrder: new Map([
      ['e1', 0],
      ['e2', 1],
    ]),
    exerciseName: (id) =>
      ({ bench_press: 'Bench Press', triceps_pushdown: 'Triceps Pushdown', push_up: 'Push-up' })[id] ?? id,
  });
  const rows = lines(csv);

  it('has the documented header', () => {
    expect(rows[0]).toBe(WORKOUT_CSV_HEADER.join(','));
  });

  it('exports one row per set of completed, non-deleted sessions in chronological order', () => {
    expect(rows).toHaveLength(5);
    expect(rows[1]).toBe(
      '2026-10-07,2026-10-07 18:00,,,push,hard,60.5,420,Push-up,push_up,chest,1,,15,,true',
    );
    expect(rows[2]).toBe(
      '2026-10-09,2026-10-09 08:00,PPL,"Push, heavy",push,hard,60.5,420,Bench Press,bench_press,chest,1,60,10,600,true',
    );
    expect(rows[3]).toContain('Bench Press,bench_press,chest,2,60,8,,false');
    expect(rows[4]).toContain('Triceps Pushdown,triceps_pushdown,chest,1,20,12,240,true');
    expect(csv).not.toContain('Pull');
    expect(csv).not.toContain('Legs');
  });
});

describe('dailyLogCsv', () => {
  it('merges duplicate days (latest edit wins per field) and skips deleted rows', () => {
    const csv = dailyLogCsv([
      {
        id: '1',
        date: '2026-10-08',
        updatedAt: 1,
        deletedAt: null,
        bodyWeightKg: 70.123,
        kcalIntake: null,
        kcalExpenditureOverride: null,
      },
      {
        id: '2',
        date: '2026-10-08',
        updatedAt: 2,
        deletedAt: null,
        bodyWeightKg: null,
        kcalIntake: 2100,
        kcalExpenditureOverride: 500,
      },
      {
        id: '3',
        date: '2026-10-07',
        updatedAt: 3,
        deletedAt: 4,
        bodyWeightKg: 71,
        kcalIntake: null,
        kcalExpenditureOverride: null,
      },
    ]);
    expect(lines(csv)).toEqual([DAILY_CSV_HEADER.join(','), '2026-10-08,70.12,2100,500']);
  });
});
