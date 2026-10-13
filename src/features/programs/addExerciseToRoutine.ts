import { profileRepo } from '../../db/repos/profileRepo';
import { routineExerciseRepo } from '../../db/repos/routineExerciseRepo';
import { preferredWeightStepKg } from '../../domain/progression';

/** จำนวนครั้งเป้าหมายเริ่มต้นของท่าที่ผู้ใช้เพิ่มเข้า routine เอง */
const DEFAULT_TARGET_REPS = 8;

/** เพิ่มท่าเข้าท้าย routine โดยใช้ก้าวน้ำหนักที่ผู้ใช้ตั้งไว้ในโปรไฟล์ (ไม่มีโปรไฟล์ = kg ก้าวมาตรฐาน) */
export function addExerciseToRoutine(routineId: string, exerciseId: string): void {
  const profile = profileRepo.get();
  routineExerciseRepo.add(routineId, exerciseId, {
    weightStepKg: preferredWeightStepKg(profile?.weightUnit ?? 'kg', profile?.weightStepKg),
    targetReps: DEFAULT_TARGET_REPS,
  });
}
