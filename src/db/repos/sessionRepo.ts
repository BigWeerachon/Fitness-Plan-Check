import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { now } from '../../utils/clock';
import { getDb, transaction } from '../client';
import { isInRange, type DateRange } from '../../domain/periods';
import { previousSetFor, resizeSets, retargetSet, type SetTarget } from '../../domain/sessionEdit';
import { createRow, getRow, softDeleteRow, updateRow } from '../mutations';
import {
  DEFAULT_SET_COUNT,
  sessionExercise,
  sessionSet,
  workoutSession,
  type Intensity,
  type MuscleGroup,
  type RoutineExercise,
  type SessionExercise,
  type SessionProgression,
  type SessionSet,
  type WorkoutSession,
} from '../schema';
import { routineExerciseRepo } from './routineExerciseRepo';
import { programRepo, routineRepo } from './programRepo';
import { live } from './query';

/** ชื่อและกลุ่มกล้ามเนื้อหลักของท่า ณ ตอนนี้ (เก็บเป็น snapshot ในเซสชัน) */
export type ExerciseResolver = (exerciseId: string) => { name: string; muscle: MuscleGroup };

export interface PerformedSet {
  weightKg: number | null;
  reps: number | null;
}

export interface FinishSessionInput {
  intensity: Intensity;
  kcal: number | null;
  durationSec: number;
  endedAt?: number;
  /** undefined = ไม่แตะ, null = ล้างค่า */
  bodyWeightKg?: number | null;
  /** undefined = ไม่แตะ, null = ล้างค่า */
  progression?: SessionProgression[] | null;
}

export interface StartSessionInput {
  routineId?: string | null;
  date: string;
  backfilled?: boolean;
  bodyWeightKg?: number | null;
  resolve: ExerciseResolver;
  /** เป้าหมายของท่าตอนเริ่มเซสชัน (เช่น โหมด custom ตามสัปดาห์ปัจจุบัน) — ไม่ระบุ = ใช้เป้าที่บันทึกไว้ */
  targetFor?: (routineExercise: RoutineExercise) => { weightKg: number | null; reps: number };
}

type ResolvedExercise = ReturnType<ExerciseResolver>;

/** สร้างท่าใหม่ต่อจากท่าเดิม (ดันท่าที่อยู่หลังขึ้นไปหนึ่งลำดับ) แล้วคืน id ของท่าใหม่ */
function splitOffSwappedExercise(
  currentExercise: SessionExercise,
  newExerciseId: string,
  info: ResolvedExercise,
): string {
  for (const otherExercise of sessionRepo.exercisesInSession(currentExercise.sessionId)) {
    if (otherExercise.sortOrder > currentExercise.sortOrder) {
      updateRow('session_exercise', otherExercise.id, { sortOrder: otherExercise.sortOrder + 1 });
    }
  }
  return createRow('session_exercise', {
    sessionId: currentExercise.sessionId,
    exerciseId: newExerciseId,
    exerciseName: info.name,
    muscleGroup: info.muscle,
    routineExerciseId: null,
    sortOrder: currentExercise.sortOrder + 1,
    restSec: currentExercise.restSec,
  }).id;
}

/** เปลี่ยนท่าเดิมเป็นท่าใหม่ในที่ (ใช้เมื่อยังไม่มีเซ็ตที่ทำแล้ว) */
function replaceExerciseInPlace(
  currentExercise: SessionExercise,
  newExerciseId: string,
  info: ResolvedExercise,
): void {
  updateRow('session_exercise', currentExercise.id, {
    exerciseId: newExerciseId,
    exerciseName: info.name,
    muscleGroup: info.muscle,
    routineExerciseId: null,
  });
}

