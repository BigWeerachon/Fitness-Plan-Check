import type { TFunction } from 'i18next';
import type { WeightUnit } from '../../db/schema';
import { formatWeight } from '../../domain/units';
import { exerciseInfo } from '../exercises/resolve';

export function isBodyweightExercise(exerciseId: string): boolean {
  return exerciseInfo(exerciseId)?.equipment === 'bodyweight';
}

/**
 * ข้อความ "น้ำหนัก × ครั้ง" ของเซ็ต/เป้าหมาย:
 * ไม่มีน้ำหนัก → ท่าบอดี้เวทแสดง "น้ำหนักตัว × 8" ส่วนท่าที่ใช้อุปกรณ์แสดงแค่ "8 ครั้ง" (ยังไม่ได้กำหนดน้ำหนัก)
 */
export function formatSet(
  t: TFunction,
  opts: {
    weightKg: number | null;
    reps: number | null;
    unit: WeightUnit;
    bodyweight: boolean;
    withUnit?: boolean;
  },
): string {
  const { weightKg, reps, unit, bodyweight, withUnit } = opts;
  if (weightKg == null && reps == null) return t('session.none');
  if (weightKg != null) {
    const w = `${formatWeight(weightKg, unit)}${withUnit ? ` ${t(`common.units.${unit}`)}` : ''}`;
    return `${w} × ${reps ?? t('session.none')}`;
  }
  if (bodyweight) return `${t('session.bodyweight')} × ${reps}`;
  return t('session.repsCount', { count: reps ?? 0 });
}
