import type { ActivityLevel, Goal, Intensity, Sex } from '../db/schema';

/**
 * สูตรโปรไฟล์และโภชนาการ (SPEC H2–H3) — ฟังก์ชันล้วน มี unit test ครบ
 * แหล่งอ้างอิง (H6): Mifflin et al. 1990, ISSN Protein and Exercise 2017, Compendium of Physical Activities 2024
 * คำอธิบายระดับกิจกรรมแบบภาษาง่ายอยู่ใน i18n (ไฟล์นี้มีแค่รายการระดับและตัวคูณ)
 */

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

export const ACTIVITY_MULTIPLIERS: Readonly<Record<ActivityLevel, number>> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOALS: readonly Goal[] = ['lose', 'maintain', 'gain'];

/** % ลดจาก TDEE เมื่อเป้าหมายลดไขมัน (ค่าเริ่มต้น 20 ปรับได้ 10–25) */
export const DEFICIT_PCT = { default: 20, min: 10, max: 25 } as const;
/** % เพิ่มจาก TDEE เมื่อเป้าหมายเพิ่มกล้าม (ค่าเริ่มต้น 10 ปรับได้ 5–20) */
export const SURPLUS_PCT = { default: 10, min: 5, max: 20 } as const;
/** เพดานความปลอดภัย: ไม่แนะนำแคลอรี่ต่ำกว่านี้ */
export const KCAL_FLOOR: Readonly<Record<Sex, number>> = { female: 1200, male: 1500 };
/** อายุต่ำกว่านี้ไม่แสดงเป้าลดน้ำหนัก */
export const ADULT_AGE = 18;

/** โปรตีน g/kg/วัน ค่าเริ่มต้นตามเป้าหมาย (อยู่ในช่วง 1.6–2.2, ลดไขมัน = ปลายสูง) */
export const PROTEIN_PER_KG_DEFAULT: Readonly<Record<Goal, number>> = { lose: 2.2, maintain: 1.8, gain: 2.0 };
export const PROTEIN_PER_KG_RANGE = { min: 1.6, max: 2.2 } as const;
/** ไขมัน % ของแคลอรี่เป้าหมาย */
export const FAT_PCT_DEFAULT = 25;

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** MET ตามความหนักของเซสชัน (แก้ได้ในโปรไฟล์) */
export const DEFAULT_MET: Readonly<Record<Intensity, number>> = { light: 3.5, moderate: 5, hard: 6 };

export interface BodyStats {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** BMR สูตร Mifflin-St Jeor (kcal/วัน ไม่ปัดเศษ) */
export function bmr({ sex, age, heightCm, weightKg }: BodyStats): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/** TDEE = BMR × ตัวคูณกิจกรรม (ไม่ปัดเศษ) */
export function tdee(bmrKcal: number, level: ActivityLevel): number {
  return bmrKcal * ACTIVITY_MULTIPLIERS[level];
}

export interface CalorieTargetInput {
  tdee: number;
  goal: Goal;
  sex: Sex;
  age: number;
  /** % ลด (lose) — ถูกบีบให้อยู่ในช่วง 10–25 */
  deficitPct?: number | null;
  /** % เพิ่ม (gain) — ถูกบีบให้อยู่ในช่วง 5–20 */
  surplusPct?: number | null;
}

export interface CalorieTarget {
  /** แคลอรี่เป้าหมายต่อวัน (จำนวนเต็ม) */
  kcal: number;
  /** เป้าหมายที่ใช้จริง (อายุ < 18 ที่เลือกลดไขมัน → maintain) */
  goal: Goal;
  /** % ที่ใช้จริงหลังบีบช่วง (ลดหรือเพิ่ม), 0 เมื่อคงที่ */
  adjustPct: number;
  /** ค่าที่คำนวณได้ต่ำกว่าเพดานความปลอดภัย จึงใช้ค่าเพดานแทน */
  floorApplied: boolean;
  /** อายุต่ำกว่า 18 ปี เลือกลดไขมัน → ไม่ให้เป้าลดน้ำหนัก ใช้แคลอรี่คงที่แทน */
  minorNoDeficit: boolean;
}

function pctOrDefault(
  value: number | null | undefined,
  range: { default: number; min: number; max: number },
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, range.min, range.max)
    : range.default;
}

