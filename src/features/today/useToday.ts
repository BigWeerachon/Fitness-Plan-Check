import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo, routineRepo } from '../../db/repos/programRepo';
import { routineExerciseRepo } from '../../db/repos/routineExerciseRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import { dayOverrideRepo, weekPlanRepo } from '../../db/repos/weekPlanRepo';
import type { DayOverride, MuscleGroup, Program, Routine, WorkoutSession } from '../../db/schema';
import { toLocalDate, type LocalDate } from '../../domain/dates';
import { dailyExpenditure, nutritionSummary, type DailyExpenditure } from '../../domain/nutrition';
import { estimateSessionMinutes, resolveDayPlan, type DayPlan } from '../../domain/schedule';
import { MUSCLE_GROUPS } from '../../data/exerciseLibrary';
import { now } from '../../utils/clock';
import { exerciseInfo } from '../exercises/resolve';

export interface TodayRoutine {
  routine: Routine;
  programName: string | null;
  exerciseCount: number;
  muscles: MuscleGroup[];
  estMinutes: number;
  lastDone: LocalDate | null;
}

export interface TodayModel {
  date: LocalDate;
  program: Program | null;
  hasAnyRoutine: boolean;
  plan: DayPlan;
  override: DayOverride | undefined;
  routines: TodayRoutine[];
  /** routine อื่นที่สร้างไว้ (สำหรับ "วันนี้อยากทำอะไร") */
  others: TodayRoutine[];
  activeSession: WorkoutSession | undefined;
  completedToday: WorkoutSession[];
  /** กลุ่มกล้ามเนื้อของแผนวันนี้ (ใช้เป็นเช็กลิสต์) */
  plannedMuscles: MuscleGroup[];
  /** กลุ่มกล้ามเนื้อที่มีเซ็ตเสร็จแล้ววันนี้ */
  doneMuscles: MuscleGroup[];
  expenditure: DailyExpenditure;
  intakeKcal: number | null;
  targetKcal: number | null;
}

function describeRoutine(
  routine: Routine,
  programs: Map<string, Program>,
  defaultRest: number,
): TodayRoutine {
  const exercises = routineExerciseRepo.listByRoutine(routine.id);
  const muscles: MuscleGroup[] = [];
  for (const e of exercises) {
    const m = exerciseInfo(e.exerciseId)?.primary;
    if (m && !muscles.includes(m)) muscles.push(m);
  }
  return {
    routine,
    programName: programs.get(routine.programId)?.name ?? null,
    exerciseCount: exercises.length,
    muscles,
    estMinutes: estimateSessionMinutes(
      exercises.map((e) => ({ sets: e.sets, restSec: e.restSec })),
      defaultRest,
    ),
    lastDone: routineRepo.lastPerformedDate(routine.id),
  };
}

/** รวบรวมทุกอย่างที่หน้าแรกต้องใช้ (SPEC D) จากฐานข้อมูลในเครื่อง */
export function loadToday(date: LocalDate = toLocalDate(now())): TodayModel {
  const profile = profileRepo.get();
  const programs = new Map(programRepo.list().map((p) => [p.id, p]));
  const activeId = profile?.activeProgramId ?? null;
  const program = (activeId && programs.get(activeId)) || null;
  const defaultRest = profile?.restTimerEnabled === false ? 0 : (profile?.restTimerSec ?? 90);
  const override = dayOverrideRepo.getForDate(date);
  const plan = resolveDayPlan({
    entries: program ? weekPlanRepo.listForProgram(program.id) : [],
    overrides: override ? [override] : [],
    date,
  });
  const allRoutines = routineRepo.listAll().filter((r) => programs.has(r.programId));
  const byId = new Map(allRoutines.map((r) => [r.id, r]));
  const routines = plan.routineIds
    .map((id) => byId.get(id))
    .filter((r): r is Routine => !!r)
    .map((r) => describeRoutine(r, programs, defaultRest));
  const others = allRoutines
    .filter((r) => !plan.routineIds.includes(r.id))
    .sort((a, b) => (a.programId === activeId ? -1 : 0) - (b.programId === activeId ? -1 : 0))
    .map((r) => describeRoutine(r, programs, defaultRest));

  const todaySessions = sessionRepo.listForDate(date);
  const completedToday = todaySessions.filter((s) => s.status === 'completed');
  const doneSets = sessionRepo.setsForSessions(todaySessions.map((s) => s.id)).filter((s) => s.done);
  const doneMuscles = MUSCLE_GROUPS.filter((m) => doneSets.some((s) => s.muscleGroup === m));
  const plannedMuscles = MUSCLE_GROUPS.filter((m) => routines.some((r) => r.muscles.includes(m)));
  const log = dailyLogRepo.get(date);
  const summary = profile ? nutritionSummary(profile) : null;

  return {
    date,
    program,
    hasAnyRoutine: allRoutines.length > 0,
    plan,
    override,
    routines,
    others,
    activeSession: sessionRepo.getActive(),
    completedToday,
    plannedMuscles,
    doneMuscles,
    expenditure: dailyExpenditure({
      manualKcal: log?.kcalExpenditureOverride,
      sessionKcals: completedToday.map((s) => s.kcal),
    }),
    intakeKcal: log?.kcalIntake ?? null,
    targetKcal: summary?.target.kcal ?? null,
  };
}
