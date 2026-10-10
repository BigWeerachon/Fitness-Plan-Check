import { beforeEach, describe, expect, it } from '@jest/globals';
import { createRow, listRows, softDeleteRow, updateRow } from '@/db/mutations';
import type { MuscleGroup, RoutineType } from '@/db/schema';
import {
  bodyWeightTrend,
  byMuscle,
  byProgram,
  byRoutineType,
  dailyValues,
  DEFAULT_METRIC,
  energySummary,
  epley1RM,
  groupFilterOf,
  matchesGroup,
  METRICS,
  NO_PROGRAM_KEY,
  percentages,
  programGroups,
  programKey,
  selectStatsData,
  sessionSummaries,
  setVolume,
  strengthSeries,
  type Breakdown,
  type BreakdownOptions,
  type Metric,
  type Share,
  type StatsDailyLog,
  type StatsData,
  type StatsSession,
  type StatsSet,
} from '@/domain/stats';
import { freshEnv } from '../helpers/env';

// ───────────── ตัวช่วยสร้างข้อมูล ─────────────

let seq = 0;

function session(p: Partial<StatsSession> = {}): StatsSession {
  seq += 1;
  return {
    id: `s${seq}`,
    date: '2026-10-05',
    startedAt: seq * 1000,
    status: 'completed',
    deletedAt: null,
    programId: 'p-ppl',
    programName: 'PPL',
    routineName: 'Push A',
    routineType: 'push',
    kcal: null,
    ...p,
  };
}

function sets(n: number, sessionId: string, p: Partial<StatsSet> = {}): StatsSet[] {
  return Array.from({ length: n }, () => {
    seq += 1;
    return {
      id: `x${seq}`,
      sessionId,
      exerciseId: 'bench',
      muscleGroup: 'chest' as MuscleGroup,
      weightKg: 50,
      reps: 10,
      done: true,
      deletedAt: null,
      ...p,
    };
  });
}

function log(p: Partial<StatsDailyLog>): StatsDailyLog {
  seq += 1;
  return {
    id: `l${seq}`,
    date: '2026-10-05',
    updatedAt: seq,
    deletedAt: null,
    kcalExpenditureOverride: null,
    kcalIntake: null,
    bodyWeightKg: null,
    ...p,
  };
}

function percentOf<K extends string>(b: Breakdown<Share<K>>): Record<string, number> {
  return Object.fromEntries(b.entries.map((e) => [e.key, e.percent]));
}

/**
 * ชุดข้อมูลหลัก (ตัวเลขคำนวณมือไว้ในแต่ละเทสต์)
 * PPL: s1 push 4 อก + 2 ไตรเซ็ป (50×10) · s2 pull 3 หลัง (40×10) · s6 legs 3 ต้นขาหน้า (100×5)
 * Upper/Lower: s3 upper อก/หลัง/ไหล่ อย่างละ 1 (100×6)
 * ข้อมูลที่ต้องไม่ถูกนับ: s4 ยังไม่จบ, s5 ถูกลบ, เซ็ตที่ไม่ได้ติ๊ก, เซ็ตที่ถูกลบ, เซ็ตที่ไม่มีเซสชัน
 */
function fixture(): StatsData {
  const s1 = session({ id: 's1', date: '2026-10-05', routineType: 'push', routineName: 'Push A', kcal: 300 });
  const s2 = session({ id: 's2', date: '2026-10-06', routineType: 'pull', routineName: 'Pull A', kcal: 250 });
  const s3 = session({
    id: 's3',
    date: '2026-10-07',
    programId: 'p-ul',
    programName: 'Upper/Lower',
    routineType: 'upper',
    routineName: 'Upper A',
  });
  const s6 = session({ id: 's6', date: '2026-10-08', routineType: 'legs', routineName: 'Legs A' });
  const s4 = session({ id: 's4', date: '2026-10-08', status: 'active' });
  const s5 = session({ id: 's5', date: '2026-10-08', programId: 'p-ul', deletedAt: 123 });
  return {
    sessions: [s3, s1, s6, s2, s4, s5],
    sets: [
      ...sets(4, 's1', { exerciseId: 'bench', muscleGroup: 'chest' }),
      ...sets(2, 's1', { exerciseId: 'pushdown', muscleGroup: 'triceps' }),
      ...sets(1, 's1', { muscleGroup: 'chest', deletedAt: 5 }),
      ...sets(3, 's2', { exerciseId: 'row', muscleGroup: 'back', weightKg: 40 }),
      ...sets(3, 's6', { exerciseId: 'squat', muscleGroup: 'quads', weightKg: 100, reps: 5 }),
      ...sets(1, 's3', { exerciseId: 'bench', muscleGroup: 'chest', weightKg: 100, reps: 6 }),
      ...sets(1, 's3', { exerciseId: 'row', muscleGroup: 'back', weightKg: 100, reps: 6 }),
      ...sets(1, 's3', { exerciseId: 'ohp', muscleGroup: 'shoulders', weightKg: 100, reps: 6 }),
      ...sets(2, 's3', { exerciseId: 'row', muscleGroup: 'back', weightKg: 100, reps: 6, done: false }),
      ...sets(5, 's4', { muscleGroup: 'chest' }),
      ...sets(5, 's5', { muscleGroup: 'back' }),
      ...sets(3, 'ghost', { muscleGroup: 'calves' }),
    ],
  };
}

// ───────────── percentages (largest remainder) ─────────────

