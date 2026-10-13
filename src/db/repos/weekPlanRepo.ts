import { asc, desc, eq } from 'drizzle-orm';
import { getDb, transaction } from '../client';
import { createRow, softDeleteRow, updateRow } from '../mutations';
import { dayOverride, weekPlan, type DayOverride, type OverrideKind, type WeekPlanEntry } from '../schema';
import { profileRepo } from './profileRepo';
import { live } from './query';
import { isInRange, type DateRange } from '../../domain/periods';
import { copyDay as copyDayPlan, toggleDay as toggleDayPlan } from '../../domain/schedule';

function normalizeDays(days: number[]): number[] {
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
}

/** ตารางประจำสัปดาห์ต่อโปรแกรม (SPEC E, D15) */
export const weekPlanRepo = {
  listByProgram(programId: string): WeekPlanEntry[] {
    return getDb()
      .select()
      .from(weekPlan)
      .where(live(weekPlan, eq(weekPlan.programId, programId)))
      .orderBy(asc(weekPlan.sortOrder), asc(weekPlan.createdAt))
      .all();
  },
  get(id: string): WeekPlanEntry | undefined {
    return getDb()
      .select()
      .from(weekPlan)
      .where(live(weekPlan, eq(weekPlan.id, id)))
      .get();
  },
  /** แถวของ routine ในตารางของโปรแกรม (สร้างถ้ายังไม่มี) */
  ensureEntry(programId: string, routineId: string, days: number[] = []): WeekPlanEntry {
    const entries = weekPlanRepo.listByProgram(programId);
    const existing = entries.find((e) => e.routineId === routineId);
    if (existing) return existing;
    const sortOrder = entries.length;
    return createRow('week_plan', {
      programId,
      routineId,
      days: normalizeDays(days),
      enabled: true,
      sortOrder,
    });
  },
  setDays(id: string, days: number[]): void {
    updateRow('week_plan', id, { days: normalizeDays(days) });
  },
  toggleDay(id: string, day: number): void {
    const entry = weekPlanRepo.get(id);
    if (!entry) return;
    weekPlanRepo.setDays(id, toggleDayPlan(entry.days, day));
  },
  setEnabled(id: string, enabled: boolean): void {
    updateRow('week_plan', id, { enabled });
  },
  remove(id: string): void {
    softDeleteRow('week_plan', id);
  },
  /** "คัดลอกจากวันอื่น": วันปลายทางมี routine ชุดเดียวกับวันต้นทางพอดี */
  copyDay(programId: string, fromDay: number, toDay: number): void {
    if (fromDay === toDay) return;
    transaction(() => {
      const entries = weekPlanRepo.listByProgram(programId);
      const next = copyDayPlan(entries, fromDay, toDay);
      // บันทึกเฉพาะแถวที่เปลี่ยน (copyDay คืน object เดิมสำหรับแถวที่ไม่เปลี่ยน)
      next.forEach((e, i) => {
        if (e !== entries[i]) weekPlanRepo.setDays(e.id, e.days);
      });
    });
  },
  activeProgramId(): string | null {
    return profileRepo.get()?.activeProgramId ?? null;
  },
  /** สลับโปรแกรมทั้งสัปดาห์ในครั้งเดียว */
  setActiveProgram(programId: string | null): void {
    profileRepo.update({ activeProgramId: programId });
  },
};

/**
 * การเปลี่ยนแผนเฉพาะวันที่ (ไม่แก้ตารางหลัก SPEC D/E) — หนึ่ง override ต่อวัน
 * ถ้ามีหลายแถวในวันเดียว (สร้างจากสองเครื่องก่อนซิงก์) ใช้แถวที่แก้ล่าสุด ตรงกับ resolveDayPlan
 */
export const dayOverrideRepo = {
  /** ทุกแถวที่ยังไม่ลบของวันนั้น ล่าสุดก่อน */
  listForDate(date: string): DayOverride[] {
    return getDb()
      .select()
      .from(dayOverride)
      .where(live(dayOverride, eq(dayOverride.date, date)))
      .orderBy(desc(dayOverride.updatedAt), desc(dayOverride.createdAt))
      .all();
  },
  getForDate(date: string): DayOverride | undefined {
    return dayOverrideRepo.listForDate(date)[0];
  },
  listBetween(range: DateRange): DayOverride[] {
    return (
      getDb()
        .select()
        .from(dayOverride)
        .where(live(dayOverride))
        // เรียงเก่า → ใหม่: resolveDayPlan ใช้แถวหลังสุดเมื่อเวลาแก้ไขเท่ากัน ให้ตรงกับ listForDate
        .orderBy(asc(dayOverride.updatedAt), asc(dayOverride.createdAt))
        .all()
        .filter((o) => isInRange(o.date, range))
    );
  },
  set(date: string, kind: OverrideKind, routineId: string | null = null): DayOverride {
    return transaction(() => {
      const [existing, ...extra] = dayOverrideRepo.listForDate(date);
      const overrideRoutineId = kind === 'routine' ? routineId : null;
      // รวมให้เหลือแถวเดียว
      for (const o of extra) softDeleteRow('day_override', o.id);
      if (existing) {
        return updateRow('day_override', existing.id, {
          kind,
          routineId: overrideRoutineId,
        })!;
      }
      return createRow('day_override', { date, kind, routineId: overrideRoutineId });
    });
  },
  /** กลับไปใช้ตารางหลัก: ลบทุกแถวของวันนั้น */
  clear(date: string): void {
    transaction(() => {
      for (const o of dayOverrideRepo.listForDate(date)) softDeleteRow('day_override', o.id);
    });
  },
  /** ลบ override ที่ชี้ไป routine ที่ถูกลบ (วันนั้นกลับไปใช้ตารางหลัก) */
  removeForRoutine(routineId: string): void {
    for (const o of getDb()
      .select()
      .from(dayOverride)
      .where(live(dayOverride, eq(dayOverride.routineId, routineId)))
      .all()) {
      softDeleteRow('day_override', o.id);
    }
  },
};
