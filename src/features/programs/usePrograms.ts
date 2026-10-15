import { programRepo, routineRepo } from '../../db/repos/programRepo';
import { profileRepo } from '../../db/repos/profileRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import { weekPlanRepo } from '../../db/repos/weekPlanRepo';
import type { Program } from '../../db/schema';

export interface ProgramCard {
  program: Program;
  routineCount: number;
  sessionCount: number;
  lastDate: string | null;
  isActive: boolean;
}

/** วัน (0-6) ที่โปรแกรมนี้มีแผนฝึก — ไม่มีโปรแกรมที่ใช้งาน = ไม่มีวัน */
function activeProgramDays(activeId: string | null): number[] {
  if (!activeId) return [];
  const days = weekPlanRepo
    .listByProgram(activeId)
    .filter((e) => e.enabled)
    .flatMap((e) => e.days);
  return [...new Set(days)];
}

/** การ์ดกรุ๊ปในหน้าโปรแกรม (SPEC F2): ชื่อ, จำนวน routine, สถิติสรุปสั้น (จำนวนครั้งที่ฝึก + ครั้งล่าสุด จาก snapshot) */
export function loadPrograms(): { cards: ProgramCard[]; activeId: string | null; activeDays: number[] } {
  const activeId = profileRepo.get()?.activeProgramId ?? null;
  const sessions = sessionRepo.listCompleted();
  const cards = programRepo.list().map((program) => {
    const programSessions = sessions.filter((s) => s.programId === program.id);
    return {
      program,
      routineCount: routineRepo.count(program.id),
      sessionCount: programSessions.length,
      lastDate: programSessions[0]?.date ?? null,
      isActive: program.id === activeId,
    };
  });
  const activeDays = activeProgramDays(activeId);
  return { cards, activeId, activeDays };
}
