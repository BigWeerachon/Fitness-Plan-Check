import type { ActivityLevel, Goal, LengthUnit, Sex, WeightUnit } from '../db/schema';
import { cmToFtIn, displayWeight, ftInToCm, kgToLb, roundTo, weightToKg } from './units';

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

/**
 * อ่านข้อความที่ผู้ใช้กรอกเป็นตัวเลข (รับจุลภาคเป็นจุดทศนิยม)
 * null = ช่องว่าง, NaN = กรอกผิด (อ่านเป็นตัวเลขไม่ได้) — ค่าสองแบบนี้ต่างกัน
 */
function parseNumberInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** มีตัวเลขที่อ่านได้ (ไม่ว่างและไม่ใช่ NaN) */
function isReadable(n: number | null): n is number {
  return n !== null && !Number.isNaN(n);
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

/** ส่วนสูงเป็น cm จากช่องที่กรอก (ftin: ว่างข้างเดียวนับเป็น 0; ช่องใดกรอกผิด → NaN) */
function parseHeightCm(f: ProfileForm): number | null {
  if (f.lengthUnit === 'cm') return parseNumberInput(f.heightCm);
  const ft = parseNumberInput(f.heightFt);
  const inches = parseNumberInput(f.heightIn);
  if (Number.isNaN(ft) || Number.isNaN(inches)) return NaN;
  return ft === null && inches === null ? null : ftInToCm(ft ?? 0, inches ?? 0);
}

/** น้ำหนักเป็น kg จากช่องที่กรอก (ว่าง → null, กรอกผิด → NaN) */
function parseWeightKg(f: ProfileForm): number | null {
  const w = parseNumberInput(f.weight);
  return isReadable(w) ? weightToKg(w, f.weightUnit) : w;
}

/** ตรวจและแปลงเป็นค่าที่บันทึก (kg/cm) — คืน errors ถ้ามีช่องที่อยู่นอกช่วง */
export function parseProfileForm(f: ProfileForm): { values: ProfileValues; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const age = parseNumberInput(f.age);
  const heightCm = parseHeightCm(f);
  const weightKg = parseWeightKg(f);

  // displayScale: ตัวคูณแปลงช่วง (kg/cm) เป็นหน่วยที่ผู้ใช้เห็น เพื่อใส่ในข้อความ error
  const recordIfOutOfRange = (
    field: ProfileField,
    value: number | null,
    range: { min: number; max: number },
    displayScale = 1,
  ) => {
    if (value === null) return;
    if (Number.isNaN(value) || value < range.min || value > range.max) {
      errors[field] = {
        min: roundTo(range.min * displayScale, 0),
        max: roundTo(range.max * displayScale, 0),
      };
    }
  };
  // อายุต้องเป็นจำนวนเต็ม — ทศนิยมนับเป็นกรอกผิด
  const ageInput = age === null || Number.isInteger(age) ? age : NaN;
  recordIfOutOfRange('age', ageInput, PROFILE_RANGES.age);
  recordIfOutOfRange('height', heightCm, PROFILE_RANGES.heightCm);
  recordIfOutOfRange('weight', weightKg, PROFILE_RANGES.weightKg, f.weightUnit === 'lb' ? kgToLb(1) : 1);

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

function switchWeightUnit(f: ProfileForm, unit: WeightUnit): ProfileForm {
  if (unit === f.weightUnit) return f;
  const w = parseNumberInput(f.weight);
  return {
    ...f,
    weightUnit: unit,
    weight: isReadable(w) ? String(displayWeight(weightToKg(w, f.weightUnit), unit)) : f.weight,
  };
}

function switchLengthUnit(f: ProfileForm, unit: LengthUnit): ProfileForm {
  if (unit === f.lengthUnit) return f;
  if (unit === 'ftin') {
    const cm = parseNumberInput(f.heightCm);
    const ftIn = isReadable(cm) ? cmToFtIn(cm) : null;
    return {
      ...f,
      lengthUnit: 'ftin',
      heightFt: ftIn ? String(ftIn.ft) : f.heightFt,
      heightIn: ftIn ? String(ftIn.in) : f.heightIn,
    };
  }
  const ft = parseNumberInput(f.heightFt);
  const inches = parseNumberInput(f.heightIn);
  // ว่างได้ข้างเดียว (นับเป็น 0) แต่ต้องไม่มีช่องที่กรอกผิด
  const valid = !Number.isNaN(ft) && !Number.isNaN(inches) && (ft !== null || inches !== null);
  return {
    ...f,
    lengthUnit: 'cm',
    heightCm: valid ? String(roundTo(ftInToCm(ft ?? 0, inches ?? 0), 1)) : f.heightCm,
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
  return switchLengthUnit(
    switchWeightUnit(f, next.weightUnit ?? f.weightUnit),
    next.lengthUnit ?? f.lengthUnit,
  );
}
