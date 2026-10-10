import { profileRepo } from '../../db/repos/profileRepo';
import { routineExerciseRepo } from '../../db/repos/routineExerciseRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { RoutineExercise, SessionExercise, SessionSet, WorkoutSession } from '../../db/schema';
import { sessionTotals, type SessionTotals } from '../../domain/sessionSummary';

export interface SessionExerciseView {
  exercise: SessionExercise;
  sets: SessionSet[];
  config: RoutineExercise | undefined;
}

export interface SessionData {
  session: WorkoutSession;
  exercises: SessionExerciseView[];
  totals: SessionTotals;
  unit: 'kg' | 'lb';
  restDefaultSec: number;
  restEnabled: boolean;
  bodyWeightKg: number | null;
}

export function loadSession(id: string): SessionData | null {
  const session = sessionRepo.get(id);
  if (!session) return null;
  const profile = profileRepo.get();
  const allSets = sessionRepo.sets(id);
  const exercises = sessionRepo.exercises(id).map((exercise) => ({
    exercise,
    sets: allSets.filter((s) => s.sessionExerciseId === exercise.id).sort((a, b) => a.setIndex - b.setIndex),
    config: exercise.routineExerciseId ? routineExerciseRepo.get(exercise.routineExerciseId) : undefined,
  }));
  return {
    session,
    exercises,
    totals: sessionTotals(exercises.flatMap((e) => e.sets)),
    unit: profile?.weightUnit ?? 'kg',
    restDefaultSec: profile?.restTimerSec ?? 90,
    restEnabled: profile?.restTimerEnabled ?? true,
    bodyWeightKg: session.bodyWeightKg ?? profile?.weightKg ?? null,
  };
}
