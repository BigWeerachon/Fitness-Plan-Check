import { profileRepo } from '../../db/repos/profileRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { WorkoutSession } from '../../db/schema';
import { parseLocalDate, toLocalDate } from '../../domain/dates';
import { suggestNext } from '../../domain/progression';
import { now } from '../../utils/clock';
import { resolveExercise } from '../exercises/resolve';

/**
 * เริ่มเซสชันจาก routine (หรือเซสชันเปล่า) — ถ้ามีเซสชันค้างอยู่ คืนเซสชันนั้นแทน (ทำต่อได้เสมอ ข้อมูลไม่หาย)
 * date ใช้บันทึกย้อนหลังวันก่อนหน้า (SPEC G1)
 */
export function startSession(opts: { routineId: string | null; date?: string; backfilled?: boolean }): {
  session: WorkoutSession;
  resumed: boolean;
} {
  const active = sessionRepo.getActive();
  if (active) return { session: active, resumed: true };
  const date = opts.date ?? toLocalDate(now());
  const profile = profileRepo.get();
  const unit = profile?.weightUnit ?? 'kg';
  const at = date === toLocalDate(now()) ? now() : parseLocalDate(date).getTime();
  const session = sessionRepo.start({
    routineId: opts.routineId,
    date,
    backfilled: opts.backfilled ?? date !== toLocalDate(now()),
    bodyWeightKg: profile?.weightKg ?? null,
    resolve: resolveExercise,
    // โหมด custom: ใช้เป้าของสัปดาห์ที่ฝึกจริง ไม่ใช่ค่าที่บันทึกไว้จากรอบก่อน (G2)
    targetFor: (re) => {
      if (re.progressionMode !== 'custom' || !re.customWeeks?.length) {
        return { weightKg: re.targetWeightKg, reps: re.targetReps ?? re.repMin };
      }
      const s = suggestNext({ config: re, lastSets: null, unit, now: at });
      return { weightKg: s.targetWeightKg, reps: s.targetReps };
    },
  });
  return { session, resumed: false };
}