describe('percentages (largest remainder / Hamilton)', () => {
  it('returns an empty result when there is nothing to show', () => {
    expect(percentages([])).toEqual([]);
    expect(
      percentages([
        { key: 'a', value: 0 },
        { key: 'b', value: 0 },
      ]),
    ).toEqual([]);
    expect(percentages([{ key: 'a', value: -5 }])).toEqual([]);
    expect(percentages([{ key: 'a', value: Number.NaN }])).toEqual([]);
  });

  it('a single key is 100%', () => {
    expect(percentages([{ key: 'a', value: 7 }])).toEqual([{ key: 'a', value: 7, percent: 100 }]);
    expect(percentages([{ key: 'a', value: 0.3 }], 1)).toEqual([{ key: 'a', value: 0.3, percent: 100 }]);
  });

  it('fixes naive rounding that would not sum to 100', () => {
    // 7 ส่วนเท่ากัน: ปัดธรรมดาได้ 14 × 7 = 98
    const seven = percentages('abcdefg'.split('').map((key) => ({ key, value: 1 })));
    expect(seven.map((e) => e.percent)).toEqual([15, 15, 14, 14, 14, 14, 14]);
    expect(seven.map((e) => e.key)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    // 1/1/1 → 33.4/33.3/33.3 เมื่อทศนิยม 1 ตำแหน่ง
    const thirds = percentages(
      ['a', 'b', 'c'].map((key) => ({ key, value: 1 })),
      1,
    );
    expect(thirds.map((e) => e.percent)).toEqual([33.4, 33.3, 33.3]);
  });

  it('gives leftover units to the largest remainders first', () => {
    // 2/1 → 66.67/33.33 → 67/33
    expect(
      percentages([
        { key: 'small', value: 1 },
        { key: 'big', value: 2 },
      ]),
    ).toEqual([
      { key: 'big', value: 2, percent: 67 },
      { key: 'small', value: 1, percent: 33 },
    ]);
    // 0.1/0.2/0.3 (ทศนิยม) → 16.67/33.33/50 → 17/33/50
    expect(
      percentages([
        { key: 'a', value: 0.1 },
        { key: 'b', value: 0.2 },
        { key: 'c', value: 0.3 },
      ]).map((e) => [e.key, e.percent]),
    ).toEqual([
      ['c', 50],
      ['b', 33],
      ['a', 17],
    ]);
  });

  it('breaks equal remainders by larger value, then by key', () => {
    // 1/1/4 จาก 6 → เศษ .67 เท่ากันทุกตัว ต้องแจก 2 หน่วย: ค่ามากสุด (c) ก่อน แม้ key มากสุด แล้วจึง key น้อยกว่า (a)
    expect(
      percentages([
        { key: 'b', value: 1 },
        { key: 'c', value: 4 },
        { key: 'a', value: 1 },
      ]).map((e) => [e.key, e.percent]),
    ).toEqual([
      ['c', 67],
      ['a', 17],
      ['b', 16],
    ]);
    // 1/1/1/2/2 จาก 7: ปัดลงได้ 14×3 + 28×2 = 98 เหลือ 2 หน่วย, เศษ 2/7 (ค่า 1) กับ 4/7 (ค่า 2)
    // → เศษมากกว่าได้ก่อน (ไม่ใช่ key น้อยกว่า)
    expect(
      percentages(['a', 'b', 'c', 'd', 'e'].map((key, i) => ({ key, value: i < 3 ? 1 : 2 }))).map((e) => [
        e.key,
        e.percent,
      ]),
    ).toEqual([
      ['d', 29],
      ['e', 29],
      ['a', 14],
      ['b', 14],
      ['c', 14],
    ]);
  });

  it('is independent of input order', () => {
    const input = [
      { key: 'push', value: 1 },
      { key: 'pull', value: 1 },
      { key: 'legs', value: 1 },
      { key: 'upper', value: 3 },
    ];
    const expected = percentages(input);
    const perms = [
      [0, 1, 2, 3],
      [3, 2, 1, 0],
      [1, 3, 0, 2],
      [2, 0, 3, 1],
    ];
    for (const p of perms) expect(percentages(p.map((i) => input[i]))).toEqual(expected);
    expect(expected.map((e) => [e.key, e.percent])).toEqual([
      ['upper', 50],
      ['legs', 17],
      ['pull', 17],
      ['push', 16],
    ]);
  });

  it('merges duplicate keys and drops non-positive values', () => {
    expect(
      percentages([
        { key: 'a', value: 1 },
        { key: 'b', value: 0 },
        { key: 'a', value: 2 },
        { key: 'c', value: 1 },
        { key: 'd', value: Number.POSITIVE_INFINITY },
      ]),
    ).toEqual([
      { key: 'a', value: 3, percent: 75 },
      { key: 'c', value: 1, percent: 25 },
    ]);
  });

  it('rejects invalid decimals', () => {
    expect(() => percentages([{ key: 'a', value: 1 }], -1)).toThrow(RangeError);
    expect(() => percentages([{ key: 'a', value: 1 }], 1.5)).toThrow(RangeError);
    expect(() => percentages([{ key: 'a', value: 1 }], 5)).toThrow(RangeError);
  });

  it('matches an exact BigInt reference implementation on random integer data', () => {
    const rand = mulberry32(42);
    for (let run = 0; run < 1500; run++) {
      const n = 1 + Math.floor(rand() * 9);
      // ส่วนใหญ่ใช้ค่าน้อยๆ (ผลรวมเล็ก) → เศษเท่ากันบ่อย ทั้งค่าเท่ากันและค่าต่างกัน
      const small = rand() < 0.7;
      const values = Array.from({ length: n }, (_, i) => ({
        key: `k${Math.floor(rand() * 20)}-${i}`,
        value: small ? 1 + Math.floor(rand() * 6) : Math.floor(rand() * 5000),
      }));
      for (const decimals of [0, 1, 2]) {
        const got = Object.fromEntries(percentages(values, decimals).map((e) => [e.key, e.percent]));
        expect(got).toEqual(referenceHamilton(values, decimals));
      }
    }
  });

  it('always sums to exactly 100 with random fractional values (decimals 0–2)', () => {
    const rand = mulberry32(7);
    const problems: string[] = [];
    for (let run = 0; run < 500; run++) {
      const n = 1 + Math.floor(rand() * 12);
      const values = Array.from({ length: n }, (_, i) => ({
        key: `k${i}`,
        value: rand() < 0.2 ? 0 : rand() * (rand() < 0.5 ? 1 : 1e6),
      }));
      const total = values.reduce((s, v) => s + v.value, 0);
      for (const decimals of [0, 1, 2]) {
        problems.push(...shareProblems(percentages(values, decimals), decimals, total, `run ${run}`));
      }
    }
    expect(problems).toEqual([]);
  });
});

// ───────────── การคัดกรอง ─────────────

describe('selecting data (completed sessions, done sets, filters)', () => {
  it('keeps only completed, non-deleted sessions and their done, non-deleted sets', () => {
    const { sessions, setsBySession } = selectStatsData(fixture());
    expect(sessions.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's6']);
    expect(setsBySession.get('s1')).toHaveLength(6);
    expect(setsBySession.get('s3')).toHaveLength(3);
    expect(setsBySession.has('s4')).toBe(false);
    expect(setsBySession.has('s5')).toBe(false);
    expect(setsBySession.has('ghost')).toBe(false);
  });

  it('filters by inclusive date range', () => {
    const { sessions } = selectStatsData(fixture(), { range: { start: '2026-10-06', end: '2026-10-07' } });
    expect(sessions.map((s) => s.id)).toEqual(['s2', 's3']);
  });

  it('filters by group (I5): id, name, or "no group"', () => {
    const data = fixture();
    expect(selectStatsData(data, { group: { programId: 'p-ul' } }).sessions.map((s) => s.id)).toEqual(['s3']);
    expect(selectStatsData(data, { group: { programName: 'PPL' } }).sessions.map((s) => s.id)).toEqual([
      's1',
      's2',
      's6',
    ]);
    expect(selectStatsData(data, { group: { programId: null } }).sessions).toEqual([]);
    expect(selectStatsData(data, { group: {} }).sessions).toHaveLength(4);
    expect(selectStatsData(data, { group: null }).sessions).toHaveLength(4);
  });

  it('matchesGroup requires every given field to match', () => {
    const s = { programId: 'p1', programName: 'PPL' };
    expect(matchesGroup(s, undefined)).toBe(true);
    expect(matchesGroup(s, { programId: 'p1', programName: 'PPL' })).toBe(true);
    expect(matchesGroup(s, { programId: 'p1', programName: 'Other' })).toBe(false);
    expect(matchesGroup({ programId: null, programName: null }, { programId: null, programName: null })).toBe(
      true,
    );
  });

  it('set volume = weight × reps, bodyweight / missing values count as 0', () => {
    expect(setVolume({ weightKg: 62.5, reps: 8 })).toBe(500);
    expect(setVolume({ weightKg: null, reps: 12 })).toBe(0);
    expect(setVolume({ weightKg: 40, reps: null })).toBe(0);
    expect(setVolume({ weightKg: 0, reps: 10 })).toBe(0);
    expect(setVolume({ weightKg: -10, reps: 10 })).toBe(0);
    expect(setVolume({ weightKg: Number.NaN, reps: 10 })).toBe(0);
  });
});

