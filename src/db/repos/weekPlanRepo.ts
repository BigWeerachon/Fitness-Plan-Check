import { asc, eq } from 'drizzle-orm';
import { getDb, transaction } from '../client';
import { createRow, softDeleteRow, updateRow } from '../mutations';
import { dayOverride, weekPlan, type DayOverride, type OverrideKind, type WeekPlanEntry } from '../schema';
import { profileRepo } from './profileRepo';
import { live } from './query';

function normalizeDays(days: number[]): number[] {
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
}

/** ตารางประจำสัปดาห์ต่อโปรแกรม (SPEC E, D15) */
export const weekPlanRepo = {
  listForProgram(programId: string): WeekPlanEntry[] {
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
    const existing = weekPlanRepo.listForProgram(programId).find((e) => e.routineId === routineId);
    if (existing) return existing;
    const sortOrder = weekPlanRepo.listForProgram(programId).length;
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
    const days = entry.days.includes(day) ? entry.days.filter((d) => d !== day) : [...entry.days, day];
    weekPlanRepo.setDays(id, days);
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
      for (const e of weekPlanRepo.listForProgram(programId)) {
        const has = e.days.includes(toDay);
        const should = e.days.includes(fromDay);
        if (has !== should)
          weekPlanRepo.setDays(e.id, should ? [...e.days, toDay] : e.days.filter((d) => d !== toDay));
      }
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

/** การเปลี่ยนแผนเฉพาะวันที่ (ไม่แก้ตารางหลัก SPEC D/E) — หนึ่ง override ต่อวัน */
export const dayOverrideRepo = {
  getForDate(date: string): DayOverride | undefined {
    return getDb()
      .select()
      .from(dayOverride)
      .where(live(dayOverride, eq(dayOverride.date, date)))
      .orderBy(asc(dayOverride.createdAt))
      .get();
  },
  listBetween(start: string, end: string): DayOverride[] {
    return getDb()
      .select()
      .from(dayOverride)
      .where(live(dayOverride))
      .all()
      .filter((o) => o.date >= start && o.date <= end);
  },
  set(date: string, kind: OverrideKind, routineId: string | null = null): DayOverride {
    return transaction(() => {
      const existing = dayOverrideRepo.getForDate(date);
      if (existing) {
        return updateRow('day_override', existing.id, {
          kind,
          routineId: kind === 'routine' ? routineId : null,
        })!;
      }
      return createRow('day_override', { date, kind, routineId: kind === 'routine' ? routineId : null });
    });
  },
  clear(date: string): void {
    const existing = dayOverrideRepo.getForDate(date);
    if (existing) softDeleteRow('day_override', existing.id);
  },
};
