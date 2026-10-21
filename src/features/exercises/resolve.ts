import { customExerciseRepo } from '../../db/repos/customExerciseRepo';
import type { ExerciseResolver } from '../../db/repos/sessionRepo';
import {
  exerciseName,
  fromCustom,
  getBuiltIn,
  mergeExercises,
  type ExerciseInfo,
} from '../../data/exerciseLibrary';
import { currentLanguage } from '../../i18n';

/** ข้อมูลท่าจาก id (ท่าในคลังหรือท่าที่สร้างเอง รวมที่ถูกลบแล้วเพื่อแสดงในประวัติ) */
export function exerciseInfo(id: string): ExerciseInfo | undefined {
  const builtIn = getBuiltIn(id);
  if (builtIn) return { ...builtIn, isCustom: false };
  const custom = customExerciseRepo.getAny(id);
  return custom ? fromCustom(custom) : undefined;
}

/** ชื่อท่าในภาษาปัจจุบัน */
export function exerciseDisplayName(id: string): string {
  const info = exerciseInfo(id);
  return info ? exerciseName(info, currentLanguage()) : id;
}

/** ใช้ตอนสร้างเซสชัน: snapshot ชื่อท่าและกลุ่มกล้ามเนื้อหลัก */
export const resolveExercise: ExerciseResolver = (id) => {
  const info = exerciseInfo(id);
  return { name: info ? exerciseName(info, currentLanguage()) : id, muscle: info?.primary ?? 'core' };
};

/** ท่าทั้งหมดที่เลือกได้ (ท่าที่สร้างเองที่ยังไม่ถูกลบ + คลัง) */
export function allExercises(): ExerciseInfo[] {
  return mergeExercises(customExerciseRepo.list());
}