// ───────────── 3 มุมมอง (I2) ─────────────

describe('byProgram (view 1)', () => {
  it('defaults to completed sets', () => {
    expect(DEFAULT_METRIC).toBe('sets');
    const b = byProgram(fixture());
    expect(b.metric).toBe('sets');
    expect(b.total).toBe(15);
    expect(b.entries).toEqual([
      { key: 'p-ppl', programId: 'p-ppl', programName: 'PPL', value: 12, percent: 80 },
      { key: 'p-ul', programId: 'p-ul', programName: 'Upper/Lower', value: 3, percent: 20 },
    ]);
    expect(percentOf(byProgram(fixture(), { decimals: 1 }))).toEqual({ 'p-ppl': 80, 'p-ul': 20 });
  });

  it('volume = Σ weight × reps of done sets', () => {
    // PPL 4×500 + 2×500 + 3×400 + 3×500 = 5700, UL 3×600 = 1800 → 76 / 24
    const b = byProgram(fixture(), { metric: 'volume' });
    expect(b.total).toBe(7500);
    expect(b.entries.map((e) => [e.key, e.value, e.percent])).toEqual([
      ['p-ppl', 5700, 76],
      ['p-ul', 1800, 24],
    ]);
  });

  it('sessions = number of completed sessions (even without done sets)', () => {
    const data = fixture();
    const empty = session({
      id: 'empty',
      programId: 'p-ul',
      programName: 'Upper/Lower',
      routineType: 'lower',
    });
    const b = byProgram({ ...data, sessions: [...data.sessions, empty] }, { metric: 'sessions' });
    expect(b.entries.map((e) => [e.key, e.value, e.percent])).toEqual([
      ['p-ppl', 3, 60],
      ['p-ul', 2, 40],
    ]);
    expect(byProgram(fixture(), { metric: 'sessions', decimals: 1 }).entries.map((e) => e.percent)).toEqual([
      75, 25,
    ]);
  });

  it('respects the period range', () => {
    const b = byProgram(fixture(), { range: { start: '2026-10-07', end: '2026-10-31' } });
    expect(b.entries.map((e) => [e.key, e.value, e.percent])).toEqual([
      ['p-ppl', 3, 50],
      ['p-ul', 3, 50],
    ]);
  });

  it('keeps one group per programId and labels it with the latest snapshot name', () => {
    const a = session({ date: '2026-10-01', programName: 'PPL' });
    const b = session({ date: '2026-10-09', programName: 'PPL 2.0' });
    const c = session({ date: '2026-10-10', programName: null });
    const data = { sessions: [b, c, a], sets: [...sets(2, a.id), ...sets(2, b.id), ...sets(1, c.id)] };
    expect(byProgram(data).entries).toEqual([
      { key: 'p-ppl', programId: 'p-ppl', programName: 'PPL 2.0', value: 5, percent: 100 },
    ]);
    expect(programGroups(data)).toEqual([
      { key: 'p-ppl', programId: 'p-ppl', programName: 'PPL 2.0', sessions: 3, lastDate: '2026-10-10' },
    ]);
  });

  it('groups sessions without programId by snapshot name, or as "no group"', () => {
    const free = session({ programId: null, programName: null, routineName: null, routineType: null });
    const imported = session({ programId: null, programName: 'Imported' });
    const ppl = session();
    const data = {
      sessions: [free, imported, ppl],
      sets: [...sets(1, free.id), ...sets(1, imported.id), ...sets(2, ppl.id)],
    };
    expect(byProgram(data).entries).toEqual([
      { key: 'p-ppl', programId: 'p-ppl', programName: 'PPL', value: 2, percent: 50 },
      { key: 'name:Imported', programId: null, programName: 'Imported', value: 1, percent: 25 },
      { key: NO_PROGRAM_KEY, programId: null, programName: null, value: 1, percent: 25 },
    ]);
    // ตัวกรองจาก groupFilterOf เลือกเซสชันชุดเดียวกับที่ programKey จัดกลุ่ม
    for (const entry of byProgram(data).entries) {
      const picked = selectStatsData(data, { group: groupFilterOf(entry) }).sessions;
      expect(picked.map((s) => programKey(s))).toEqual([entry.key]);
    }
  });

  it('is empty when there is no data in the period', () => {
    expect(byProgram({ sessions: [], sets: [] })).toEqual({ metric: 'sets', total: 0, entries: [] });
    expect(byProgram(fixture(), { range: { start: '2027-01-01', end: '2027-01-31' } }).entries).toEqual([]);
    // มีเซสชันแต่ไม่มีเซ็ตที่ติ๊ก → ตัวชี้วัดเซ็ตว่าง แต่ตัวชี้วัดเซสชันไม่ว่าง
    const onlyEmpty = { sessions: [session()], sets: [] };
    expect(byProgram(onlyEmpty).entries).toEqual([]);
    expect(byProgram(onlyEmpty, { metric: 'sessions' }).entries).toHaveLength(1);
  });
});