/**
 * แคลอรี่เป้าหมาย: ลด = TDEE × (1 − ลด%), คงที่ = TDEE, เพิ่ม = TDEE × (1 + เพิ่ม%)
 * เพดานความปลอดภัย (หญิง 1,200 / ชาย 1,500) ใช้กับทุกเป้าหมาย เทียบหลังปัดเป็นจำนวนเต็ม
 */
export function targetCalories(input: CalorieTargetInput): CalorieTarget {
  const minorNoDeficit = input.goal === 'lose' && input.age < ADULT_AGE;
  const goal: Goal = minorNoDeficit ? 'maintain' : input.goal;
  let adjustPct = 0;
  let raw = input.tdee;
  if (goal === 'lose') {
    adjustPct = pctOrDefault(input.deficitPct, DEFICIT_PCT);
    raw = input.tdee * (1 - adjustPct / 100);
  } else if (goal === 'gain') {
    adjustPct = pctOrDefault(input.surplusPct, SURPLUS_PCT);
    raw = input.tdee * (1 + adjustPct / 100);
  }
  const rounded = Math.round(raw);
  const floor = KCAL_FLOOR[input.sex];
  const floorApplied = rounded < floor;
  return { kcal: floorApplied ? floor : rounded, goal, adjustPct, floorApplied, minorNoDeficit };
}

export interface MacroInput {
  /** แคลอรี่เป้าหมาย (จาก targetCalories) */
  targetKcal: number;
  weightKg: number;
  /** เป้าหมายที่ใช้จริง (CalorieTarget.goal) ใช้เลือกโปรตีนค่าเริ่มต้น */
  goal: Goal;
  /** ผู้ใช้กำหนดเอง (null = อัตโนมัติตามเป้าหมาย) */
  proteinPerKg?: number | null;
  /** ไขมัน % ของแคลอรี่เป้าหมาย (null = 25) */
  fatPct?: number | null;
}

export interface Macros {
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** ค่าที่ใช้จริง */
  proteinPerKg: number;
  fatPct: number;
  /** โปรตีน + ไขมันเกินแคลอรี่เป้าหมาย จึงถูกตัดลง (คาร์บ = 0) */
  clamped: boolean;
}

/**
 * สารอาหารต่อวัน (กรัม ปัดเป็นจำนวนเต็ม)
 * ลำดับความสำคัญเมื่อแคลอรี่ไม่พอ: โปรตีนก่อน → ไขมัน → คาร์บ (ส่วนที่เหลือ ไม่ติดลบ)
 */
export function macros(input: MacroInput): Macros {
  const proteinPerKg = isPositive(input.proteinPerKg)
    ? input.proteinPerKg
    : PROTEIN_PER_KG_DEFAULT[input.goal];
  const fatPct =
    typeof input.fatPct === 'number' && Number.isFinite(input.fatPct)
      ? clamp(input.fatPct, 0, 100)
      : FAT_PCT_DEFAULT;
  const total = Math.max(0, input.targetKcal);

  let proteinKcal = proteinPerKg * input.weightKg * KCAL_PER_G.protein;
  let fatKcal = (total * fatPct) / 100;
  let clamped = false;
  if (proteinKcal > total) {
    proteinKcal = total;
    fatKcal = 0;
    clamped = true;
  } else if (proteinKcal + fatKcal > total) {
    fatKcal = total - proteinKcal;
    clamped = true;
  }
  const carbsKcal = Math.max(0, total - proteinKcal - fatKcal);

  return {
    proteinG: Math.round(proteinKcal / KCAL_PER_G.protein),
    fatG: Math.round(fatKcal / KCAL_PER_G.fat),
    carbsG: Math.round(carbsKcal / KCAL_PER_G.carbs),
    proteinPerKg,
    fatPct,
    clamped,
  };
}

/** MET ของความหนัก — ใช้ค่าที่ผู้ใช้แก้ (ถ้าเป็นบวก) ไม่งั้นค่าเริ่มต้น */
export function metFor(
  intensity: Intensity,
  overrides?: Partial<Record<Intensity, number | null>> | null,
): number {
  const custom = overrides?.[intensity];
  return isPositive(custom) ? custom : DEFAULT_MET[intensity];
}

