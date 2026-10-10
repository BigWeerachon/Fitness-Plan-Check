import { asc, desc, eq } from 'drizzle-orm';
import { getDb, transaction } from '../client';
import { createRow, softDeleteRow, updateRow } from '../mutations';
import {
  program,
  routine,
  routineExercise,
  weekPlan,
  workoutSession,
  type Program,
  type Routine,
} from '../schema';
import { live, stripManaged } from './query';

/** กรุ๊ปโปรแกรม (SPEC F1–F3) */
export const programRepo = {
  list(): Program[] {
    return getDb()
      .select()
      .from(program)
      .where(live(program))
      .orderBy(asc(program.sortOrder), asc(program.createdAt))
      .all();
  },
  get(id: string): Program | undefined {
    return getDb()
      .select()
      .from(program)
      .where(live(program, eq(program.id, id)))
      .get();
  },
  create(name: string, templateKey: string | null = null): Program {
    const sortOrder = programRepo.list().length;
    return createRow('program', { name: name.trim(), templateKey, sortOrder });
  },
  rename(id: string, name: string): void {
    updateRow('program', id, { name: name.trim() });
  },
  /** ลบกรุ๊ปพร้อม routine/ท่า/ตารางของกรุ๊ป (soft delete) — ประวัติเซสชันยังอยู่เพราะเก็บ snapshot ชื่อไว้ (F6) */
  remove(id: string): void {
    transaction(() => {
      for (const r of routineRepo.listByProgram(id)) routineRepo.remove(r.id);
      for (const w of getDb()
        .select()
        .from(weekPlan)
        .where(live(weekPlan, eq(weekPlan.programId, id)))
        .all()) {
        softDeleteRow('week_plan', w.id);
      }
      softDeleteRow('program', id);
    });
  },
};

/** Routine ภายในกรุ๊ป (SPEC F1, F3, F5) */
export const routineRepo = {
  listByProgram(programId: string): Routine[] {
    return getDb()
      .select()
      .from(routine)
      .where(live(routine, eq(routine.programId, programId)))
      .orderBy(asc(routine.sortOrder), asc(routine.createdAt))
      .all();
  },
  listAll(): Routine[] {
    return getDb().select().from(routine).where(live(routine)).orderBy(asc(routine.sortOrder)).all();
  },
  get(id: string): Routine | undefined {
    return getDb()
      .select()
      .from(routine)
      .where(live(routine, eq(routine.id, id)))
      .get();
  },
  count(programId: string): number {
    return routineRepo.listByProgram(programId).length;
  },
  create(programId: string, name: string, type: Routine['type'] = 'other'): Routine {
    const sortOrder = routineRepo.count(programId);
    return createRow('routine', { programId, name: name.trim(), type, sortOrder });
  },
  update(id: string, patch: { name?: string; type?: Routine['type'] }): void {
    updateRow('routine', id, { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) });
  },
  /** ลบ routine + ท่าใน routine + แถวตารางสัปดาห์ที่อ้างถึง */
  remove(id: string): void {
    transaction(() => {
      for (const ex of getDb()
        .select()
        .from(routineExercise)
        .where(live(routineExercise, eq(routineExercise.routineId, id)))
        .all()) {
        softDeleteRow('routine_exercise', ex.id);
      }
      for (const w of getDb()
        .select()
        .from(weekPlan)
        .where(live(weekPlan, eq(weekPlan.routineId, id)))
        .all()) {
        softDeleteRow('week_plan', w.id);
      }
      softDeleteRow('routine', id);
    });
  },
  /** คัดลอก routine (พร้อมท่าและการตั้งค่า progression) ไปกรุ๊ปอื่น (F3) */
  copyTo(id: string, targetProgramId: string): Routine | undefined {
    const src = routineRepo.get(id);
    if (!src) return undefined;
    return transaction(() => {
      const copy = routineRepo.create(targetProgramId, src.name, src.type);
      for (const ex of getDb()
        .select()
        .from(routineExercise)
        .where(live(routineExercise, eq(routineExercise.routineId, id)))
        .all()) {
        const { routineId: _routineId, ...rest } = stripManaged(ex);
        void _routineId;
        createRow('routine_exercise', { ...rest, routineId: copy.id });
      }
      return copy;
    });
  },
  /** ย้าย routine ไปกรุ๊ปอื่น (F3) — แถวตารางสัปดาห์ของกรุ๊ปเดิมถูกถอดออก */
  moveTo(id: string, targetProgramId: string): void {
    const src = routineRepo.get(id);
    if (!src || src.programId === targetProgramId) return;
    transaction(() => {
      for (const w of getDb()
        .select()
        .from(weekPlan)
        .where(live(weekPlan, eq(weekPlan.routineId, id), eq(weekPlan.programId, src.programId)))
        .all()) {
        softDeleteRow('week_plan', w.id);
      }
      updateRow('routine', id, { programId: targetProgramId, sortOrder: routineRepo.count(targetProgramId) });
    });
  },
  /** วันที่ทำ routine นี้ครั้งล่าสุด (เซสชันที่จบแล้ว) */
  lastPerformedDate(id: string): string | null {
    const row = getDb()
      .select({ date: workoutSession.date })
      .from(workoutSession)
      .where(live(workoutSession, eq(workoutSession.routineId, id), eq(workoutSession.status, 'completed')))
      .orderBy(desc(workoutSession.date), desc(workoutSession.startedAt))
      .get();
    return row?.date ?? null;
  },
};