describe('byRoutineType (view 2, within the selected group)', () => {
  const ppl: BreakdownOptions = { group: { programId: 'p-ppl' } };

  it('splits the selected program by routine type snapshot', () => {
    expect(percentOf(byRoutineType(fixture(), ppl))).toEqual({ push: 50, pull: 25, legs: 25 });
  });

  it('equal split PPL → 34 / 33 / 33 with deterministic tie-breaking', () => {
    const b = byRoutineType(fixture(), { ...ppl, metric: 'sessions' });
    expect(b.entries.map((e) => [e.key, e.percent])).toEqual([
      ['legs', 34],
      ['pull', 33],
      ['push', 33],
    ]);
    expect(
      byRoutineType(fixture(), { ...ppl, metric: 'sessions', decimals: 1 }).entries.map((e) => e.percent),
    ).toEqual([33.4, 33.3, 33.3]);
  });

  it('volume within the group', () => {
    // push 3000, legs 1500, pull 1200 จาก 5700 → 52.63/26.32/21.05 → 53/26/21
    expect(
      byRoutineType(fixture(), { ...ppl, metric: 'volume' }).entries.map((e) => [e.key, e.percent]),
    ).toEqual([
      ['push', 53],
      ['legs', 26],
      ['pull', 21],
    ]);
  });

  it('without a group it covers all programs; missing type counts as "other"', () => {
    const data = fixture();
    const free = session({ id: 'free', programId: null, programName: null, routineType: null });
    const all = byRoutineType({
      sessions: [...data.sessions, free],
      sets: [...data.sets, ...sets(5, 'free')],
    });
    expect(percentOf(all)).toEqual({ push: 30, other: 25, pull: 15, legs: 15, upper: 15 });
  });
});

describe('byMuscle (view 3, primary muscle snapshot of each set)', () => {
  it('completed sets per muscle', () => {
    // อก 5, หลัง 4, ต้นขาหน้า 3, ไตรเซ็ป 2, ไหล่ 1 จาก 15
    const b = byMuscle(fixture());
    expect(b.total).toBe(15);
    expect(b.entries.map((e) => [e.key, e.value, e.percent])).toEqual([
      ['chest', 5, 33],
      ['back', 4, 27],
      ['quads', 3, 20],
      ['triceps', 2, 13],
      ['shoulders', 1, 7],
    ]);
  });

  it('volume per muscle', () => {
    // อก 2000+600, หลัง 1200+600, ต้นขาหน้า 1500, ไตรเซ็ป 1000, ไหล่ 600 จาก 7500
    expect(percentOf(byMuscle(fixture(), { metric: 'volume' }))).toEqual({
      chest: 35,
      back: 24,
      quads: 20,
      triceps: 13,
      shoulders: 8,
    });
  });

  it('sessions metric counts a session once per muscle it trained', () => {
    // s1: อก+ไตรเซ็ป, s2: หลัง, s6: ต้นขาหน้า, s3: อก+หลัง+ไหล่ → อก 2, หลัง 2, อื่นๆ 1 จาก 7
    const b = byMuscle(fixture(), { metric: 'sessions' });
    expect(b.total).toBe(7);
    expect(b.entries.map((e) => [e.key, e.value, e.percent])).toEqual([
      ['back', 2, 29],
      ['chest', 2, 29],
      ['quads', 1, 14],
      ['shoulders', 1, 14],
      ['triceps', 1, 14],
    ]);
  });

  it('applies the group filter (I5) before computing', () => {
    expect(percentOf(byMuscle(fixture(), { group: { programId: 'p-ul' } }))).toEqual({
      back: 34,
      chest: 33,
      shoulders: 33,
    });
  });
});

// ───────────── รายการเซสชัน (I1) ─────────────

describe('sessionSummaries (I1)', () => {
  it('lists completed sessions newest first with snapshot names, exercises, sets and volume', () => {
    expect(sessionSummaries(fixture())).toEqual([
      {
        sessionId: 's6',
        date: '2026-10-08',
        startedAt: expect.any(Number),
        programId: 'p-ppl',
        programName: 'PPL',
        routineName: 'Legs A',
        routineType: 'legs',
        exercises: 1,
        sets: 3,
        volumeKg: 1500,
      },
      {
        sessionId: 's3',
        date: '2026-10-07',
        startedAt: expect.any(Number),
        programId: 'p-ul',
        programName: 'Upper/Lower',
        routineName: 'Upper A',
        routineType: 'upper',
        exercises: 3,
        sets: 3,
        volumeKg: 1800,
      },
      {
        sessionId: 's2',
        date: '2026-10-06',
        startedAt: expect.any(Number),
        programId: 'p-ppl',
        programName: 'PPL',
        routineName: 'Pull A',
        routineType: 'pull',
        exercises: 1,
        sets: 3,
        volumeKg: 1200,
      },
      {
        sessionId: 's1',
        date: '2026-10-05',
        startedAt: expect.any(Number),
        programId: 'p-ppl',
        programName: 'PPL',
        routineName: 'Push A',
        routineType: 'push',
        exercises: 2,
        sets: 6,
        volumeKg: 3000,
      },
    ]);
  });

  it('orders same-day sessions by start time and applies filters', () => {
    const morning = session({ id: 'am', date: '2026-10-09', startedAt: 1 });
    const evening = session({ id: 'pm', date: '2026-10-09', startedAt: 2, programId: 'p-ul' });
    const data = { sessions: [morning, evening], sets: [] };
    expect(sessionSummaries(data).map((s) => s.sessionId)).toEqual(['pm', 'am']);
    expect(sessionSummaries(data, { group: { programId: 'p-ul' } }).map((s) => s.sessionId)).toEqual(['pm']);
    expect(sessionSummaries(data, { range: { start: '2026-10-10', end: '2026-10-10' } })).toEqual([]);
    expect(sessionSummaries(data)[0]).toMatchObject({ exercises: 0, sets: 0, volumeKg: 0 });
  });
});

