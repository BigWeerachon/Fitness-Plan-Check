import type { CustomWeek, ProgressionMode, RoutineExercise, SessionSet, WeightUnit } from '../db/schema';
import { diffDays, toLocalDate } from './dates';
import { lbToKg, roundTo, roundWeightToStep } from './units';

/**
 * Progressive overload ต่อท่า (SPEC G2) — ฟังก์ชันล้วน
 * ผลลัพธ์เป็น "คำแนะนำ" เป้าครั้งหน้า ผู้ใช้ยอมรับ (applySuggestion) / ปรับ (adjustTarget) / ข้าม (skipSuggestion) ได้
 * น้ำหนักทั้งหมดเป็น kg; การปัดตามก้าวทำในหน่วยของผู้ใช้ (lb → ได้เลขกลมใน lb)
 */

/** ก้าวน้ำหนักที่เลือกได้ในหน่วยของผู้ใช้ (ค่าแรก = ค่าเริ่มต้น) */
export const WEIGHT_STEP_OPTIONS: Readonly<Record<WeightUnit, readonly number[]>> = {
  kg: [2.5, 1.25],
  lb: [5, 2.5],
};

/** ก้าวเริ่มต้นเป็น kg: 2.5 kg หรือ 5 lb (≈ 2.268 kg) */
export function defaultWeightStepKg(unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(WEIGHT_STEP_OPTIONS.lb[0]) : WEIGHT_STEP_OPTIONS.kg[0];
}

/** ตัวเลือกก้าวน้ำหนักของหน่วยนั้น แปลงเป็น kg (ค่าที่เก็บในฐานข้อมูล) */
export function weightStepOptionsKg(unit: WeightUnit): number[] {
  return WEIGHT_STEP_OPTIONS[unit].map((s) => (unit === 'lb' ? lbToKg(s) : s));
}

/**
 * ก้าวน้ำหนักเริ่มต้นสำหรับท่าใหม่ (ตั้งค่าในหน้าตั้งค่า) — ค่าที่เก็บไว้ต้องเป็นตัวเลือกของหน่วยปัจจุบัน
 * ไม่งั้น (เช่น เพิ่งสลับ kg → lb) ใช้ค่าเริ่มต้นของหน่วยนั้น
 */
export function preferredWeightStepKg(unit: WeightUnit, storedKg: number | null | undefined): number {
  if (storedKg != null && weightStepOptionsKg(unit).some((o) => Math.abs(o - storedKg) < 0.01))
    return storedKg;
  return defaultWeightStepKg(unit);
}

/** โหมด linear: พลาดเป้าติดกันกี่ครั้งจึงแนะนำลดน้ำหนัก */
export const LINEAR_DELOAD_AFTER = 2;
/** ลดน้ำหนัก ~10% */
export const DELOAD_FACTOR = 0.9;

/** ค่าตั้งของท่าใน routine — ใช้แถว routine_exercise ได้ตรงๆ */
export type ProgressionConfig = Pick<
  RoutineExercise,
  | 'progressionMode'
  | 'sets'
  | 'repMin'
  | 'repMax'
  | 'weightStepKg'
  | 'customWeeks'
  | 'baseWeightKg'
  | 'failStreak'
  | 'progressionStartedAt'
  | 'targetWeightKg'
  | 'targetReps'
>;

/** เซ็ตที่ทำในเซสชันล่าสุด — ใช้แถว session_set ได้ตรงๆ */
export type PerformedSet = Pick<SessionSet, 'weightKg' | 'reps' | 'done' | 'targetReps'>;

export type SuggestionReason = 'increase' | 'repeat' | 'addRep' | 'deload' | 'custom' | 'off' | 'first';

export interface Suggestion {
  /** null = ไม่มีน้ำหนัก (บอดี้เวท หรือยังไม่รู้น้ำหนัก ให้ผู้ใช้กรอกตอนฝึก) */
  targetWeightKg: number | null;
  targetReps: number;
  reason: SuggestionReason;
  /** โหมด linear: จำนวนครั้งที่พลาดติดกันหลังเซสชันนี้ (โหมดอื่น = 0) */
  failStreak: number;
  /** แนะนำลดน้ำหนัก (ผู้ใช้ปฏิเสธได้ → skipSuggestion คงน้ำหนักเดิม) */
  deloadOffered: boolean;
}

export interface SuggestInput {
  config: ProgressionConfig;
  /** เซ็ตของท่านี้ในเซสชันล่าสุด (null/ว่าง = ยังไม่มีประวัติ) */
  lastSets: readonly PerformedSet[] | null;
  unit: WeightUnit;
  /** epoch ms (ใช้กับโหมด custom) */
  now: number;
}

