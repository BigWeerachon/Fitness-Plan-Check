import type { ActivityLevel, Goal, LengthUnit, Sex, WeightUnit } from '../db/schema';
import { cmToFtIn, displayWeight, ftInToCm, roundTo, weightToKg } from './units';

/**
 * แปลงและตรวจค่าที่ผู้ใช้กรอกในฟอร์มโปรไฟล์ (SPEC C ขั้น 2, H1) — ทุกช่องไม่บังคับ แต่ถ้ากรอกต้องอยู่ในช่วงที่สมเหตุสมผล
 * ค่าในฟอร์มเป็นข้อความตามหน่วยที่ผู้ใช้เลือก ค่าที่บันทึกเป็น kg/cm เสมอ
 */

export const PROFILE_RANGES = {
  age: { min: 13, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
} as const;

export interface ProfileValues {
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
}

export interface ProfileForm {
  sex: Sex | null;
  age: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
}

export type ProfileField = 'age' | 'height' | 'weight';
export type ProfileErrors = Partial<Record<ProfileField, { min: number; max: number }>>;

function num(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function formFromValues(v: Partial<ProfileValues>): ProfileForm {
  const weightUnit = v.weightUnit ?? 'kg';
  const lengthUnit = v.lengthUnit ?? 'cm';
  const ftIn = v.heightCm ? cmToFtIn(v.heightCm) : null;
  return {
    sex: v.sex ?? null,
    age: v.age != null ? String(v.age) : '',
    heightCm: v.heightCm != null ? String(roundTo(v.heightCm, 1)) : '',
    heightFt: ftIn ? String(ftIn.ft) : '',
    heightIn: ftIn ? String(ftIn.in) : '',
    weight: v.weightKg != null ? String(displayWeight(v.weightKg, weightUnit)) : '',
    activityLevel: v.activityLevel ?? null,
    goal: v.goal ?? null,
    weightUnit,
    lengthUnit,
  };
}

/** ตรวจและแปลงเป็นค่าที่บันทึก (kg/cm) — คืน errors ถ้ามีช่องที่อยู่นอกช่วง */
export function parseProfileForm(f: ProfileForm): { values: ProfileValues; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const age = num(f.age);
  let heightCm: number | null;
  if (f.lengthUnit === 'cm') heightCm = num(f.heightCm);
  else {
    const ft = num(f.heightFt);
    const inches = num(f.heightIn);
    heightCm = ft === null && inches === null ? null : ftInToCm(ft ?? 0, inches ?? 0);
    if (Number.isNaN(ft) || Number.isNaN(inches)) heightCm = NaN;
  }
  const w = num(f.weight);
  const weightKg = w === null || Number.isNaN(w) ? w : weightToKg(w, f.weightUnit);

  const check = (
    field: ProfileField,
    value: number | null,
    range: { min: number; max: number },
    factor = 1,
  ) => {
    if (value === null) return;
    if (Number.isNaN(value) || value < range.min || value > range.max) {
      errors[field] = { min: roundTo(range.min * factor, 0), max: roundTo(range.max * factor, 0) };
    }
  };
  check('age', age === null || Number.isNaN(age) || Number.isInteger(age) ? age : NaN, PROFILE_RANGES.age);
  check('height', heightCm, PROFILE_RANGES.heightCm);
  check('weight', weightKg, PROFILE_RANGES.weightKg, f.weightUnit === 'lb' ? 1 / 0.45359237 : 1);

  return {
    values: {
      sex: f.sex,
      age: errors.age ? null : age,
      heightCm: errors.height || heightCm === null ? null : roundTo(heightCm, 1),
      weightKg: errors.weight || weightKg === null ? null : roundTo(weightKg, 2),
      activityLevel: f.activityLevel,
      goal: f.goal,
      weightUnit: f.weightUnit,
      lengthUnit: f.lengthUnit,
    },
    errors,
  };
}

/**
 * สลับหน่วยในฟอร์มโดยแปลงค่าที่กรอกไว้ให้ด้วย (เช่น 70 kg → 154.3 lb) ไม่ให้ตัวเลขเดิมถูกตีความเป็นหน่วยใหม่
 * ค่าที่อ่านไม่ได้คงไว้ตามเดิมเพื่อให้ผู้ใช้เห็นและแก้เอง
 */
export function switchFormUnits(
  f: ProfileForm,
  next: { weightUnit?: WeightUnit; lengthUnit?: LengthUnit },
): ProfileForm {
  let out = { ...f };
  if (next.weightUnit && next.weightUnit !== f.weightUnit) {
    const w = num(f.weight);
    out = {
      ...out,
      weightUnit: next.weightUnit,
      weight:
        w === null || Number.isNaN(w)
          ? f.weight
          : String(displayWeight(weightToKg(w, f.weightUnit), next.weightUnit)),
    };
  }
  if (next.lengthUnit && next.lengthUnit !== f.lengthUnit) {
    if (next.lengthUnit === 'ftin') {
      const cm = num(f.heightCm);
      const ftIn = cm === null || Number.isNaN(cm) ? null : cmToFtIn(cm);
      out = {
        ...out,
        lengthUnit: 'ftin',
        heightFt: ftIn ? String(ftIn.ft) : f.heightFt,
        heightIn: ftIn ? String(ftIn.in) : f.heightIn,
      };
    } else {
      const ft = num(f.heightFt);
      const inches = num(f.heightIn);
      const valid = !Number.isNaN(ft) && !Number.isNaN(inches) && (ft !== null || inches !== null);
      out = {
        ...out,
        lengthUnit: 'cm',
        heightCm: valid ? String(roundTo(ftInToCm(ft ?? 0, inches ?? 0), 1)) : f.heightCm,
      };
    }
  }
  return out;
}