// ───────────── พลังงาน (I3) ─────────────

describe('energySummary (I3)', () => {
  const macros = { proteinG: 150, carbsG: 220, fatG: 60 };

  function energyData() {
    return {
      sessions: [
        session({ date: '2026-10-05', kcal: 300 }),
        session({ date: '2026-10-07', kcal: 250.5 }),
        session({ date: '2026-10-07', kcal: null }),
        session({ date: '2026-10-08', kcal: 999, status: 'active' }),
        session({ date: '2026-10-09', kcal: 999, deletedAt: 1 }),
        session({ date: '2026-10-12', kcal: 999 }),
      ],
      dailyLogs: [
        log({ date: '2026-10-05', kcalExpenditureOverride: 2600, kcalIntake: 2100, updatedAt: 10 }),
        log({ date: '2026-10-06', kcalIntake: 1900, updatedAt: 10 }),
        // สองแถวของวันเดียวกัน: แถวที่แก้ล่าสุดชนะ
        log({ date: '2026-10-07', kcalIntake: 1800, updatedAt: 30 }),
        log({ date: '2026-10-07', kcalIntake: 1500, updatedAt: 20 }),
        log({ date: '2026-10-08', kcalIntake: 5000, deletedAt: 1 }),
        log({ date: '2026-10-04', kcalIntake: 4000 }),
      ],
    };
  }

  it('sums exercise kcal, entered expenditure/intake and compares with TDEE/target × days', () => {
    const e = energySummary(energyData(), {
      period: 'week',
      anchor: '2026-10-07',
      tdee: 2400,
      targetKcal: 1920,
      macrosPerDay: macros,
    });
    expect(e.range).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(e.days).toBe(7);
    expect(e.sessions).toBe(3);
    expect(e.exerciseKcal).toBe(550.5);
    expect(e.expenditure).toEqual({ totalKcal: 2600, days: 1 });
    expect(e.intake).toEqual({ totalKcal: 5800, days: 3 });
    expect(e.tdeeKcal).toBe(16800);
    expect(e.targetKcal).toBe(13440);
    expect(e.macrosPerDay).toBe(macros);
    expect(e.series).toHaveLength(7);
    expect(e.series[0]).toEqual({
      key: '2026-10-05',
      start: '2026-10-05',
      end: '2026-10-05',
      days: 1,
      exerciseKcal: 300,
      expenditureKcal: 2600,
      intakeKcal: 2100,
      tdeeKcal: 2400,
      targetKcal: 1920,
    });
    expect(e.series[2]).toMatchObject({ exerciseKcal: 250.5, expenditureKcal: null, intakeKcal: 1800 });
    expect(e.series[6]).toMatchObject({ exerciseKcal: 0, expenditureKcal: null, intakeKcal: null });
  });

  it('does not count days after "today" against TDEE/target', () => {
    const e = energySummary(energyData(), {
      period: 'week',
      anchor: '2026-10-07',
      weekStart: 1,
      tdee: 2400,
      targetKcal: 1920,
      today: '2026-10-08',
    });
    expect(e.days).toBe(4);
    expect(e.tdeeKcal).toBe(9600);
    expect(e.targetKcal).toBe(7680);
    expect(e.series.map((p) => p.days)).toEqual([1, 1, 1, 1, 0, 0, 0]);
    expect(e.series[5].tdeeKcal).toBe(0);
    // ช่วงในอนาคตทั้งหมด → 0 วัน
    const future = energySummary(energyData(), {
      period: 'week',
      anchor: '2026-10-20',
      tdee: 2400,
      targetKcal: null,
      today: '2026-10-08',
    });
    expect(future.days).toBe(0);
    expect(future.tdeeKcal).toBe(0);
  });

  it('uses the Sunday week start when configured', () => {
    const e = energySummary(energyData(), {
      period: 'week',
      anchor: '2026-10-07',
      weekStart: 0,
      tdee: null,
      targetKcal: null,
    });
    expect(e.range).toEqual({ start: '2026-10-04', end: '2026-10-10' });
    expect(e.intake).toEqual({ totalKcal: 9800, days: 4 });
    expect(e.exerciseKcal).toBe(550.5);
  });

  it('year view → 12 monthly points with days per month', () => {
    const e = energySummary(
      {
        sessions: [
          session({ date: '2024-02-10', kcal: 200 }),
          session({ date: '2024-02-29', kcal: 100 }),
          session({ date: '2024-12-31', kcal: 50 }),
        ],
        dailyLogs: [
          log({ date: '2024-02-01', kcalIntake: 2000 }),
          log({ date: '2024-02-02', kcalIntake: 2200 }),
        ],
      },
      { period: 'year', anchor: '2024-06-15', tdee: 2000, targetKcal: 1800, today: '2024-03-15' },
    );
    expect(e.series.map((p) => p.key)[1]).toBe('2024-02');
    expect(e.series[1]).toMatchObject({ days: 29, exerciseKcal: 300, intakeKcal: 4200, tdeeKcal: 58000 });
    expect(e.series[0].days).toBe(31);
    expect(e.series[2].days).toBe(15);
    expect(e.series[3].days).toBe(0);
    expect(e.series[11]).toMatchObject({ exerciseKcal: 50, days: 0 });
    expect(e.days).toBe(31 + 29 + 15);
    expect(e.exerciseKcal).toBe(350);
  });

  it('missing profile values → null comparisons; empty data → zero totals', () => {
    const e = energySummary(
      { sessions: [], dailyLogs: [] },
      { period: 'day', anchor: '2026-10-09', tdee: null, targetKcal: Number.NaN },
    );
    expect(e).toEqual({
      range: { start: '2026-10-09', end: '2026-10-09' },
      days: 1,
      exerciseKcal: 0,
      sessions: 0,
      expenditure: { totalKcal: 0, days: 0 },
      intake: { totalKcal: 0, days: 0 },
      tdeeKcal: null,
      targetKcal: null,
      macrosPerDay: null,
      series: [
        {
          key: '2026-10-09',
          start: '2026-10-09',
          end: '2026-10-09',
          days: 1,
          exerciseKcal: 0,
          expenditureKcal: null,
          intakeKcal: null,
          tdeeKcal: null,
          targetKcal: null,
        },
      ],
    });
  });
});

