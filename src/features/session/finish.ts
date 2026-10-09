import { profileRepo } from '../../db/repos/profileRepo';
import { routineExerciseRepo } from '../../db/repos/routineExerciseRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { Intensity, RoutineExercise } from '../../db/schema';
import { exerciseKcal } from '../../domain/nutrition';
import { applySuggestion, skipSuggestion, suggestNext, type Suggestion } from '../../domain/progression';
import { sessionDurationSec } from '../../domain/sessionSummary';
import { now } from '../../utils/clock';

/**
 * จบเซสชัน (SPEC G1): เลือกความหนัก → คำนวณแคลอรี่ (MET × น้ำหนักตัว × ชั่วโมง H2)
 * เซสชันย้อนหลังใช้ระยะเวลาที่ผู้ใช้กรอก
 */
export function finishSession(id: string, intensity: Intensity, durationSecOverride?: number): number | null {
  const session = sessionRepo.get(id);
  if (!session) return null;
  const profile = profileRepo.get();
  const endedAt = now();
  const durationSec = durationSecOverride ?? sessionDurationSec(session.startedAt, endedAt);
  const weightKg = session.bodyWeightKg ?? profile?.weightKg ?? null;
  const kcal =
    weightKg != null
      ? exerciseKcal({
          intensity,
          weightKg,
          durationSec,
          mets: profile
            ? { light: profile.metLight, moderate: profile.metModerate, hard: profile.metHard }
            : null,
        })
      : null;
  sessionRepo.finish(id, { intensity, kcal, durationSec, endedAt, bodyWeightKg: weightKg });
  return kcal;
}

export interface ExerciseSuggestion {
  sessionExerciseId: string;
  exerciseName: string;
  routineExercise: RoutineExercise;
  suggestion: Suggestion;
}

/** "เป้าหมายครั้งหน้า" ของทุกท่าที่มาจาก routine (G2) — คำแนะนำที่ยอมรับ/ปรับ/ข้ามได้ */
export function suggestionsFor(sessionId: string): ExerciseSuggestion[] {
  const unit = profileRepo.get()?.weightUnit ?? 'kg';
  const sets = sessionRepo.sets(sessionId);
  const out: ExerciseSuggestion[] = [];
  for (const ex of sessionRepo.exercises(sessionId)) {
    if (!ex.routineExerciseId) continue;
    const config = routineExerciseRepo.get(ex.routineExerciseId);
    if (!config) continue;
    const mine = sets.filter((s) => s.sessionExerciseId === ex.id);
    const suggestion = suggestNext({ config, lastSets: mine.length > 0 ? mine : null, unit, now: now() });
    out.push({
      sessionExerciseId: ex.id,
      exerciseName: ex.exerciseName,
      routineExercise: config,
      suggestion,
    });
  }
  return out;
}

export function acceptSuggestion(s: ExerciseSuggestion): void {
  routineExerciseRepo.update(s.routineExercise.id, applySuggestion(s.suggestion));
}

export function declineSuggestion(s: ExerciseSuggestion): void {
  routineExerciseRepo.update(s.routineExercise.id, skipSuggestion(s.suggestion));
}

export function setCustomTarget(s: ExerciseSuggestion, weightKg: number | null, reps: number): void {
  routineExerciseRepo.update(s.routineExercise.id, {
    targetWeightKg: weightKg,
    targetReps: reps,
    failStreak: s.suggestion.failStreak,
  });
}
