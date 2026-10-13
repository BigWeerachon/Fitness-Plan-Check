import { beforeEach, describe, expect, it } from '@jest/globals';
import { createRow } from '@/db/mutations';
import { setOwner } from '@/db/owner';
import { customExerciseRepo } from '@/db/repos/customExerciseRepo';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo, type ExerciseResolver } from '@/db/repos/sessionRepo';
import { dayOverrideRepo, weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { pendingCount } from '@/features/sync/engine';
import { setClockForTests } from '@/utils/clock';
import { freshEnv } from '../helpers/env';

const USER = '22222222-2222-4222-8222-222222222222';
const resolve: ExerciseResolver = (id) => ({
  name: `name:${id}`,
  muscle: id.includes('squat') ? 'quads' : 'chest',
});

describe('repositories (T06)', () => {
  let t = 1_000_000;
  beforeEach(() => {
    freshEnv();
    setOwner(USER);
    t = Date.parse('2026-10-09T08:00:00Z');
    setClockForTests(() => (t += 1000));
  });

  it('profile is created on demand and updated in place', () => {
    expect(profileRepo.get()).toBeUndefined();
    const p = profileRepo.ensure();
    expect(p).toMatchObject({ weightUnit: 'kg', restTimerSec: 90, weekStart: 1, restTimerEnabled: true });
    profileRepo.update({ weightKg: 70, weightUnit: 'lb' });
    expect(profileRepo.get()).toMatchObject({ id: p.id, weightKg: 70, weightUnit: 'lb' });
  });

  it('programs and routines: create, rename, copy and move across groups (F3)', () => {
    const ppl = programRepo.create(' PPL ');
    const ul = programRepo.create('Upper/Lower');
    expect(programRepo.list().map((p) => p.name)).toEqual(['PPL', 'Upper/Lower']);
    const push = routineRepo.create(ppl.id, 'Push A', 'push');
    routineExerciseRepo.add(push.id, 'barbell_bench_press', { sets: 4, repMin: 6, repMax: 10 });
    routineExerciseRepo.add(push.id, 'overhead_press');
    const copy = routineRepo.copyTo(push.id, ul.id)!;
    expect(copy.programId).toBe(ul.id);
    expect(routineExerciseRepo.listByRoutine(copy.id).map((e) => [e.exerciseId, e.sets])).toEqual([
      ['barbell_bench_press', 4],
      ['overhead_press', 3],
    ]);
    // ต้นฉบับยังอยู่
    expect(routineRepo.listByProgram(ppl.id)).toHaveLength(1);
    const entry = weekPlanRepo.ensureEntry(ppl.id, push.id, [1]);
    routineRepo.moveTo(push.id, ul.id);
    expect(routineRepo.get(push.id)?.programId).toBe(ul.id);
    expect(weekPlanRepo.get(entry.id)).toBeUndefined();
    programRepo.rename(ppl.id, 'Push Pull Legs');
    expect(programRepo.get(ppl.id)?.name).toBe('Push Pull Legs');
  });

  it('deleting a program soft-deletes its routines, exercises and plan rows but keeps session history', () => {
    const p = programRepo.create('PPL');
    const r = routineRepo.create(p.id, 'Legs', 'legs');
    const re = routineExerciseRepo.add(r.id, 'back_squat');
    weekPlanRepo.ensureEntry(p.id, r.id, [3]);
    const s = sessionRepo.start({ routineId: r.id, date: '2026-10-08', resolve });
    sessionRepo.finish(s.id, { intensity: 'moderate', kcal: 200, durationSec: 3600 });
    programRepo.remove(p.id);
    expect(programRepo.list()).toHaveLength(0);
    expect(routineRepo.get(r.id)).toBeUndefined();
    expect(routineExerciseRepo.get(re.id)).toBeUndefined();
    expect(weekPlanRepo.listByProgram(p.id)).toHaveLength(0);
    // snapshot ในประวัติยังอยู่ (F6)
    expect(sessionRepo.listCompleted()[0]).toMatchObject({
      programName: 'PPL',
      routineName: 'Legs',
      routineType: 'legs',
    });
  });

  it('reorders routine exercises', () => {
    const p = programRepo.create('P');
    const r = routineRepo.create(p.id, 'R');
    const a = routineExerciseRepo.add(r.id, 'a');
    const b = routineExerciseRepo.add(r.id, 'b');
    const c = routineExerciseRepo.add(r.id, 'c');
    routineExerciseRepo.reorder(r.id, [c.id, a.id, b.id]);
    expect(routineExerciseRepo.listByRoutine(r.id).map((e) => e.exerciseId)).toEqual(['c', 'a', 'b']);
  });

  it('week plan: toggle days, copy a day, enable switch, switch the whole week (E)', () => {
    const p = programRepo.create('PPL');
    const push = routineRepo.create(p.id, 'Push', 'push');
    const pull = routineRepo.create(p.id, 'Pull', 'pull');
    const e1 = weekPlanRepo.ensureEntry(p.id, push.id, [1, 4]);
    const e2 = weekPlanRepo.ensureEntry(p.id, pull.id, [3]);
    weekPlanRepo.toggleDay(e1.id, 4);
    weekPlanRepo.toggleDay(e1.id, 6);
    expect(weekPlanRepo.get(e1.id)?.days).toEqual([1, 6]);
    // วันพุธ (3) ให้เหมือนวันจันทร์ (1): push เข้า, pull ออก
    weekPlanRepo.copyDay(p.id, 1, 3);
    expect(weekPlanRepo.get(e1.id)?.days).toEqual([1, 3, 6]);
    expect(weekPlanRepo.get(e2.id)?.days).toEqual([]);
    weekPlanRepo.setEnabled(e1.id, false);
    expect(weekPlanRepo.get(e1.id)?.enabled).toBe(false);
    weekPlanRepo.setActiveProgram(p.id);
    expect(weekPlanRepo.activeProgramId()).toBe(p.id);
    expect(weekPlanRepo.ensureEntry(p.id, push.id).id).toBe(e1.id);
  });

  it('a date override replaces the plan for that day only and can be cleared', () => {
    dayOverrideRepo.set('2026-10-09', 'rest');
    dayOverrideRepo.set('2026-10-09', 'routine', 'r1');
    expect(dayOverrideRepo.getForDate('2026-10-09')).toMatchObject({ kind: 'routine', routineId: 'r1' });
    dayOverrideRepo.set('2026-10-09', 'empty', 'ignored');
    expect(dayOverrideRepo.getForDate('2026-10-09')).toMatchObject({ kind: 'empty', routineId: null });
    expect(dayOverrideRepo.getForDate('2026-10-10')).toBeUndefined();
    dayOverrideRepo.clear('2026-10-09');
    expect(dayOverrideRepo.getForDate('2026-10-09')).toBeUndefined();
  });

  it('two overrides for one date (made offline on two devices) resolve to the newest and clear together', () => {
    const a = dayOverrideRepo.set('2026-10-09', 'rest');
    t += 1000;
    // จำลองแถวที่สองจากอีกเครื่อง (ซิงก์ลงมาโดยไม่ผ่าน set)
    const b = createRow('day_override', { date: '2026-10-09', kind: 'routine', routineId: 'r2' });
    expect(dayOverrideRepo.listForDate('2026-10-09').map((o) => o.id)).toEqual([b.id, a.id]);
    expect(dayOverrideRepo.getForDate('2026-10-09')).toMatchObject({ kind: 'routine', routineId: 'r2' });
    // ตั้งใหม่ → รวมเหลือแถวเดียว
    t += 1000;
    dayOverrideRepo.set('2026-10-09', 'empty');
    expect(dayOverrideRepo.listForDate('2026-10-09')).toHaveLength(1);
    dayOverrideRepo.clear('2026-10-09');
    expect(dayOverrideRepo.listForDate('2026-10-09')).toHaveLength(0);
  });

  it('deleting a routine removes the date overrides that point to it', () => {
    const p = programRepo.create('PPL');
    const r = routineRepo.create(p.id, 'Push', 'push');
    dayOverrideRepo.set('2026-10-12', 'routine', r.id);
    dayOverrideRepo.set('2026-10-13', 'rest');
    routineRepo.remove(r.id);
    expect(dayOverrideRepo.getForDate('2026-10-12')).toBeUndefined();
    expect(dayOverrideRepo.getForDate('2026-10-13')).toMatchObject({ kind: 'rest' });
  });

  it('copyDay/toggleDay use the tested domain rules and only write changed rows', () => {
    const p = programRepo.create('Mine');
    const r1 = routineRepo.create(p.id, 'A', 'upper');
    const r2 = routineRepo.create(p.id, 'B', 'lower');
    const e1 = weekPlanRepo.ensureEntry(p.id, r1.id, [1]);
    const e2 = weekPlanRepo.ensureEntry(p.id, r2.id, [3]);
    weekPlanRepo.toggleDay(e1.id, 5);
    weekPlanRepo.toggleDay(e1.id, 5);
    weekPlanRepo.toggleDay(e1.id, 3);
    expect(weekPlanRepo.get(e1.id)?.days).toEqual([1, 3]);
    const before = weekPlanRepo.get(e2.id)!.updatedAt;
    t += 1000;
    weekPlanRepo.copyDay(p.id, 1, 4); // วันพฤหัสได้ A เหมือนวันจันทร์
    expect(weekPlanRepo.get(e1.id)?.days).toEqual([1, 3, 4]);
    expect(weekPlanRepo.get(e2.id)?.updatedAt).toBe(before);
  });

  it('sessions snapshot names and carry previous performance into the next session (G1)', () => {
    const p = programRepo.create('PPL');
    const r = routineRepo.create(p.id, 'Push A', 'push');
    routineExerciseRepo.add(r.id, 'barbell_bench_press', {
      sets: 2,
      repMin: 8,
      repMax: 12,
      targetWeightKg: 60,
      targetReps: 8,
    });
    const s1 = sessionRepo.start({ routineId: r.id, date: '2026-10-06', resolve });
    expect(s1).toMatchObject({
      programName: 'PPL',
      routineName: 'Push A',
      routineType: 'push',
      status: 'active',
    });
    expect(sessionRepo.getActive()?.id).toBe(s1.id);
    const [ex] = sessionRepo.exercisesInSession(s1.id);
    expect(ex).toMatchObject({ exerciseName: 'name:barbell_bench_press', muscleGroup: 'chest' });
    const sets = sessionRepo.setsOfExercise(ex.id);
    expect(sets.map((s) => [s.targetWeightKg, s.targetReps])).toEqual([
      [60, 8],
      [60, 8],
    ]);
    sessionRepo.updateSet(sets[0].id, { reps: 10 });
    sessionRepo.setDone(sets[0].id, true);
    sessionRepo.setDone(sets[1].id, true);
    const extra = sessionRepo.addSet(ex.id)!;
    expect(extra.setIndex).toBe(2);
    sessionRepo.removeSet(extra.id);
    sessionRepo.finish(s1.id, { intensity: 'hard', kcal: 300, durationSec: 3000 });
    expect(sessionRepo.getActive()).toBeUndefined();

    // ชื่อ routine เปลี่ยนภายหลัง → snapshot เดิมไม่เปลี่ยน
    routineRepo.update(r.id, { name: 'Push Heavy' });
    expect(sessionRepo.get(s1.id)?.routineName).toBe('Push A');

    const s2 = sessionRepo.start({ routineId: r.id, date: '2026-10-09', resolve });
    const [ex2] = sessionRepo.exercisesInSession(s2.id);
    const sets2 = sessionRepo.setsOfExercise(ex2.id);
    expect(sets2.map((s) => [s.prevWeightKg, s.prevReps])).toEqual([
      [60, 10],
      [60, 8],
    ]);
    expect(sessionRepo.lastPerformance('barbell_bench_press', s2.id)?.date).toBe('2026-10-06');
    expect(routineRepo.lastPerformedDate(r.id)).toBe('2026-10-06');
  });

  it('can add, swap, reorder and remove exercises mid-session, and log empty/backfilled sessions', () => {
    const s = sessionRepo.start({ date: '2026-10-01', backfilled: true, resolve });
    expect(s).toMatchObject({ routineId: null, programName: null, backfilled: true });
    const a = sessionRepo.addExercise(s.id, 'push_up', resolve, { sets: 3 });
    const b = sessionRepo.addExercise(s.id, 'back_squat', resolve, { sets: 2 });
    sessionRepo.reorderExercises(s.id, [b.id, a.id]);
    expect(sessionRepo.exercisesInSession(s.id).map((e) => e.exerciseId)).toEqual(['back_squat', 'push_up']);
    sessionRepo.swapExercise(a.id, 'front_squat', resolve);
    expect(
      sessionRepo
        .setsOfExercise(a.id)
        .every((x) => x.exerciseId === 'front_squat' && x.muscleGroup === 'quads'),
    ).toBe(true);
    sessionRepo.removeExercise(b.id);
    expect(sessionRepo.exercisesInSession(s.id)).toHaveLength(1);
    sessionRepo.remove(s.id);
    expect(sessionRepo.get(s.id)).toBeUndefined();
  });

  it('swapping mid-exercise keeps done sets on the original exercise (history and 1RM stay correct)', () => {
    const s = sessionRepo.start({ date: '2026-10-09', resolve });
    const bench = sessionRepo.addExercise(s.id, 'barbell_bench_press', resolve, {
      sets: 3,
      targetWeightKg: 80,
      targetReps: 5,
    });
    const after = sessionRepo.addExercise(s.id, 'triceps_pushdown', resolve, { sets: 2 });
    const [first] = sessionRepo.setsOfExercise(bench.id);
    sessionRepo.setDone(first.id, true);

    const newId = sessionRepo.swapExercise(bench.id, 'dumbbell_bench_press', resolve)!;
    expect(newId).not.toBe(bench.id);
    // เซ็ตที่ทำแล้วยังเป็นบาร์เบลเบนช์ 80 kg
    expect(sessionRepo.setsOfExercise(bench.id)).toEqual([
      expect.objectContaining({ id: first.id, exerciseId: 'barbell_bench_press', weightKg: 80, done: true }),
    ]);
    // เซ็ตที่เหลือย้ายเป็นท่าใหม่ ไม่พกน้ำหนักของท่าเดิมมา (ไม่มีประวัติ)
    const moved = sessionRepo.setsOfExercise(newId);
    expect(moved).toHaveLength(2);
    expect(
      moved.every((x) => x.exerciseId === 'dumbbell_bench_press' && !x.done && x.weightKg === null),
    ).toBe(true);
    expect(moved.map((x) => x.setIndex)).toEqual([0, 1]);
    // ท่าใหม่อยู่ต่อจากท่าเดิม
    expect(sessionRepo.exercisesInSession(s.id).map((e) => e.id)).toEqual([bench.id, newId, after.id]);
  });

  it('swapping an exercise whose sets are all done changes nothing and returns the same id', () => {
    const s = sessionRepo.start({ date: '2026-10-09', resolve });
    const bench = sessionRepo.addExercise(s.id, 'barbell_bench_press', resolve, { sets: 2 });
    for (const set of sessionRepo.setsOfExercise(bench.id)) sessionRepo.setDone(set.id, true);

    expect(sessionRepo.swapExercise(bench.id, 'dumbbell_bench_press', resolve)).toBe(bench.id);
    expect(sessionRepo.exercisesInSession(s.id)).toHaveLength(1);
    expect(sessionRepo.setsOfExercise(bench.id).every((x) => x.exerciseId === 'barbell_bench_press')).toBe(
      true,
    );
  });

  it('removes any set and renumbers the rest; retargets without overwriting typed values; resizes sets', () => {
    const s = sessionRepo.start({ date: '2026-10-09', resolve });
    const bench = sessionRepo.addExercise(s.id, 'barbell_bench_press', resolve, {
      sets: 4,
      targetWeightKg: 60,
      targetReps: 8,
    });
    const [a, b, c, d] = sessionRepo.setsOfExercise(bench.id);
    // ลบเซ็ตกลางท่า → เลขเซ็ตที่เหลือต่อเนื่อง
    sessionRepo.removeSet(b.id);
    expect(sessionRepo.setsOfExercise(bench.id).map((x) => [x.id, x.setIndex])).toEqual([
      [a.id, 0],
      [c.id, 1],
      [d.id, 2],
    ]);

    // ปรับเป้า: เซ็ตที่ผู้ใช้พิมพ์น้ำหนักเองไม่ถูกทับ, เซ็ตที่เสร็จแล้วไม่เปลี่ยน
    sessionRepo.setDone(a.id, true);
    sessionRepo.updateSet(c.id, { weightKg: 62.5 });
    sessionRepo.retargetPending(bench.id, { targetWeightKg: 65, targetReps: 6 });
    const byId = new Map(sessionRepo.setsOfExercise(bench.id).map((x) => [x.id, x]));
    expect(byId.get(a.id)).toMatchObject({ targetWeightKg: 60, weightKg: 60, reps: 8, done: true });
    expect(byId.get(c.id)).toMatchObject({ targetWeightKg: 65, targetReps: 6, weightKg: 62.5, reps: 6 });
    expect(byId.get(d.id)).toMatchObject({ targetWeightKg: 65, targetReps: 6, weightKg: 65, reps: 6 });

    // เปลี่ยนจำนวนเซ็ต: เพิ่มต่อท้าย / ลดโดยไม่ลบเซ็ตที่ทำแล้ว
    sessionRepo.resizeSets(bench.id, 5);
    expect(sessionRepo.setsOfExercise(bench.id).map((x) => x.setIndex)).toEqual([0, 1, 2, 3, 4]);
    sessionRepo.resizeSets(bench.id, 1);
    expect(sessionRepo.setsOfExercise(bench.id).map((x) => x.id)).toEqual([a.id]);
  });

  it('daily log upserts one row per date', () => {
    dailyLogRepo.upsert('2026-10-09', { kcalIntake: 2000 });
    dailyLogRepo.upsert('2026-10-09', { bodyWeightKg: 70.5 });
    dailyLogRepo.upsert('2026-10-10', { kcalExpenditureOverride: 2600 });
    expect(dailyLogRepo.get('2026-10-09')).toMatchObject({ kcalIntake: 2000, bodyWeightKg: 70.5 });
    expect(dailyLogRepo.listBetween({ start: '2026-10-01', end: '2026-10-09' })).toHaveLength(1);
  });

  it('custom exercises and owner scoping', () => {
    const c = customExerciseRepo.create({
      name: ' Sled push ',
      primaryMuscle: 'quads',
      secondaryMuscles: ['glutes'],
      equipment: 'other',
    });
    expect(customExerciseRepo.list().map((e) => e.name)).toEqual(['Sled push']);
    setOwner('someone-else');
    expect(customExerciseRepo.list()).toHaveLength(0);
    setOwner(USER);
    customExerciseRepo.remove(c.id);
    expect(customExerciseRepo.list()).toHaveLength(0);
    expect(customExerciseRepo.getAny(c.id)?.name).toBe('Sled push');
    // getAny เห็นแถวที่ถูกลบ แต่ต้องไม่ข้ามเจ้าของ
    setOwner('someone-else');
    expect(customExerciseRepo.getAny(c.id)).toBeUndefined();
    setOwner(USER);
  });

  it('every write is queued for sync', () => {
    const p = programRepo.create('P');
    programRepo.rename(p.id, 'Q');
    expect(pendingCount(USER)).toBe(1);
    routineRepo.create(p.id, 'R');
    expect(pendingCount(USER)).toBe(2);
  });
});