// ───────────── น้ำหนักตัว + 1RM (I4) ─────────────

describe('daily values and body weight trend (I4)', () => {
  it('sorts by date, keeps one value per day (latest edit wins), skips deleted/invalid', () => {
    const logs = [
      log({ date: '2026-10-07', bodyWeightKg: 80.4, updatedAt: 5 }),
      log({ date: '2026-10-05', bodyWeightKg: 81, updatedAt: 1 }),
      log({ date: '2026-10-05', bodyWeightKg: 80.8, updatedAt: 9 }),
      log({ date: '2026-10-06', bodyWeightKg: null, kcalIntake: 2000 }),
      log({ date: '2026-10-08', bodyWeightKg: 79, deletedAt: 3 }),
      log({ date: '2026-10-09', bodyWeightKg: 0 }),
      log({ date: '2026-10-10', bodyWeightKg: -5 }),
    ];
    expect(bodyWeightTrend(logs)).toEqual([
      { date: '2026-10-05', weightKg: 80.8 },
      { date: '2026-10-07', weightKg: 80.4 },
    ]);
    expect(bodyWeightTrend(logs, { start: '2026-10-06', end: '2026-10-31' })).toEqual([
      { date: '2026-10-07', weightKg: 80.4 },
    ]);
    expect(bodyWeightTrend([])).toEqual([]);
  });

  it('breaks equal updatedAt ties by id', () => {
    const logs = [
      log({ id: 'b', date: '2026-10-05', bodyWeightKg: 70, updatedAt: 1 }),
      log({ id: 'a', date: '2026-10-05', bodyWeightKg: 71, updatedAt: 1 }),
    ];
    expect(bodyWeightTrend(logs)).toEqual([{ date: '2026-10-05', weightKg: 70 }]);
    expect(bodyWeightTrend([...logs].reverse())).toEqual([{ date: '2026-10-05', weightKg: 70 }]);
  });

  it('merges duplicate rows of a day field by field', () => {
    const logs = [
      log({ date: '2026-10-05', bodyWeightKg: 80, kcalIntake: 1500, updatedAt: 1 }),
      log({ date: '2026-10-05', kcalIntake: 2100, kcalExpenditureOverride: 2500, updatedAt: 2 }),
    ];
    expect(dailyValues(logs)).toEqual([
      { date: '2026-10-05', bodyWeightKg: 80, kcalIntake: 2100, kcalExpenditureOverride: 2500 },
    ]);
    // 0 kcal ที่กรอกเองเป็นค่าที่ใช้ได้ แต่ค่าติดลบไม่ใช่
    expect(dailyValues([log({ kcalIntake: 0 }), log({ date: '2026-10-06', kcalIntake: -1 })])).toEqual([
      { date: '2026-10-05', bodyWeightKg: null, kcalIntake: 0, kcalExpenditureOverride: null },
    ]);
  });
});

describe('estimated 1RM (Epley) and strength series (I4)', () => {
  it('epley1RM = weight × (1 + reps/30), 1 rep = the weight itself', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(60, 15)).toBe(90);
    expect(epley1RM(100, 10)).toBeCloseTo(133.333, 3);
    expect(epley1RM(80, 5)).toBeCloseTo(93.333, 3);
    expect(epley1RM(100, 0)).toBe(0);
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(-20, 5)).toBe(0);
    expect(epley1RM(Number.NaN, 5)).toBe(0);
  });

  it('best e1RM per session date, oldest first, only done sets of completed sessions', () => {
    const d1a = session({ date: '2026-10-01' });
    const d1b = session({ date: '2026-10-01' });
    const d2 = session({ date: '2026-10-03' });
    const active = session({ date: '2026-10-04', status: 'active' });
    const data = {
      sessions: [d2, active, d1b, d1a],
      sets: [
        ...sets(1, d1a.id, { weightKg: 80, reps: 5 }),
        ...sets(1, d1b.id, { weightKg: 85, reps: 3 }),
        ...sets(1, d1b.id, { weightKg: 120, reps: 1, done: false }),
        ...sets(1, d2.id, { weightKg: 60, reps: 15 }),
        ...sets(1, d2.id, { weightKg: 90, reps: 1 }),
        ...sets(1, d2.id, { exerciseId: 'squat', weightKg: 200, reps: 5 }),
        ...sets(1, d2.id, { weightKg: null, reps: 20 }),
        ...sets(1, active.id, { weightKg: 150, reps: 5 }),
      ],
    };
    const series = strengthSeries(data, 'bench');
    expect(series.map((p) => [p.date, p.weightKg, p.reps, p.sessionId])).toEqual([
      ['2026-10-01', 85, 3, d1b.id],
      // 60×15 = 90×1 = 90 → เสมอกัน เลือกน้ำหนักมากกว่า
      ['2026-10-03', 90, 1, d2.id],
    ]);
    expect(series[0].e1rmKg).toBeCloseTo(93.5, 6);
    expect(series[1].e1rmKg).toBe(90);
    expect(strengthSeries(data, 'bench', { range: { start: '2026-10-02', end: '2026-10-31' } })).toHaveLength(
      1,
    );
    expect(strengthSeries(data, 'deadlift')).toEqual([]);
  });
});

// ───────────── snapshot: แก้/ลบ routine และกรุ๊ปไม่เปลี่ยนสถิติ ─────────────