const EPS = 1e-6;

/** เซ็ตที่ติ๊กเสร็จและมีจำนวนครั้งแล้ว */
type DoneSet = PerformedSet & { reps: number };

interface Performance {
  /** น้ำหนักทำงาน = น้ำหนักมากสุดที่ทำเสร็จ (null/0 = ไม่มีน้ำหนัก) */
  weightKg: number | null;
  /** เซ็ตที่เสร็จที่น้ำหนักทำงาน */
  working: DoneSet[];
}

function isDone(s: PerformedSet): s is DoneSet {
  return s.done && typeof s.reps === 'number' && s.reps >= 0;
}

/**
 * สรุปผลเซสชันล่าสุด: นับเฉพาะเซ็ตที่ติ๊กเสร็จและมีจำนวนครั้ง
 * ใช้เซ็ตที่ "น้ำหนักทำงาน" (หนักสุด) เท่านั้น — เซ็ต back-off ที่เบากว่าไม่ทำให้การเพิ่มน้ำหนักพลาด
 */
function summarize(sets: readonly PerformedSet[] | null): Performance | null {
  const done = (sets ?? []).filter(isDone);
  if (done.length === 0) return null;
  const weights = done.map((s) => s.weightKg).filter((w): w is number => typeof w === 'number');
  if (weights.length === 0) return { weightKg: null, working: done };
  const top = Math.max(...weights);
  return {
    weightKg: top,
    working: done.filter((s) => typeof s.weightKg === 'number' && Math.abs(s.weightKg - top) < EPS),
  };
}

function hasLoad(weightKg: number | null): weightKg is number {
  return weightKg !== null && weightKg > 0;
}

function plannedSets(config: ProgressionConfig): number {
  return Math.max(1, config.sets);
}

function lowestReps(sets: readonly DoneSet[]): number {
  return Math.min(...sets.map((s) => s.reps));
}

/** สัปดาห์ที่เท่าไรของรอบ custom: floor(สัปดาห์ตั้งแต่เริ่ม) mod จำนวนสัปดาห์ (นับตามวันที่ท้องถิ่น ไม่เพี้ยนเพราะ DST) */
export function customWeekIndex(startedAt: number | null, now: number, length: number): number {
  if (length <= 0 || startedAt === null) return 0;
  const weeks = Math.floor(diffDays(toLocalDate(startedAt), toLocalDate(now)) / 7);
  return Math.max(0, weeks) % length;
}

function firstSuggestion(config: ProgressionConfig, failStreak: number): Suggestion {
  return {
    targetWeightKg: config.targetWeightKg ?? config.baseWeightKg ?? null,
    targetReps: config.targetReps ?? config.repMin,
    reason: 'first',
    failStreak,
    deloadOffered: false,
  };
}

function suggestOff(config: ProgressionConfig, perf: Performance | null): Suggestion {
  return {
    targetWeightKg: perf ? perf.weightKg : (config.targetWeightKg ?? config.baseWeightKg ?? null),
    targetReps: perf ? lowestReps(perf.working) : (config.targetReps ?? config.repMin),
    reason: 'off',
    failStreak: 0,
    deloadOffered: false,
  };
}

/**
 * Double progression: ทำครบจำนวนเซ็ตที่วางแผน ที่น้ำหนักเดียวกัน และทุกเซ็ตถึงเพดานช่วงครั้ง
 * → +ก้าว แล้วกลับไปขอบล่าง; ไม่งั้นน้ำหนักเดิม เป้า = (ครั้งต่ำสุดของเซ็ตที่น้ำหนักทำงาน) + 1
 * บีบให้อยู่ในช่วง [repMin, repMax]
 */
function suggestDouble(config: ProgressionConfig, perf: Performance, unit: WeightUnit): Suggestion {
  const hitTop = perf.working.filter((s) => s.reps >= config.repMax).length;
  if (hitTop >= plannedSets(config)) {
    if (!hasLoad(perf.weightKg)) {
      // บอดี้เวท: เพิ่มน้ำหนักไม่ได้ คงที่เพดานช่วงครั้ง
      return {
        targetWeightKg: perf.weightKg,
        targetReps: config.repMax,
        reason: 'repeat',
        failStreak: 0,
        deloadOffered: false,
      };
    }
    return {
      targetWeightKg: roundWeightToStep(perf.weightKg + config.weightStepKg, config.weightStepKg, unit),
      targetReps: config.repMin,
      reason: 'increase',
      failStreak: 0,
      deloadOffered: false,
    };
  }
  const lowest = lowestReps(perf.working);
  const next = Math.min(config.repMax, Math.max(config.repMin, lowest + 1));
  return {
    targetWeightKg: perf.weightKg,
    targetReps: next,
    reason: next > lowest ? 'addRep' : 'repeat',
    failStreak: 0,
    deloadOffered: false,
  };
}

