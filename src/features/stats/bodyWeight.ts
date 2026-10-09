import { transaction } from '../../db/client';
import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { profileRepo } from '../../db/repos/profileRepo';
import { toLocalDate, type LocalDate } from '../../domain/dates';
import { now } from '../../utils/clock';

/**
 * บันทึกน้ำหนักตัว (I4): เก็บเป็นจุดของวันนั้นใน daily_log และอัปเดตน้ำหนักในโปรไฟล์
 * เพื่อให้ BMR/TDEE/แคลอรี่ออกกำลังกายใช้น้ำหนักล่าสุด (DECISIONS D23)
 */
export function logBodyWeight(weightKg: number, date: LocalDate = toLocalDate(now())): void {
  transaction(() => {
    dailyLogRepo.upsert(date, { bodyWeightKg: weightKg });
    if (date === toLocalDate(now())) profileRepo.update({ weightKg });
  });
}
