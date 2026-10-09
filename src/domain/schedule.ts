import type { DayOverride, WeekPlanEntry } from '../db/schema';
import { addDays, startOfWeek, weekdayOf, type LocalDate } from './dates';

/**
 * ตารางประจำสัปดาห์และแผนของแต่ละวัน (SPEC D, E) — ฟังก์ชันล้วน
 * - week_plan: แถวละ routine + วันในสัปดาห์ (0 = อาทิตย์ … 6 = เสาร์) + สวิตช์เปิด/ปิด
 *   routine เดียวซ้ำได้หลายวัน และวันเดียวมีได้หลาย routine
 * - day_override: เปลี่ยนแผนของวันที่เฉพาะเจาะจง (พัก / routine อื่น / เซสชันเปล่า) โดยไม่แก้ตารางหลัก
 */

export const DAYS_PER_WEEK = 7;

/** แถว week_plan ของโปรแกรมที่ใช้งาน (ใช้แถวจาก DB ได้ตรงๆ) */
export type PlanEntry = Pick<WeekPlanEntry, 'routineId' | 'days' | 'enabled' | 'sortOrder'> &
  Partial<Pick<WeekPlanEntry, 'deletedAt'>>;

/** แถว day_override (ใช้แถวจาก DB ได้ตรงๆ) */
export type OverrideEntry = Pick<DayOverride, 'date' | 'kind' | 'routineId'> &
  Partial<Pick<DayOverride, 'updatedAt' | 'deletedAt'>>;

export type DayPlanKind = 'rest' | 'routines' | 'empty';

export interface DayPlan {
  /** rest = วันพัก, routines = มี routine ให้ทำ, empty = เซสชันเปล่า (override เท่านั้น) */
  kind: DayPlanKind;
  /** เรียงตาม sortOrder ของแถวในตาราง (ว่างเมื่อ rest/empty) */
  routineIds: string[];
  source: 'plan' | 'override';
}

export interface ResolveDayInput {
  entries: readonly PlanEntry[];
  overrides: readonly OverrideEntry[];
  date: LocalDate;
}

function assertDay(day: number): void {
  if (!Number.isInteger(day) || day < 0 || day >= DAYS_PER_WEEK) {
    throw new RangeError(`Invalid weekday: ${day}`);
  }
}

/**
 * override ที่มีผลของวันนั้น: ข้ามแถวที่ถูกลบ และ kind = routine ที่ไม่มี routineId (ข้อมูลเสีย)
 * ถ้ามีหลายแถว (เช่น สร้างจากสองเครื่องก่อนซิงก์) ใช้แถวที่แก้ล่าสุด เท่ากันใช้แถวหลังสุด
 */
function activeOverride(overrides: readonly OverrideEntry[], date: LocalDate): OverrideEntry | null {
  let best: OverrideEntry | null = null;
  for (const o of overrides) {
    if (o.date !== date || o.deletedAt != null) continue;
    if (o.kind === 'routine' && !o.routineId) continue;
    if (!best || (o.updatedAt ?? 0) >= (best.updatedAt ?? 0)) best = o;
  }
  return best;
}

/** routine ของวันในสัปดาห์ตามตารางหลัก: เฉพาะแถวที่เปิดอยู่ เรียงตาม sortOrder ไม่ซ้ำกัน */
export function routinesOnWeekday(entries: readonly PlanEntry[], weekday: number): string[] {
  const ids: string[] = [];
  [...entries]
    .filter((e) => e.enabled && e.deletedAt == null && e.days.includes(weekday))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((e) => {
      if (!ids.includes(e.routineId)) ids.push(e.routineId);
    });
  return ids;
}

/** แผนของวันที่กำหนด: override ชนะตารางหลักเสมอ; ตารางไม่มี routine ในวันนั้น = วันพัก */
export function resolveDayPlan({ entries, overrides, date }: ResolveDayInput): DayPlan {
  const o = activeOverride(overrides, date);
  if (o) {
    if (o.kind === 'routine')
      return { kind: 'routines', routineIds: [o.routineId as string], source: 'override' };
    return { kind: o.kind, routineIds: [], source: 'override' };
  }
  const routineIds = routinesOnWeekday(entries, weekdayOf(date));
  return { kind: routineIds.length > 0 ? 'routines' : 'rest', routineIds, source: 'plan' };
}

