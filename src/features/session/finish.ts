import { transaction } from '../../db/client';
import { profileRepo } from '../../db/repos/profileRepo';
import { routineExerciseRepo } from '../../db/repos/routineExerciseRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { Intensity, ProgressionDecision, RoutineExercise, SessionProgression } from '../../db/schema';
import { exerciseKcal } from '../../domain/nutrition';
import { applySuggestion, suggestNext, type Suggestion } from '../../domain/progression';
import { sessionDurationSec } from '../../domain/sessionSummary';
import { now } from '../../utils/clock';

/** คำนวณ "เป้าหมายครั้งหน้า" จากผลของเซสชันนี้ เทียบกับค่าตั้งของท่า ณ ตอนจบเซสชัน */
function computeProgression(sessionId: string): SessionProgression[] {
  const unit = profileRepo.get()?.weightUnit ?? 'kg';
  const sets = sessionRepo.sets(sessionId);
  const out: SessionProgression[] = [];
  for (const ex of sessionRepo.exercises(sessionId)) {
    if (!ex.routineExerciseId) continue;
    const config = routineExerciseRepo.get(ex.routineExerciseId);
    if (!config) continue;
    const mine = sets.filter((s) => s.sessionExerciseId === ex.id);
    const s = suggestNext({ config, lastSets: mine.length > 0 ? mine : null, unit, now: now() });
    out.push({
      sessionExerciseId: ex.id,
      routineExerciseId: config.id,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      targetWeightKg: s.targetWeightKg,
      targetReps: s.targetReps,
      reason: s.reason,
      failStreak: s.failStreak,
      deloadOffered: s.deloadOffered,
      decision: null,
    });
  }
  return out;
}

/**
 * จบเซสชัน (SPEC G1): เลือกความหนัก → คำนวณแคลอรี่ (MET × น้ำหนักตัว × ชั่วโมง H2)
 * เซสชันย้อนหลังใช้ระยะเวลาที่ผู้ใช้กรอก
 * คำนวณ "เป้าหมายครั้งหน้า" ครั้งเดียวตรงนี้ และบันทึกจำนวนครั้งที่พลาดติดกัน (linear) ทันที
 * — นับพลาดแม้ผู้ใช้ไม่กดอะไรในหน้าสรุป (G2) ส่วนเป้าน้ำหนัก/ครั้งเปลี่ยนเมื่อผู้ใช้ยอมรับเท่านั้น
 */
export function finishSession(id: string, intensity: Intensity, durationSecOverride?: number): number | null {
  const session = sessionRepo.get(id);
  if (!session) return null;
  if (session.status === 'completed') return session.kcal;
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
  transaction(() => {
    const progression = computeProgression(id);
    for (const p of progression) {
      const config = routineExerciseRepo.get(p.routineExerciseId);
      if (config?.progressionMode === 'linear' && config.failStreak !== p.failStreak) {
        routineExerciseRepo.update(p.routineExerciseId, { failStreak: p.failStreak });
      }
    }
    sessionRepo.finish(id, { intensity, kcal, durationSec, endedAt, bodyWeightKg: weightKg, progression });
  });
  return kcal;
}

export interface ExerciseSuggestion {
  sessionId: string;
  sessionExerciseId: string;
  exerciseName: string;
  routineExercise: RoutineExercise;
  suggestion: Suggestion;
  decision: ProgressionDecision | null;
}

function toSuggestion(p: SessionProgression): Suggestion {
  return {
    targetWeightKg: p.targetWeightKg,
    targetReps: p.targetReps,
    reason: p.reason,
    failStreak: p.failStreak,
    deloadOffered: p.deloadOffered,
  };
}

/** "เป้าหมายครั้งหน้า" ที่บันทึกไว้ตอนจบเซสชัน (ไม่คำนวณใหม่ จึงไม่เปลี่ยนเองหลังกดยอมรับ) */
export function suggestionsFor(sessionId: string): ExerciseSuggestion[] {
  const session = sessionRepo.get(sessionId);
  if (!session || session.status !== 'completed') return [];
  const out: ExerciseSuggestion[] = [];
  for (const p of session.progression ?? []) {
    const config = routineExerciseRepo.get(p.routineExerciseId);
    if (!config) continue;
    out.push({
      sessionId,
      sessionExerciseId: p.sessionExerciseId,
      exerciseName: p.exerciseName,
      routineExercise: config,
      suggestion: toSuggestion(p),
      decision: p.decision,
    });
  }
  return out;
}

/** บันทึกการตัดสินใจครั้งเดียวต่อท่าต่อเซสชัน — กดซ้ำ/กลับมาหน้าเดิมไม่บันทึกซ้ำ */
function decide(s: ExerciseSuggestion, decision: ProgressionDecision, apply: () => void): void {
  transaction(() => {
    const session = sessionRepo.get(s.sessionId);
    const list = session?.progression ?? [];
    const entry = list.find((p) => p.sessionExerciseId === s.sessionExerciseId);
    if (!session || !entry || entry.decision) return;
    apply();
    sessionRepo.setProgression(
      s.sessionId,
      list.map((p) => (p === entry ? { ...p, decision } : p)),
    );
  });
}

export function acceptSuggestion(s: ExerciseSuggestion): void {
  decide(s, 'accepted', () =>
    routineExerciseRepo.update(s.routineExercise.id, applySuggestion(s.suggestion)),
  );
}

/** ข้าม: เป้าเดิมไม่เปลี่ยน (จำนวนครั้งที่พลาดบันทึกไปแล้วตอนจบเซสชัน) */
export function declineSuggestion(s: ExerciseSuggestion): void {
  decide(s, 'skipped', () => undefined);
}

export function setCustomTarget(s: ExerciseSuggestion, weightKg: number | null, reps: number): void {
  decide(s, 'adjusted', () =>
    routineExerciseRepo.update(s.routineExercise.id, { targetWeightKg: weightKg, targetReps: reps }),
  );
}
