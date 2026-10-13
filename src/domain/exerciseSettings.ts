import type { CustomWeek, ProgressionMode, RoutineExercise, WeightUnit } from '../db/schema';
import { changeProgressionMode } from './progression';
import { lbToKg, weightToKg } from './units';

/**
 * ตั้งค่าท่าใน routine (SPEC G2) — ฟังก์ชันล้วนสำหรับแปลงค่าในฟอร์มเป็นฟิลด์ที่บันทึก
 */

export type RestChoice = 'default' | 'off' | 'custom';

/** เวลาพักต่อท่าที่บันทึกได้ต่ำสุด (วินาที) */
export const MIN_SAVED_REST_SEC = 5;
/** ตัวปรับเวลาพักในฟอร์มลดได้ต่ำสุดเท่านี้ (วินาที) — สูงกว่าค่าที่บันทึกได้ เพื่อไม่ให้ค่า 5–9 ที่เคยตั้งไว้ถูกดันขึ้นถ้าผู้ใช้ไม่แตะ */
export const MIN_REST_STEPPER_SEC = 10;
export const MAX_REST_STEPPER_SEC = 600;
export const REST_STEPPER_STEP_SEC = 15;

export const MAX_CUSTOM_WEEKS = 8;
export const WEEK_PERCENT = { min: 20, max: 150, step: 2.5 } as const;

/** restSec ที่เก็บ: null = ใช้ค่าเริ่มต้น, 0 = ปิด, >0 = กำหนดเอง */
export function restChoiceOf(restSec: number | null): RestChoice {
  if (restSec === null) return 'default';
  return restSec === 0 ? 'off' : 'custom';
}

export function restSecOf(choice: RestChoice, customSec: number): number | null {
  if (choice === 'default') return null;
  return choice === 'off' ? 0 : Math.max(MIN_SAVED_REST_SEC, customSec);
}

/** สัปดาห์เริ่มต้นของโหมดกำหนดเอง: 100% ที่ครั้งสูงสุด แล้วเพิ่มน้ำหนักขึ้นครั้งลดลง */
export function defaultCustomWeeks(repMin: number, repMax: number): CustomWeek[] {
  return [
    { reps: repMax, percent: 100 },
    { reps: Math.max(repMin, repMax - 2), percent: 105 },
    { reps: repMin, percent: 110 },
  ];
}

export interface ExerciseSettingsPatch {
  sets: number;
  repMin: number;
  repMax: number;
  progressionMode: ProgressionMode;
  failStreak: number;
  progressionStartedAt: number | null;
  weightStepKg: number;
  rir: number | null;
  rpe: number | null;
  restSec: number | null;
  customWeeks: CustomWeek[] | null;
  baseWeightKg: number | null;
}

/** ค่าที่ผู้ใช้กรอกในฟอร์ม (น้ำหนักเป็นหน่วยของผู้ใช้) */
export interface ExerciseSettingsForm {
  sets: number;
  repMin: number;
  repMax: number;
  mode: ProgressionMode;
  /** ก้าวน้ำหนักในหน่วยของผู้ใช้ */
  step: number;
  rir: number | null;
  rpe: number | null;
  restChoice: RestChoice;
  customRestSec: number;
  weeks: CustomWeek[];
  /** น้ำหนักตั้งต้นของโหมดกำหนดเอง (หน่วยของผู้ใช้) — null/ไม่เป็นบวก = คงค่าเดิม */
  baseWeight: number | null;
}

export function buildSettingsPatch(
  current: RoutineExercise,
  form: ExerciseSettingsForm,
  unit: WeightUnit,
  nowMs: number,
): ExerciseSettingsPatch {
  return {
    sets: form.sets,
    repMin: Math.min(form.repMin, form.repMax),
    repMax: Math.max(form.repMin, form.repMax),
    ...changeProgressionMode(current, form.mode, nowMs),
    weightStepKg: unit === 'lb' ? lbToKg(form.step) : form.step,
    rir: form.rir,
    rpe: form.rpe,
    restSec: restSecOf(form.restChoice, form.customRestSec),
    customWeeks: form.mode === 'custom' ? form.weeks : current.customWeeks,
    baseWeightKg:
      form.baseWeight !== null && form.baseWeight > 0
        ? weightToKg(form.baseWeight, unit)
        : current.baseWeightKg,
  };
}
