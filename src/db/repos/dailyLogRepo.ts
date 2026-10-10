import { asc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { createRow, updateRow, type PatchInput } from '../mutations';
import { dailyLog, type DailyLog } from '../schema';
import { live } from './query';

/** บันทึกรายวัน: แคลอรี่ที่ใช้ (กรอกเอง H3), แคลอรี่ที่กิน (H4), น้ำหนักตัว (I4) */
export const dailyLogRepo = {
  get(date: string): DailyLog | undefined {
    return getDb()
      .select()
      .from(dailyLog)
      .where(live(dailyLog, eq(dailyLog.date, date)))
      .get();
  },
  listBetween(start: string, end: string): DailyLog[] {
    return getDb()
      .select()
      .from(dailyLog)
      .where(live(dailyLog))
      .orderBy(asc(dailyLog.date))
      .all()
      .filter((d) => d.date >= start && d.date <= end);
  },
  listAll(): DailyLog[] {
    return getDb().select().from(dailyLog).where(live(dailyLog)).orderBy(asc(dailyLog.date)).all();
  },
  upsert(date: string, patch: PatchInput<'daily_log'>): DailyLog {
    const existing = dailyLogRepo.get(date);
    if (existing) return updateRow('daily_log', existing.id, patch)!;
    return createRow('daily_log', { date, ...patch });
  },
};