describe('stability against later renames/deletes (snapshots, SPEC F6/M)', () => {
  beforeEach(() => {
    freshEnv();
  });

  function readStats() {
    const data = { sessions: listRows('workout_session'), sets: listRows('session_set') };
    return {
      program: METRICS.map((metric) => byProgram(data, { metric })),
      routine: METRICS.map((metric) => byRoutineType(data, { metric, group: { programId: 'prog' } })),
      muscle: METRICS.map((metric) => byMuscle(data, { metric })),
      summaries: sessionSummaries(data),
      strength: strengthSeries(data, 'bench'),
    };
  }

  it('renaming, retagging and deleting programs/routines leaves past stats unchanged', () => {
    const prog = createRow('program', { id: 'prog', name: 'PPL' });
    const push = createRow('routine', { programId: prog.id, name: 'Push A', type: 'push' });
    const legs = createRow('routine', { programId: prog.id, name: 'Legs A', type: 'legs' });
    const snapshot = (r: typeof push) => ({
      programId: prog.id,
      programName: prog.name,
      routineId: r.id,
      routineName: r.name,
      routineType: r.type,
    });
    const s1 = createRow('workout_session', {
      date: '2026-10-05',
      startedAt: 1,
      status: 'completed',
      ...snapshot(push),
    });
    const s2 = createRow('workout_session', {
      date: '2026-10-06',
      startedAt: 2,
      status: 'completed',
      ...snapshot(legs),
    });
    const addSet = (sessionId: string, exerciseId: string, muscleGroup: MuscleGroup, i: number) =>
      createRow('session_set', {
        sessionId,
        sessionExerciseId: `${sessionId}-${exerciseId}`,
        exerciseId,
        muscleGroup,
        setIndex: i,
        weightKg: 60,
        reps: 8,
        done: true,
      });
    [0, 1, 2].forEach((i) => addSet(s1.id, 'bench', 'chest', i));
    [0, 1].forEach((i) => addSet(s1.id, 'pushdown', 'triceps', i));
    [0, 1, 2, 3].forEach((i) => addSet(s2.id, 'squat', 'quads', i));

    const before = readStats();
    expect(before.program[0].entries.map((e) => [e.programName, e.percent])).toEqual([['PPL', 100]]);
    expect(percentOf(before.routine[0])).toEqual({ legs: 44, push: 56 });

    // แก้ชื่อกรุ๊ป, เปลี่ยนชื่อและแท็กประเภท routine, แล้วลบทั้ง routine และกรุ๊ป
    updateRow('program', prog.id, { name: 'Renamed group' });
    updateRow('routine', push.id, { name: 'Chest day', type: 'upper' });
    updateRow('routine', legs.id, { type: 'lower' });
    softDeleteRow('routine', push.id);
    softDeleteRow('routine', legs.id);
    softDeleteRow('program', prog.id);

    expect(readStats()).toEqual(before);
    expect(readStats().summaries.map((s) => [s.programName, s.routineName])).toEqual([
      ['PPL', 'Legs A'],
      ['PPL', 'Push A'],
    ]);
  });
});

// ───────────── property test: ผลรวม 100% กับข้อมูลสุ่ม ─────────────

describe('property: every breakdown sums to exactly 100% on random data', () => {
  const VIEWS = { byProgram, byRoutineType, byMuscle } as const;

  it('holds for all views × metrics × decimals (0, 1) × filters', () => {
    const rand = mulberry32(2026);
    const problems: string[] = [];
    let nonEmpty = 0;
    let empty = 0;
    for (let run = 0; run < 300; run++) {
      const data = randomData(rand);
      const filters: BreakdownOptions[] = [
        {},
        { range: { start: '2026-03-01', end: '2026-05-31' } },
        { group: { programId: 'p1' } },
        { group: { programId: null, programName: 'Imported' } },
      ];
      for (const filter of filters) {
        for (const [name, view] of Object.entries(VIEWS)) {
          for (const metric of METRICS) {
            for (const decimals of [0, 1]) {
              const b = (view as (d: StatsData, o: BreakdownOptions) => Breakdown<Share>)(data, {
                ...filter,
                metric,
                decimals,
              });
              if (b.metric !== metric) problems.push(`${name}: metric ${b.metric} ≠ ${metric}`);
              problems.push(...shareProblems(b.entries, decimals, b.total, `${name}/${metric}/${decimals}`));
              if (b.entries.length) nonEmpty += 1;
              else empty += 1;
            }
          }
        }
        problems.push(...consistencyProblems(data, filter));
      }
    }
    expect(problems).toEqual([]);
    // ข้อมูลสุ่มต้องครอบคลุมทั้งกรณีว่างและไม่ว่าง
    expect(nonEmpty).toBeGreaterThan(1000);
    expect(empty).toBeGreaterThan(100);
  });

  it('results do not depend on the order of rows', () => {
    const rand = mulberry32(99);
    for (let run = 0; run < 60; run++) {
      const data = randomData(rand);
      const shuffled = { sessions: shuffle(data.sessions, rand), sets: shuffle(data.sets, rand) };
      for (const metric of METRICS) {
        expect(byProgram(shuffled, { metric })).toEqual(byProgram(data, { metric }));
        expect(byRoutineType(shuffled, { metric })).toEqual(byRoutineType(data, { metric }));
        expect(byMuscle(shuffled, { metric })).toEqual(byMuscle(data, { metric }));
      }
      expect(sessionSummaries(shuffled)).toEqual(sessionSummaries(data));
    }
  });
});

// ───────────── ตัวช่วยของ property test ─────────────

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];
const TYPES: RoutineType[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'other'];
const PROGRAMS: { id: string | null; names: (string | null)[] }[] = [
  { id: 'p1', names: ['PPL', 'PPL 2.0'] },
  { id: 'p2', names: ['Upper/Lower'] },
  { id: null, names: ['Imported'] },
  { id: null, names: [null] },
  { id: 'p3', names: [null, 'Bro split'] },
];