export interface DatedPlan {
  date: LocalDate;
  plan: DayPlan;
}

/** แผนของทั้งสัปดาห์ที่มีวันนี้อยู่ (เรียงตามวันเริ่มต้นสัปดาห์) */
export function resolveWeek(input: {
  entries: readonly PlanEntry[];
  overrides: readonly OverrideEntry[];
  date: LocalDate;
  weekStart: number;
}): DatedPlan[] {
  return weekDates(input.date, input.weekStart).map((date) => ({
    date,
    plan: resolveDayPlan({ entries: input.entries, overrides: input.overrides, date }),
  }));
}

/** แตะวันในแถวจุดวัน: เปิด/ปิดวันนั้น คืน array ใหม่ที่เรียงและไม่ซ้ำ */
export function toggleDay(days: readonly number[], day: number): number[] {
  assertDay(day);
  const set = new Set(days);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return [...set].sort((a, b) => a - b);
}

/**
 * "คัดลอกจากวันอื่น": ให้วันปลายทางมี routine ชุดเดียวกับวันต้นทางพอดี
 * ทำกับทุกแถว (รวมแถวที่ปิดสวิตช์อยู่) แถวที่มีวันต้นทาง → เพิ่มวันปลายทาง, ไม่มี → เอาวันปลายทางออก
 * คืน array ใหม่ตามลำดับเดิม แถวที่เปลี่ยนเป็น object ใหม่ แถวที่ไม่เปลี่ยนคืน object เดิม (เทียบ === เพื่อบันทึกเฉพาะที่เปลี่ยน)
 */
export function copyDay<T extends { days: number[] }>(
  entries: readonly T[],
  fromDay: number,
  toDay: number,
): T[] {
  assertDay(fromDay);
  assertDay(toDay);
  return entries.map((e) => {
    const shouldHave = e.days.includes(fromDay);
    if (shouldHave === e.days.includes(toDay)) return e;
    return { ...e, days: toggleDay(e.days, toDay) };
  });
}

/** ลำดับวันในสัปดาห์เริ่มจากวันเริ่มต้นที่ตั้งไว้ (1 = จันทร์ → [1..6, 0], 0 = อาทิตย์ → [0..6]) */
export function weekDaysOrdered(weekStart: number): number[] {
  assertDay(weekStart);
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => (weekStart + i) % DAYS_PER_WEEK);
}

/** วันที่ทั้ง 7 วันของสัปดาห์ที่มีวันนี้อยู่ */
export function weekDates(date: LocalDate, weekStart: number): LocalDate[] {
  assertDay(weekStart);
  const start = startOfWeek(date, weekStart);
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(start, i));
}

/** วินาทีทำงานต่อเซ็ตที่ใช้ประมาณเวลา */
export const WORK_SEC_PER_SET = 45;

export interface ExercisePlanTime {
  sets: number;
  /** วินาทีพักของท่า (null = ใช้ค่าเริ่มต้น, 0 = ไม่พัก) */
  restSec: number | null;
}

/**
 * ประมาณเวลาเซสชัน (นาที) = ทุกเซ็ต × (45 วิ ทำงาน + เวลาพักของท่า) − เวลาพักหลังเซ็ตสุดท้าย
 * ไม่รวมเวลาเปลี่ยนท่า/วอร์มอัพ ปัดเป็นนาทีใกล้สุด (มีอย่างน้อย 1 เซ็ต → อย่างน้อย 1 นาที)
 */
export function estimateSessionMinutes(
  exercises: readonly ExercisePlanTime[],
  defaultRestSec: number,
): number {
  let totalSec = 0;
  let lastRest = 0;
  let anySet = false;
  for (const e of exercises) {
    const sets = Math.max(0, Math.floor(e.sets));
    if (sets === 0) continue;
    const rest = Math.max(0, e.restSec ?? defaultRestSec);
    totalSec += sets * (WORK_SEC_PER_SET + rest);
    lastRest = rest;
    anySet = true;
  }
  if (!anySet) return 0;
  return Math.max(1, Math.round((totalSec - lastRest) / 60));
}