/** น้ำหนักหลังลด ~10% ปัดตามก้าว และลดอย่างน้อย 1 ก้าว (null = ลดไม่ได้แล้ว) */
function deloadWeight(weightKg: number, config: ProgressionConfig, unit: WeightUnit): number | null {
  const step = config.weightStepKg;
  const tenPct = roundWeightToStep(weightKg * DELOAD_FACTOR, step, unit);
  const oneStep = roundWeightToStep(roundWeightToStep(weightKg, step, unit) - step, step, unit);
  const result = Math.min(tenPct, oneStep);
  return result > EPS ? result : null;
}

/**
 * Linear: ทุกเซ็ตที่วางแผนถึงเป้าครั้ง (เป้าของเซ็ตนั้น หรือเป้าของท่า) ที่น้ำหนักทำงาน → +ก้าว, นับพลาด = 0
 * ไม่ถึง → น้ำหนักเดิม นับพลาด +1; ครบ 2 ครั้งติดกันขึ้นไป → แนะนำลด ~10% (ปฏิเสธได้)
 */
function suggestLinear(config: ProgressionConfig, perf: Performance, unit: WeightUnit): Suggestion {
  const reps = config.targetReps ?? config.repMin;
  const hit = perf.working.filter((s) => s.reps >= (s.targetReps ?? reps)).length;
  if (hit >= plannedSets(config)) {
    return {
      targetWeightKg: hasLoad(perf.weightKg)
        ? roundWeightToStep(perf.weightKg + config.weightStepKg, config.weightStepKg, unit)
        : perf.weightKg,
      targetReps: reps,
      reason: hasLoad(perf.weightKg) ? 'increase' : 'repeat',
      failStreak: 0,
      deloadOffered: false,
    };
  }
  const failStreak = config.failStreak + 1;
  const deload =
    failStreak >= LINEAR_DELOAD_AFTER && hasLoad(perf.weightKg)
      ? deloadWeight(perf.weightKg, config, unit)
      : null;
  if (deload !== null) {
    return { targetWeightKg: deload, targetReps: reps, reason: 'deload', failStreak, deloadOffered: true };
  }
  return {
    targetWeightKg: perf.weightKg,
    targetReps: reps,
    reason: 'repeat',
    failStreak,
    deloadOffered: false,
  };
}

function suggestCustom(
  config: ProgressionConfig,
  weeks: readonly CustomWeek[],
  unit: WeightUnit,
  now: number,
): Suggestion {
  const week = weeks[customWeekIndex(config.progressionStartedAt, now, weeks.length)];
  const base = config.baseWeightKg;
  return {
    targetWeightKg:
      base === null ? null : roundWeightToStep((base * week.percent) / 100, config.weightStepKg, unit),
    targetReps: week.reps,
    reason: 'custom',
    failStreak: 0,
    deloadOffered: false,
  };
}

/** คำนวณ "เป้าหมายครั้งหน้า" ของท่าจากผลเซสชันล่าสุด */
export function suggestNext({ config, lastSets, unit, now }: SuggestInput): Suggestion {
  const perf = summarize(lastSets);
  switch (config.progressionMode) {
    case 'custom': {
      const weeks = config.customWeeks ?? [];
      // ยังไม่ได้กำหนดสัปดาห์ → ทำตัวเหมือนปิด progression
      return weeks.length > 0 ? suggestCustom(config, weeks, unit, now) : suggestOff(config, perf);
    }
    case 'double':
      return perf ? suggestDouble(config, perf, unit) : firstSuggestion(config, 0);
    case 'linear':
      return perf ? suggestLinear(config, perf, unit) : firstSuggestion(config, config.failStreak);
    case 'off':
    default:
      return suggestOff(config, perf);
  }
}

/** ฟิลด์ของ routine_exercise ที่ต้องบันทึก */
export interface TargetFields {
  targetWeightKg?: number | null;
  targetReps?: number | null;
  failStreak?: number;
  baseWeightKg?: number | null;
  customWeeks?: CustomWeek[] | null;
}

