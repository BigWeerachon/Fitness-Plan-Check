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

/** การ์ดกรุ๊ปในหน้าโปรแกรม (SPEC F2): ชื่อ, จำนวน routine, สถิติสรุปสั้น (จำนวนครั้งที่ฝึก + ครั้งล่าสุด จาก snapshot) */
export function loadPrograms(): { cards: ProgramCard[]; activeId: string | null; activeDays: number[] } {
  const activeId = profileRepo.get()?.activeProgramId ?? null;
  const sessions = sessionRepo.listCompleted();
  const cards = programRepo.list().map((program) => {
    const mine = sessions.filter((s) => s.programId === program.id);
    return {
      program,
      routineCount: routineRepo.count(program.id),
      sessionCount: mine.length,
      lastDate: mine[0]?.date ?? null,
      isActive: program.id === activeId,
    };
  });
  const activeDays = activeId
    ? [
        ...new Set(
          weekPlanRepo
            .listForProgram(activeId)
            .filter((e) => e.enabled)
            .flatMap((e) => e.days),
        ),
      ]
    : [];
  return { cards, activeId, activeDays };
}
