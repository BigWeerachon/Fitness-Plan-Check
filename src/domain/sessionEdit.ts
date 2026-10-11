import type { SessionSet } from '../db/schema';

/** การแก้เซ็ตระหว่างเซสชัน (SPEC G1, G2) — ฟังก์ชันล้วน */

const EPS = 1e-6;

function sameWeight(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < EPS;
}

export type RetargetableSet = Pick<
  SessionSet,
  'done' | 'weightKg' | 'reps' | 'targetWeightKg' | 'targetReps'
>;

export interface SetTarget {
  targetWeightKg: number | null;
  targetReps: number;
}

export interface SetTargetPatch extends SetTarget {
  weightKg?: number | null;
  reps?: number;
}

/**
 * ผู้ใช้ปรับเป้าระหว่างฝึก (G2): เซ็ตที่ยังไม่เสร็จได้เป้าใหม่เสมอ
 * แต่ช่องน้ำหนัก/ครั้งที่จะทำถูกเติมค่าใหม่เฉพาะเมื่อยังว่างหรือยังเท่ากับเป้าเดิม (ผู้ใช้ยังไม่ได้พิมพ์เอง)
 * แยกกันทีละช่อง — ค่าที่ผู้ใช้พิมพ์ไว้ไม่ถูกทับ; เซ็ตที่เสร็จแล้วคืน null (ไม่แตะ)
 */
export function retargetSet(set: RetargetableSet, target: SetTarget): SetTargetPatch | null {
  if (set.done) return null;
  const patch: SetTargetPatch = { targetWeightKg: target.targetWeightKg, targetReps: target.targetReps };
  if (set.weightKg === null || sameWeight(set.weightKg, set.targetWeightKg)) {
    patch.weightKg = target.targetWeightKg;
  }
  if (set.reps === null || set.reps === set.targetReps) patch.reps = target.targetReps;
  return patch;
}

/**
 * เปลี่ยนจำนวนเซ็ตของท่าระหว่างฝึก (จากการตั้งค่าท่า): น้อยกว่า → เพิ่มต่อท้าย
 * มากกว่า → ลบเฉพาะเซ็ตที่ยังไม่ทำโดยเริ่มจากท้ายสุด; เซ็ตที่ทำแล้วไม่ถูกลบ (จึงอาจเหลือมากกว่าที่ตั้ง)
 */
export function resizeSets(
  sets: readonly Pick<SessionSet, 'id' | 'done'>[],
  wanted: number,
): { add: number; removeIds: string[] } {
  const target = Math.max(1, Math.round(wanted));
  if (sets.length <= target) return { add: target - sets.length, removeIds: [] };
  const removeIds: string[] = [];
  let excess = sets.length - target;
  for (let i = sets.length - 1; i >= 0 && excess > 0; i--) {
    if (!sets[i].done) {
      removeIds.push(sets[i].id);
      excess--;
    }
  }
  return { add: 0, removeIds };
}