/** ยอมรับคำแนะนำ → บันทึกเป็นเป้าครั้งหน้า (ยอมรับการลดน้ำหนัก = เริ่มนับพลาดใหม่) */
export function applySuggestion(
  s: Suggestion,
): Required<Pick<TargetFields, 'targetWeightKg' | 'targetReps' | 'failStreak'>> {
  return {
    targetWeightKg: s.targetWeightKg,
    targetReps: s.targetReps,
    failStreak: s.reason === 'deload' ? 0 : s.failStreak,
  };
}

/** ข้าม/ปฏิเสธคำแนะนำ → เป้าเดิมไม่เปลี่ยน แต่บันทึกจำนวนครั้งที่พลาดติดกันไว้ (ปฏิเสธการลด = คงน้ำหนักเดิม) */
export function skipSuggestion(s: Suggestion): Required<Pick<TargetFields, 'failStreak'>> {
  return { failStreak: s.failStreak };
}

/**
 * เปลี่ยนโหมด progression ของท่า (ตอนสร้าง routine หรือระหว่างฝึก) → ฟิลด์ที่ต้องบันทึก
 * นับพลาดเริ่มใหม่เสมอ; เปลี่ยนเป็น custom = เริ่มรอบสัปดาห์ที่ 1 จากวันนี้ (ไม่งั้นรอบจะไม่เดิน)
 */
export function changeProgressionMode(
  config: ProgressionConfig,
  mode: ProgressionMode,
  now: number,
): Pick<RoutineExercise, 'progressionMode' | 'failStreak' | 'progressionStartedAt'> {
  if (mode === config.progressionMode) {
    return {
      progressionMode: mode,
      failStreak: config.failStreak,
      progressionStartedAt: config.progressionStartedAt,
    };
  }
  return {
    progressionMode: mode,
    failStreak: 0,
    progressionStartedAt: mode === 'custom' ? now : config.progressionStartedAt,
  };
}

export type AdjustScope = 'today' | 'forward';

export interface NewTarget {
  weightKg: number | null;
  reps: number;
}

export interface AdjustResult {
  /** ค่าที่ใส่ให้เซ็ตที่ยังไม่เสร็จของเซสชันนี้ (ทั้งสองแบบ) */
  session: { targetWeightKg: number | null; targetReps: number };
  /** ฟิลด์ของ routine_exercise ที่ต้องบันทึก (null = "ใช้เฉพาะวันนี้" ไม่แตะค่าตั้งของท่า) */
  routineExercise: TargetFields | null;
}

/**
 * ผู้ใช้แตะเป้าระหว่างฝึกแล้วเลือก "ใช้เฉพาะวันนี้" หรือ "ใช้ต่อไป" (G2)
 * ใช้ต่อไป:
 * - linear: เปลี่ยนน้ำหนัก = เริ่มนับพลาดใหม่
 * - custom: เป้าคำนวณจาก น้ำหนักฐาน × % ของสัปดาห์ จึงย้อนคำนวณน้ำหนักฐานใหม่ และแก้จำนวนครั้งของสัปดาห์ปัจจุบัน
 *   เพื่อให้ค่าที่ตั้งมีผลต่อไปจริง (ไม่ถูกทับด้วยการคำนวณครั้งหน้า)
 */
export function adjustTarget(
  config: ProgressionConfig,
  target: NewTarget,
  scope: AdjustScope,
  now: number,
): AdjustResult {
  const session = { targetWeightKg: target.weightKg, targetReps: target.reps };
  if (scope === 'today') return { session, routineExercise: null };

  const fields: TargetFields = { targetWeightKg: target.weightKg, targetReps: target.reps };
  const weightChanged =
    target.weightKg === null || config.targetWeightKg === null
      ? target.weightKg !== config.targetWeightKg
      : Math.abs(target.weightKg - config.targetWeightKg) > EPS;
  if (config.progressionMode === 'linear' && weightChanged) fields.failStreak = 0;

  const weeks = config.customWeeks ?? [];
  if (config.progressionMode === 'custom' && weeks.length > 0) {
    const idx = customWeekIndex(config.progressionStartedAt, now, weeks.length);
    const week = weeks[idx];
    if (target.weightKg !== null && week.percent > 0) {
      fields.baseWeightKg = roundTo((target.weightKg * 100) / week.percent, 6);
    }
    if (target.reps !== week.reps) {
      fields.customWeeks = weeks.map((w, i) => (i === idx ? { ...w, reps: target.reps } : w));
    }
  }
  return { session, routineExercise: fields };
}