export interface ExerciseKcalInput {
  intensity: Intensity;
  weightKg: number;
  durationSec: number;
  mets?: Partial<Record<Intensity, number | null>> | null;
}

/** แคลอรี่ออกกำลังกาย = MET × kg × ชั่วโมง (ปัดเป็นจำนวนเต็ม) */
export function exerciseKcal({ intensity, weightKg, durationSec, mets }: ExerciseKcalInput): number {
  if (!isPositive(weightKg) || !isPositive(durationSec)) return 0;
  return Math.round(metFor(intensity, mets) * weightKg * (durationSec / 3600));
}

export interface DailyExpenditureInput {
  /** daily_log.kcalExpenditureOverride — ค่าที่ผู้ใช้กรอกเอง (null = ไม่ได้กรอก) */
  manualKcal: number | null | undefined;
  /** แคลอรี่ของแต่ละเซสชันในวันนั้น (workout_session.kcal) */
  sessionKcals: readonly (number | null | undefined)[];
}

export interface DailyExpenditure {
  /** ค่าที่แสดงเป็น "แคลอรี่ที่ใช้ไปวันนี้" */
  kcal: number;
  /** true = ผู้ใช้กรอกเอง (แสดงตัวบ่งชี้ H3) */
  isManual: boolean;
  /** แคลอรี่จากการออกกำลังกายรวมของวัน (คำนวณเสมอ ใช้ในสถิติ I3) */
  exerciseKcal: number;
}

/**
 * "แคลอรี่ที่ใช้ไปวันนี้" (H3): ค่าที่กรอกเอง (≥ 0) ชนะค่าคำนวณเสมอ
 * ค่าคำนวณ = ผลรวมแคลอรี่ออกกำลังกายของวันนั้น (ไม่บวก TDEE พื้นฐาน) — ค่าที่กรอกเองหมายถึงทั้งวัน
 */
export function dailyExpenditure({ manualKcal, sessionKcals }: DailyExpenditureInput): DailyExpenditure {
  const sum = sessionKcals.reduce<number>(
    (acc, k) => (typeof k === 'number' && Number.isFinite(k) && k > 0 ? acc + k : acc),
    0,
  );
  const exercise = Math.round(sum);
  const isManual = typeof manualKcal === 'number' && Number.isFinite(manualKcal) && manualKcal >= 0;
  return { kcal: isManual ? Math.round(manualKcal) : exercise, isManual, exerciseKcal: exercise };
}

export interface NutritionProfile {
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  deficitPct?: number | null;
  surplusPct?: number | null;
  proteinPerKg?: number | null;
  fatPct?: number | null;
}

export interface NutritionSummary {
  /** ปัดเป็นจำนวนเต็มสำหรับแสดงผล */
  bmr: number;
  tdee: number;
  target: CalorieTarget;
  macros: Macros;
}

/**
 * คำนวณทั้งชุดจากโปรไฟล์ (หน้าแรก/โปรไฟล์/สถิติใช้ร่วมกัน)
 * คืน null เมื่อข้อมูลไม่ครบหรือไม่สมเหตุสมผล (ผู้ใช้ข้ามขั้นโปรไฟล์ได้ SPEC C)
 */
export function nutritionSummary(p: NutritionProfile): NutritionSummary | null {
  if (!p.sex || !p.activityLevel || !p.goal) return null;
  if (!isPositive(p.age) || !isPositive(p.heightCm) || !isPositive(p.weightKg)) return null;
  const bmrKcal = bmr({ sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg });
  const tdeeKcal = tdee(bmrKcal, p.activityLevel);
  const target = targetCalories({
    tdee: tdeeKcal,
    goal: p.goal,
    sex: p.sex,
    age: p.age,
    deficitPct: p.deficitPct,
    surplusPct: p.surplusPct,
  });
  return {
    bmr: Math.round(bmrKcal),
    tdee: Math.round(tdeeKcal),
    target,
    macros: macros({
      targetKcal: target.kcal,
      weightKg: p.weightKg,
      goal: target.goal,
      proteinPerKg: p.proteinPerKg,
      fatPct: p.fatPct,
    }),
  };
}
