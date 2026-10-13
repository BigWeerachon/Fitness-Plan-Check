import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { isInRange, type DateRange } from '../../domain/periods';
import { createRow, updateRow, type PatchInput } from '../mutations';
import { dailyLog, type DailyLog } from '../schema';
import { live } from './query';

/** บันทึกรายวัน: แคลอรี่ที่ใช้ (กรอกเอง H3), แคลอรี่ที่กิน (H4), น้ำหนักตัว (I4) */
export const dailyLogRepo = {
  get(date: string): DailyLog | undefined {
    return (
      getDb()
        .select()
        .from(dailyLog)
        .where(live(dailyLog, eq(dailyLog.date, date)))
        // วันเดียวมีหลายแถวได้ (สองเครื่องสร้างตอนออฟไลน์) — ใช้แถวที่แก้ไขล่าสุดเสมอ ตรงกับสถิติ
        .orderBy(desc(dailyLog.updatedAt), desc(dailyLog.id))
        .get()
    );
  },
  listBetween(range: DateRange): DailyLog[] {
    return getDb()
      .select()
      .from(dailyLog)
      .where(live(dailyLog))
      .orderBy(asc(dailyLog.date))
      .all()
      .filter((d) => isInRange(d.date, range));
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
