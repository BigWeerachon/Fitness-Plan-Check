import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { now } from '../../utils/clock';
import { getDb, transaction } from '../client';
import { createRow, softDeleteRow, updateRow } from '../mutations';
import {
  program,
  routine,
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
import { live } from './query';

/** ชื่อและกลุ่มกล้ามเนื้อหลักของท่า ณ ตอนนี้ (เก็บเป็น snapshot ในเซสชัน) */
export type ExerciseResolver = (exerciseId: string) => { name: string; muscle: MuscleGroup };

export interface PerformedSet {
  weightKg: number | null;
  reps: number | null;
}

export interface StartSessionInput {
  routineId?: string | null;
  date: string;
  backfilled?: boolean;
  bodyWeightKg?: number | null;
  resolve: ExerciseResolver;
  /** เป้าหมายของท่าตอนเริ่มเซสชัน (เช่น โหมด custom ตามสัปดาห์ปัจจุบัน) — ไม่ระบุ = ใช้เป้าที่บันทึกไว้ */
  targetFor?: (re: RoutineExercise) => { weightKg: number | null; reps: number };
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
  listCompleted(range?: { start: string; end: string }): WorkoutSession[] {
    const rows = getDb()
      .select()
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.status, 'completed')))
      .orderBy(desc(workoutSession.date), desc(workoutSession.startedAt))
      .all();
    return range ? rows.filter((s) => s.date >= range.start && s.date <= range.end) : rows;
  },
  listForDate(date: string): WorkoutSession[] {
    return getDb()
      .select()
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.date, date)))
      .orderBy(asc(workoutSession.startedAt))
      .all();
  },
  exercises(sessionId: string): SessionExercise[] {
    return getDb()
      .select()
      .from(sessionExercise)
      .where(live(sessionExercise, eq(sessionExercise.sessionId, sessionId)))
      .orderBy(asc(sessionExercise.sortOrder), asc(sessionExercise.createdAt))
      .all();
  },
  sets(sessionId: string): SessionSet[] {
    return getDb()
      .select()
      .from(sessionSet)
      .where(live(sessionSet, eq(sessionSet.sessionId, sessionId)))
      .orderBy(asc(sessionSet.setIndex))
      .all();
  },
  setsOf(sessionExerciseId: string): SessionSet[] {
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
      const r = input.routineId
        ? getDb()
            .select()
            .from(routine)
            .where(live(routine, eq(routine.id, input.routineId)))
            .get()
        : undefined;
      const p = r
        ? getDb()
            .select()
            .from(program)
            .where(live(program, eq(program.id, r.programId)))
            .get()
        : undefined;
      const session = createRow('workout_session', {
        date: input.date,
        routineId: r?.id ?? null,
        programId: p?.id ?? null,
        programName: p?.name ?? null,
        routineName: r?.name ?? null,
        routineType: r?.type ?? null,
        startedAt: now(),
        status: 'active',
        backfilled: !!input.backfilled,
        bodyWeightKg: input.bodyWeightKg ?? null,
      });
      if (r) {
        for (const re of routineExerciseRepo.listByRoutine(r.id)) {
          const target = input.targetFor?.(re) ?? {
            weightKg: re.targetWeightKg,
            reps: re.targetReps ?? re.repMin,
          };
          sessionRepo.addExercise(session.id, re.exerciseId, input.resolve, {
            sets: re.sets,
            targetWeightKg: target.weightKg,
            targetReps: target.reps,
            routineExerciseId: re.id,
            restSec: re.restSec,
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
      const sortOrder = sessionRepo.exercises(sessionId).length;
      const se = createRow('session_exercise', {
        sessionId,
        exerciseId,
        exerciseName: info.name,
        muscleGroup: info.muscle,
        routineExerciseId: opts.routineExerciseId ?? null,
        sortOrder,
        restSec: opts.restSec ?? null,
      });
      const prev = sessionRepo.lastPerformance(exerciseId, sessionId)?.sets ?? [];
      const count = Math.max(1, opts.sets ?? 3);
      for (let i = 0; i < count; i++) {
        const p = prev[i] ?? prev[prev.length - 1];
        createRow('session_set', {
          sessionId,
          sessionExerciseId: se.id,
          exerciseId,
          muscleGroup: info.muscle,
          setIndex: i,
          targetWeightKg: opts.targetWeightKg ?? p?.weightKg ?? null,
          targetReps: opts.targetReps ?? p?.reps ?? null,
          prevWeightKg: prev[i]?.weightKg ?? null,
          prevReps: prev[i]?.reps ?? null,
          weightKg: opts.targetWeightKg ?? p?.weightKg ?? null,
          reps: opts.targetReps ?? p?.reps ?? null,
          done: false,
        });
      }
      return se;
    });
  },

  removeExercise(sessionExerciseId: string): void {
    transaction(() => {
      for (const s of sessionRepo.setsOf(sessionExerciseId)) softDeleteRow('session_set', s.id);
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
      const se = getDb()
        .select()
        .from(sessionExercise)
        .where(live(sessionExercise, eq(sessionExercise.id, sessionExerciseId)))
        .get();
      if (!se) return undefined;
      const info = resolve(newExerciseId);
      const prev = sessionRepo.lastPerformance(newExerciseId, se.sessionId)?.sets ?? [];
      const sets = sessionRepo.setsOf(se.id);
      const pending = sets.filter((s) => !s.done);
      if (pending.length === 0) return se.id;
      let targetId = se.id;
      if (pending.length < sets.length) {
        // มีเซ็ตที่ทำแล้ว → แยกท่าใหม่เป็นอีกรายการต่อจากท่าเดิม
        for (const e of sessionRepo.exercises(se.sessionId)) {
          if (e.sortOrder > se.sortOrder) updateRow('session_exercise', e.id, { sortOrder: e.sortOrder + 1 });
        }
        targetId = createRow('session_exercise', {
          sessionId: se.sessionId,
          exerciseId: newExerciseId,
          exerciseName: info.name,
          muscleGroup: info.muscle,
          routineExerciseId: null,
          sortOrder: se.sortOrder + 1,
          restSec: se.restSec,
        }).id;
      } else {
        updateRow('session_exercise', se.id, {
          exerciseId: newExerciseId,
          exerciseName: info.name,
          muscleGroup: info.muscle,
          routineExerciseId: null,
        });
      }
      pending.forEach((s, i) => {
        const p = prev[i] ?? prev[prev.length - 1];
        updateRow('session_set', s.id, {
          sessionExerciseId: targetId,
          exerciseId: newExerciseId,
          muscleGroup: info.muscle,
          setIndex: i,
          prevWeightKg: prev[i]?.weightKg ?? null,
          prevReps: prev[i]?.reps ?? null,
          targetWeightKg: p?.weightKg ?? null,
          targetReps: p?.reps ?? s.targetReps,
          weightKg: p?.weightKg ?? null,
          reps: p?.reps ?? s.targetReps,
        });
      });
      return targetId;
    });
  },

  reorderExercises(sessionId: string, orderedIds: string[]): void {
    transaction(() => {
      const current = sessionRepo.exercises(sessionId);
      orderedIds.forEach((id, index) => {
        const row = current.find((r) => r.id === id);
        if (row && row.sortOrder !== index) updateRow('session_exercise', id, { sortOrder: index });
      });
    });
  },

  /** เพิ่มเซ็ตโดยคัดลอกค่าจากเซ็ตสุดท้าย */
  addSet(sessionExerciseId: string): SessionSet | undefined {
    const se = getDb()
      .select()
      .from(sessionExercise)
      .where(live(sessionExercise, eq(sessionExercise.id, sessionExerciseId)))
      .get();
    if (!se) return undefined;
    const sets = sessionRepo.setsOf(sessionExerciseId);
    const last = sets[sets.length - 1];
    return createRow('session_set', {
      sessionId: se.sessionId,
      sessionExerciseId,
      exerciseId: se.exerciseId,
      muscleGroup: se.muscleGroup,
      setIndex: last ? last.setIndex + 1 : 0,
      targetWeightKg: last?.targetWeightKg ?? null,
      targetReps: last?.targetReps ?? null,
      weightKg: last?.weightKg ?? null,
      reps: last?.reps ?? null,
      done: false,
    });
  },

  removeSet(setId: string): void {
    softDeleteRow('session_set', setId);
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
  finish(
    sessionId: string,
    data: {
      intensity: Intensity;
      kcal: number | null;
      durationSec: number;
      endedAt?: number;
      bodyWeightKg?: number | null;
      progression?: SessionProgression[] | null;
    },
  ): void {
    updateRow('workout_session', sessionId, {
      status: 'completed',
      ...(data.progression !== undefined ? { progression: data.progression } : {}),
      intensity: data.intensity,
      kcal: data.kcal,
      durationSec: Math.max(0, Math.round(data.durationSec)),
      endedAt: data.endedAt ?? now(),
      ...(data.bodyWeightKg !== undefined ? { bodyWeightKg: data.bodyWeightKg } : {}),
    });
  },

  setProgression(sessionId: string, progression: SessionProgression[]): void {
    updateRow('workout_session', sessionId, { progression });
  },

  /** ลบเซสชัน (ยกเลิกเซสชันที่กำลังทำ หรือลบจากประวัติ) */
  remove(sessionId: string): void {
    transaction(() => {
      for (const s of sessionRepo.sets(sessionId)) softDeleteRow('session_set', s.id);
      for (const e of sessionRepo.exercises(sessionId)) softDeleteRow('session_exercise', e.id);
      softDeleteRow('workout_session', sessionId);
    });
  },
};
