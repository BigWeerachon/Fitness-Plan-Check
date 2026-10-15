import type { MuscleGroup } from '../db/schema';

/** สรุปเซสชัน (SPEC G1 จบเซสชัน / I1) — ฟังก์ชันล้วน */

export interface SummarySet {
  muscleGroup: MuscleGroup;
  weightKg: number | null;
  reps: number | null;
  done: boolean;
}

export interface SessionTotals {
  setsDone: number;
  setsTotal: number;
  /** ปริมาณรวม = Σ น้ำหนัก × ครั้ง ของเซ็ตที่เสร็จ (kg) */
  volumeKg: number;
  musclesDone: MuscleGroup[];
  musclesRemaining: MuscleGroup[];
  /** 0–1 */
  progress: number;
}

export function sessionTotals(sets: readonly SummarySet[]): SessionTotals {
  const done = sets.filter((s) => s.done);
  const volumeKg = done.reduce((v, s) => v + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
  const all = [...new Set(sets.map((s) => s.muscleGroup))];
  const musclesDone = [...new Set(done.map((s) => s.muscleGroup))];
  return {
    setsDone: done.length,
    setsTotal: sets.length,
    volumeKg: Math.round(volumeKg * 10) / 10,
    musclesDone,
    musclesRemaining: all.filter((m) => !musclesDone.includes(m)),
    progress: sets.length === 0 ? 0 : done.length / sets.length,
  };
}

/** ท่าเสร็จเมื่อทุกเซ็ตถูกติ๊ก (และมีอย่างน้อย 1 เซ็ต) */
export function isExerciseComplete(sets: readonly Pick<SummarySet, 'done'>[]): boolean {
  return sets.length > 0 && sets.every((s) => s.done);
}

/** ระยะเวลาเซสชัน (วินาที) จากเวลาเริ่มถึงตอนจบ — ไม่ติดลบ */
export function sessionDurationSec(startedAt: number, endedAt: number): number {
  return Math.max(0, Math.round((endedAt - startedAt) / 1000));
}

/** เวลาที่เหลือของตัวจับเวลาพัก (วินาที ปัดขึ้น) จากเวลาสิ้นสุด — อิงนาฬิกาจริง จึงถูกต้องแม้สลับแอป */
export function restRemainingSec(endsAt: number | null, nowMs: number): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt - nowMs) / 1000));
}

/** วินาทีพักของท่า: ค่าเฉพาะท่า (0 = ปิด) หรือค่าเริ่มต้น; ปิดทั้งระบบ = 0 */
export function restSecondsFor(exerciseRestSec: number | null, defaultSec: number, enabled: boolean): number {
  if (exerciseRestSec !== null) return Math.max(0, exerciseRestSec);
  return enabled ? Math.max(0, defaultSec) : 0;
}