function randomData(rand: () => number): StatsData {
  const int = (n: number) => Math.floor(rand() * n);
  const pick = <T>(items: readonly T[]): T => items[int(items.length)];
  const pad = (n: number) => String(n).padStart(2, '0');
  // บางชุดใช้กลุ่มกล้ามเนื้อ/กรุ๊ปน้อยๆ เพื่อให้เกิดค่าเท่ากัน (กรณีเสมอ) บ่อย
  const muscles = rand() < 0.4 ? MUSCLES.slice(0, 2 + int(3)) : MUSCLES;
  const programs = PROGRAMS.slice(0, 1 + int(PROGRAMS.length));
  const sessions: StatsSession[] = [];
  const allSets: StatsSet[] = [];
  const nSessions = int(25);
  for (let i = 0; i < nSessions; i++) {
    const program = pick(programs);
    const id = `r${i}`;
    sessions.push({
      id,
      date: `2026-${pad(1 + int(12))}-${pad(1 + int(28))}`,
      startedAt: int(1e9),
      status: rand() < 0.85 ? 'completed' : 'active',
      deletedAt: rand() < 0.1 ? 1 : null,
      programId: program.id,
      programName: pick(program.names),
      routineName: 'Routine',
      routineType: rand() < 0.1 ? null : pick(TYPES),
      kcal: rand() < 0.3 ? null : int(600),
    });
    const nSets = int(rand() < 0.5 ? 6 : 25);
    for (let j = 0; j < nSets; j++) {
      allSets.push({
        id: `${id}-${j}`,
        sessionId: id,
        exerciseId: pick(['bench', 'squat', 'row', 'curl', 'plank']),
        muscleGroup: pick(muscles),
        // รวมน้ำหนักที่แปลงจาก lb (ทศนิยมยาว) และบอดี้เวท (null)
        weightKg: pick([null, 0, 20, 22.5, 61.25, 100, 20.41165665, 142.5]),
        reps: pick([null, 0, 1, 5, 8, 10, 12, 15]),
        done: rand() < 0.8,
        deletedAt: rand() < 0.05 ? 2 : null,
      });
    }
  }
  allSets.push(...sets(int(3), 'ghost'));
  return { sessions, sets: allSets };
}

/**
 * เงื่อนไขที่ผลลัพธ์เปอร์เซ็นต์ทุกชุดต้องผ่าน — คืนรายการข้อที่ผิด (ว่าง = ผ่าน)
 * รวมข้อผิดไว้แล้ว expect ครั้งเดียว เพราะ expect ทีละข้อหลายแสนครั้งช้ามาก
 */
function shareProblems(entries: readonly Share[], decimals: number, total: number, label = ''): string[] {
  const problems: string[] = [];
  const fail = (msg: string) => problems.push(`${label}: ${msg} ${JSON.stringify(entries)}`);
  const scale = 10 ** decimals;
  if (entries.length === 0) {
    if (total !== 0) fail(`empty entries but total ${total}`);
    return problems;
  }
  const units = entries.map((e) => Math.round(e.percent * scale));
  // ผลรวม = 100 พอดี (นับเป็นหน่วยจำนวนเต็มเพื่อเลี่ยงการบวกเลขทศนิยม)
  const sum = units.reduce((s, u) => s + u, 0);
  if (sum !== 100 * scale) fail(`sum ${sum / scale}`);
  const valueSum = entries.reduce((s, e) => s + e.value, 0);
  if (Math.abs(valueSum - total) > 1e-9 * Math.max(1, total)) fail(`total ${total} ≠ Σ values ${valueSum}`);
  if (new Set(entries.map((e) => e.key)).size !== entries.length) fail('duplicate keys');
  entries.forEach((e, i) => {
    // ทศนิยมไม่เกินที่กำหนด
    if (units[i] / scale !== e.percent) fail(`${e.percent} has more than ${decimals} decimals`);
    if (!(e.value > 0)) fail(`non-positive value ${e.value}`);
    // คุณสมบัติโควตา: ทุกค่าคือการปัดลงหรือปัดขึ้นของสัดส่วนจริงเท่านั้น
    const exact = (e.value / valueSum) * 100 * scale;
    if (Math.abs(units[i] - exact) >= 1 + 1e-6) fail(`${e.key} ${e.percent} too far from ${exact / scale}`);
    if (i > 0 && entries[i - 1].value < e.value) fail('not sorted by value');
  });
  return problems;
}

/** ตัวหารของแต่ละมุมมองต้องสอดคล้องกัน — คืนรายการข้อที่ผิด */
function consistencyProblems(data: StatsData, filter: BreakdownOptions): string[] {
  const problems: string[] = [];
  const summaries = sessionSummaries(data, filter);
  const doneSets = summaries.reduce((s, x) => s + x.sets, 0);
  const volume = summaries.reduce((s, x) => s + x.volumeKg, 0);
  const sessionsWithSets = summaries.filter((x) => x.sets > 0).length;
  const totals = (metric: Metric) =>
    [byProgram, byRoutineType, byMuscle].map((view) => view(data, { ...filter, metric }).total);
  const [pSets, rSets, mSets] = totals('sets');
  if (pSets !== doneSets || rSets !== doneSets || mSets !== doneSets) {
    problems.push(`sets totals ${[pSets, rSets, mSets]} ≠ ${doneSets}`);
  }
  if (totals('volume').some((v) => Math.abs(v - volume) > 1e-6)) {
    problems.push(`volume totals ${totals('volume')} ≠ ${volume}`);
  }
  const [pSessions, rSessions, mSessions] = totals('sessions');
  if (pSessions !== summaries.length || rSessions !== summaries.length) {
    problems.push(`session totals ${[pSessions, rSessions]} ≠ ${summaries.length}`);
  }
  // คู่ เซสชัน–กล้ามเนื้อ: อย่างน้อย 1 ต่อเซสชันที่มีเซ็ต และไม่เกินจำนวนเซ็ต
  if (mSessions < sessionsWithSets || mSessions > doneSets) {
    problems.push(`muscle sessions ${mSessions} outside [${sessionsWithSets}, ${doneSets}]`);
  }
  return problems;
}

/** วิธี largest remainder แบบเลขจำนวนเต็มไม่จำกัด (BigInt) ไว้เทียบผล */
function referenceHamilton(
  values: { key: string; value: number }[],
  decimals: number,
): Record<string, number> {
  const positive = values.filter((v) => v.value > 0);
  const total = positive.reduce((s, v) => s + BigInt(v.value), BigInt(0));
  if (total === BigInt(0)) return {};
  const scale = 10 ** decimals;
  const units = BigInt(100 * scale);
  const rows = positive.map((v) => ({
    key: v.key,
    value: v.value,
    q: (BigInt(v.value) * units) / total,
    r: (BigInt(v.value) * units) % total,
  }));
  let left = units - rows.reduce((s, r) => s + r.q, BigInt(0));
  const order = [...rows].sort((a, b) =>
    a.r !== b.r ? (b.r > a.r ? 1 : -1) : b.value - a.value || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  for (const row of order) {
    if (left === BigInt(0)) break;
    row.q += BigInt(1);
    left -= BigInt(1);
  }
  return Object.fromEntries(rows.map((r) => [r.key, Number(r.q) / scale]));
}
