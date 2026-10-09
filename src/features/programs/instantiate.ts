import { transaction } from '../../db/client';
import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo, routineRepo } from '../../db/repos/programRepo';
import { routineExerciseRepo } from '../../db/repos/routineExerciseRepo';
import { weekPlanRepo } from '../../db/repos/weekPlanRepo';
import type { Program } from '../../db/schema';
import { getTemplate } from '../../data/templates';
import { defaultWeightStepKg } from '../../domain/progression';
import type { Language } from '../../i18n';

/**
 * สร้างโปรแกรมจากเทมเพลต (SPEC F4): กรุ๊ป + routine (แท็กประเภทอัตโนมัติ F5) + ท่าและเซ็ต
 * + ตารางสัปดาห์อัตโนมัติ (SPEC C ขั้น 3) — ทุกอย่างแก้ไขได้หลังสร้าง
 */
export function instantiateTemplate(
  key: string,
  lang: Language,
  opts: { activate?: boolean } = {},
): Program | undefined {
  const tpl = getTemplate(key);
  if (!tpl) return undefined;
  const profile = profileRepo.ensure();
  const stepKg = profile.weightUnit === 'lb' ? defaultWeightStepKg('lb') : profile.weightStepKg;
  return transaction(() => {
    const program = programRepo.create(tpl.name[lang], tpl.key);
    for (const r of tpl.routines) {
      const routine = routineRepo.create(program.id, r.name[lang], r.type);
      for (const ex of r.exercises) {
        routineExerciseRepo.add(routine.id, ex.exerciseId, {
          sets: ex.sets,
          repMin: ex.repMin,
          repMax: ex.repMax,
          progressionMode: ex.progressionMode,
          restSec: ex.restSec,
          weightStepKg: stepKg,
          targetReps: ex.repMin,
        });
      }
      weekPlanRepo.ensureEntry(program.id, routine.id, r.days);
    }
    if (opts.activate !== false) weekPlanRepo.setActiveProgram(program.id);
    return program;
  });
}

/** โปรแกรมว่างสำหรับ "สร้างเอง" */
export function createEmptyProgram(name: string, opts: { activate?: boolean } = {}): Program {
  return transaction(() => {
    const program = programRepo.create(name);
    if (opts.activate !== false) weekPlanRepo.setActiveProgram(program.id);
    return program;
  });
}