/** เซสชันการฝึก (SPEC G1, F6, M) — ทุกเซสชันเก็บ snapshot ชื่อกรุ๊ป/routine/ประเภท และกลุ่มกล้ามเนื้อของแต่ละเซ็ต */
export const sessionRepo = {
  get(id: string): WorkoutSession | undefined {
    return getDb()
      .select()
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.id, id)))
      .get();
  },
  /** เซสชันที่ยังไม่จบ (กลับมาทำต่อได้หลังปิดแอป) */
  getActive(): WorkoutSession | undefined {
    return getDb()
      .select()
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.status, 'active')))
      .orderBy(desc(workoutSession.startedAt))
      .get();
  },
  listCompleted(range?: DateRange): WorkoutSession[] {
    const rows = getDb()
      .select()
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.status, 'completed')))
      .orderBy(desc(workoutSession.date), desc(workoutSession.startedAt))
      .all();
    return range ? rows.filter((s) => isInRange(s.date, range)) : rows;
  },
  listForDate(date: string): WorkoutSession[] {
    return getDb()
      .select()
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.date, date)))
      .orderBy(asc(workoutSession.startedAt))
      .all();
  },
  exercise(id: string): SessionExercise | undefined {
    return getDb()
      .select()
      .from(sessionExercise)
      .where(live(sessionExercise, eq(sessionExercise.id, id)))
      .get();
  },
  exercisesInSession(sessionId: string): SessionExercise[] {
    return getDb()
      .select()
      .from(sessionExercise)
      .where(live(sessionExercise, eq(sessionExercise.sessionId, sessionId)))
      .orderBy(asc(sessionExercise.sortOrder), asc(sessionExercise.createdAt))
      .all();
  },
  setsInSession(sessionId: string): SessionSet[] {
    return getDb()
      .select()
      .from(sessionSet)
      .where(live(sessionSet, eq(sessionSet.sessionId, sessionId)))
      .orderBy(asc(sessionSet.setIndex))
      .all();
  },
  setsOfExercise(sessionExerciseId: string): SessionSet[] {
    return getDb()
      .select()
      .from(sessionSet)
      .where(live(sessionSet, eq(sessionSet.sessionExerciseId, sessionExerciseId)))
      .orderBy(asc(sessionSet.setIndex))
      .all();
  },
  /** เซ็ตทั้งหมดของหลายเซสชัน (ใช้คิดสถิติ) */
  setsForSessions(sessionIds: string[]): SessionSet[] {
    if (sessionIds.length === 0) return [];
    return getDb()
      .select()
      .from(sessionSet)
      .where(live(sessionSet, inArray(sessionSet.sessionId, sessionIds)))
      .all();
  },

  /**
   * ผลงานครั้งก่อนของท่านี้ = เซ็ตที่ทำเสร็จในเซสชันล่าสุดที่จบแล้วซึ่งมีท่านี้ (ใช้แสดง "ครั้งก่อน" และคำนวณ progression)
   */
  lastPerformance(
    exerciseId: string,
    excludeSessionId?: string,
  ): { sessionId: string; date: string; sets: PerformedSet[] } | null {
    const candidates = getDb()
      .select({ id: workoutSession.id, date: workoutSession.date, startedAt: workoutSession.startedAt })
      .from(workoutSession)
      .innerJoin(sessionSet, eq(sessionSet.sessionId, workoutSession.id))
      .where(
        and(
          live(workoutSession, eq(workoutSession.status, 'completed')),
          eq(sessionSet.exerciseId, exerciseId),
          eq(sessionSet.done, true),
        ),
      )
      .orderBy(desc(workoutSession.date), desc(workoutSession.startedAt))
      .all()
      .filter((c) => c.id !== excludeSessionId);
    const latest = candidates[0];
    if (!latest) return null;
    const sets = getDb()
      .select()
      .from(sessionSet)
      .where(
        live(
          sessionSet,
          eq(sessionSet.sessionId, latest.id),
          eq(sessionSet.exerciseId, exerciseId),
          eq(sessionSet.done, true),
        ),
      )
      .orderBy(asc(sessionSet.setIndex))
      .all();
    return {
      sessionId: latest.id,
      date: latest.date,
      sets: sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
    };
  },

  /** เริ่มเซสชันจาก routine (หรือเซสชันเปล่าถ้าไม่ระบุ) พร้อมเป้าหมายครั้งนี้และผลครั้งก่อน */
  start(input: StartSessionInput): WorkoutSession {
    return transaction(() => {
      const routineRow = input.routineId ? routineRepo.get(input.routineId) : undefined;
      const programRow = routineRow ? programRepo.get(routineRow.programId) : undefined;
      const session = createRow('workout_session', {
        date: input.date,
        routineId: routineRow?.id ?? null,
        programId: programRow?.id ?? null,
        programName: programRow?.name ?? null,
        routineName: routineRow?.name ?? null,
        routineType: routineRow?.type ?? null,
        startedAt: now(),
        status: 'active',
        backfilled: !!input.backfilled,
        bodyWeightKg: input.bodyWeightKg ?? null,
      });
      if (routineRow) {
        for (const routineExercise of routineExerciseRepo.listByRoutine(routineRow.id)) {
          const target = input.targetFor?.(routineExercise) ?? {
            weightKg: routineExercise.targetWeightKg,
            reps: routineExercise.targetReps ?? routineExercise.repMin,
          };
          sessionRepo.addExercise(session.id, routineExercise.exerciseId, input.resolve, {
            sets: routineExercise.sets,
            targetWeightKg: target.weightKg,
            targetReps: target.reps,
            routineExerciseId: routineExercise.id,
            restSec: routineExercise.restSec,
          });
        }
      }
      return session;
    });
  },

  addExercise(
    sessionId: string,
    exerciseId: string,
    resolve: ExerciseResolver,
    opts: {
      sets?: number;
      targetWeightKg?: number | null;
      targetReps?: number | null;
      routineExerciseId?: string | null;
      restSec?: number | null;
    } = {},
  ): SessionExercise {
    return transaction(() => {
      const info = resolve(exerciseId);
      const sortOrder = sessionRepo.exercisesInSession(sessionId).length;
      const sessionExerciseRow = createRow('session_exercise', {
        sessionId,
        exerciseId,
        exerciseName: info.name,
        muscleGroup: info.muscle,
        routineExerciseId: opts.routineExerciseId ?? null,
        sortOrder,
        restSec: opts.restSec ?? null,
      });
      const previousSets = sessionRepo.lastPerformance(exerciseId, sessionId)?.sets ?? [];
      const count = Math.max(1, opts.sets ?? DEFAULT_SET_COUNT);
      for (let i = 0; i < count; i++) {
        const seedSet = previousSetFor(previousSets, i);
        createRow('session_set', {
          sessionId,
          sessionExerciseId: sessionExerciseRow.id,
          exerciseId,
          muscleGroup: info.muscle,
          setIndex: i,
          targetWeightKg: opts.targetWeightKg ?? seedSet?.weightKg ?? null,
          targetReps: opts.targetReps ?? seedSet?.reps ?? null,
          prevWeightKg: previousSets[i]?.weightKg ?? null,
          prevReps: previousSets[i]?.reps ?? null,
          weightKg: opts.targetWeightKg ?? seedSet?.weightKg ?? null,
          reps: opts.targetReps ?? seedSet?.reps ?? null,
          done: false,
        });
      }
      return sessionExerciseRow;
    });
  },

  removeExercise(sessionExerciseId: string): void {
    transaction(() => {
      for (const s of sessionRepo.setsOfExercise(sessionExerciseId)) softDeleteRow('session_set', s.id);
      softDeleteRow('session_exercise', sessionExerciseId);
    });
  },

  /**
   * สลับท่าระหว่างเซสชัน: เซ็ตที่ทำแล้วคงเป็นท่าเดิม (ประวัติ, 1RM, "ครั้งก่อน" ถูกต้อง) ส่วนเซ็ตที่ยังไม่ทำย้ายไปเป็นท่าใหม่
   * พร้อมเป้าหมาย/ค่าจากครั้งก่อนของท่าใหม่ (ไม่มีประวัติ → ไม่ใส่น้ำหนักเดิมของอีกท่า)
   * คืน id ของ session_exercise ที่เป็นท่าใหม่
   */
  swapExercise(
    sessionExerciseId: string,
    newExerciseId: string,
    resolve: ExerciseResolver,
  ): string | undefined {
    return transaction(() => {
      const currentExercise = sessionRepo.exercise(sessionExerciseId);
      if (!currentExercise) return undefined;
      const newExerciseInfo = resolve(newExerciseId);
      const previousSets = sessionRepo.lastPerformance(newExerciseId, currentExercise.sessionId)?.sets ?? [];
      const sets = sessionRepo.setsOfExercise(currentExercise.id);
      const pendingSets = sets.filter((s) => !s.done);
      if (pendingSets.length === 0) return currentExercise.id;
      const hasDoneSets = pendingSets.length < sets.length;
      // มีเซ็ตที่ทำแล้ว → แยกท่าใหม่เป็นอีกรายการต่อจากท่าเดิม; ยังไม่มี → เปลี่ยนท่าเดิมในที่
      let targetId = currentExercise.id;
      if (hasDoneSets) targetId = splitOffSwappedExercise(currentExercise, newExerciseId, newExerciseInfo);
      else replaceExerciseInPlace(currentExercise, newExerciseId, newExerciseInfo);
      pendingSets.forEach((pendingSet, i) => {
        const previousSet = previousSetFor(previousSets, i);
        updateRow('session_set', pendingSet.id, {
          sessionExerciseId: targetId,
          exerciseId: newExerciseId,
          muscleGroup: newExerciseInfo.muscle,
          setIndex: i,
          prevWeightKg: previousSets[i]?.weightKg ?? null,
          prevReps: previousSets[i]?.reps ?? null,
          targetWeightKg: previousSet?.weightKg ?? null,
          targetReps: previousSet?.reps ?? pendingSet.targetReps,
          weightKg: previousSet?.weightKg ?? null,
          reps: previousSet?.reps ?? pendingSet.targetReps,
        });
      });
      return targetId;
    });
  },

  reorderExercises(sessionId: string, orderedIds: string[]): void {
    transaction(() => {
      const current = sessionRepo.exercisesInSession(sessionId);
      orderedIds.forEach((id, index) => {
        const row = current.find((r) => r.id === id);
        if (row && row.sortOrder !== index) updateRow('session_exercise', id, { sortOrder: index });
      });
    });
  },

  /** เพิ่มเซ็ตโดยคัดลอกค่าจากเซ็ตสุดท้าย */
  addSet(sessionExerciseId: string): SessionSet | undefined {
    const exerciseRow = sessionRepo.exercise(sessionExerciseId);
    if (!exerciseRow) return undefined;
    const sets = sessionRepo.setsOfExercise(sessionExerciseId);
    const last = sets[sets.length - 1];
    return createRow('session_set', {
      sessionId: exerciseRow.sessionId,
      sessionExerciseId,
      exerciseId: exerciseRow.exerciseId,
      muscleGroup: exerciseRow.muscleGroup,
      setIndex: last ? last.setIndex + 1 : 0,
      targetWeightKg: last?.targetWeightKg ?? null,
      targetReps: last?.targetReps ?? null,
      weightKg: last?.weightKg ?? null,
      reps: last?.reps ?? null,
      done: false,
    });
  },

  /** ลบเซ็ตใดก็ได้ แล้วเรียงเลขเซ็ตที่เหลือของท่านั้นใหม่ให้ต่อเนื่อง (ประวัติ/CSV ไม่มีเลขเซ็ตข้าม) */
  removeSet(setId: string): void {
    transaction(() => {
      const row = getRow('session_set', setId);
      if (!row) return;
      softDeleteRow('session_set', setId);
      sessionRepo.setsOfExercise(row.sessionExerciseId).forEach((s, i) => {
        if (s.setIndex !== i) updateRow('session_set', s.id, { setIndex: i });
      });
    });
  },

  /** ปรับเป้าของเซ็ตที่ยังไม่เสร็จ — ค่าที่ผู้ใช้พิมพ์เองไม่ถูกทับ (G2, ดู retargetSet) */
  retargetPending(sessionExerciseId: string, target: SetTarget): void {
    transaction(() => {
      for (const s of sessionRepo.setsOfExercise(sessionExerciseId)) {
        const patch = retargetSet(s, target);
        if (patch) updateRow('session_set', s.id, patch);
      }
    });
  },

  /** ตั้งจำนวนเซ็ตของท่าใหม่ระหว่างฝึก (เพิ่มต่อท้าย / ลบเซ็ตที่ยังไม่ทำจากท้าย ไม่ลบเซ็ตที่ทำแล้ว) */
  resizeSets(sessionExerciseId: string, wanted: number): void {
    transaction(() => {
      const plan = resizeSets(sessionRepo.setsOfExercise(sessionExerciseId), wanted);
      for (const id of plan.removeIds) sessionRepo.removeSet(id);
      for (let i = 0; i < plan.add; i++) sessionRepo.addSet(sessionExerciseId);
    });
  },

  updateSet(
    setId: string,
    patch: Partial<Pick<SessionSet, 'weightKg' | 'reps' | 'targetWeightKg' | 'targetReps'>>,
  ): void {
    updateRow('session_set', setId, patch);
  },

  setDone(setId: string, done: boolean): void {
    updateRow('session_set', setId, { done, completedAt: done ? now() : null });
  },

  setExerciseRest(sessionExerciseId: string, restSec: number | null): void {
    updateRow('session_exercise', sessionExerciseId, { restSec });
  },

  /** จบเซสชัน: บันทึกความหนัก แคลอรี่ และระยะเวลา (SPEC G1) */
  finish(sessionId: string, summary: FinishSessionInput): void {
    updateRow('workout_session', sessionId, {
      status: 'completed',
      ...(summary.progression !== undefined ? { progression: summary.progression } : {}),
      intensity: summary.intensity,
      kcal: summary.kcal,
      durationSec: Math.max(0, Math.round(summary.durationSec)),
      endedAt: summary.endedAt ?? now(),
      ...(summary.bodyWeightKg !== undefined ? { bodyWeightKg: summary.bodyWeightKg } : {}),
    });
  },

  setProgression(sessionId: string, progression: SessionProgression[]): void {
    updateRow('workout_session', sessionId, { progression });
  },

  /** ลบเซสชัน (ยกเลิกเซสชันที่กำลังทำ หรือลบจากประวัติ) */
  remove(sessionId: string): void {
    transaction(() => {
      for (const s of sessionRepo.setsInSession(sessionId)) softDeleteRow('session_set', s.id);
      for (const e of sessionRepo.exercisesInSession(sessionId)) softDeleteRow('session_exercise', e.id);
      softDeleteRow('workout_session', sessionId);
    });
  },
};
