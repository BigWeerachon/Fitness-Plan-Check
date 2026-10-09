import { profileRepo } from '../../db/repos/profileRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { WorkoutSession } from '../../db/schema';
import { toLocalDate } from '../../domain/dates';
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
  const session = sessionRepo.start({
    routineId: opts.routineId,
    date,
    backfilled: opts.backfilled ?? date !== toLocalDate(now()),
    bodyWeightKg: profileRepo.get()?.weightKg ?? null,
    resolve: resolveExercise,
  });
  return { session, resumed: false };
}
