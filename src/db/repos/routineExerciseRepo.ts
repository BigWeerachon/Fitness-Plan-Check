import { asc, eq } from 'drizzle-orm';
import { getDb, transaction } from '../client';
import { createRow, softDeleteRow, updateRow, type CreateInput, type PatchInput } from '../mutations';
import { routineExercise, type RoutineExercise } from '../schema';
import { live } from './query';

/** ท่าใน routine พร้อมเซ็ตเป้าหมายและการตั้งค่า progression (SPEC F1, G2) */
export const routineExerciseRepo = {
  listByRoutine(routineId: string): RoutineExercise[] {
    return getDb()
      .select()
      .from(routineExercise)
      .where(live(routineExercise, eq(routineExercise.routineId, routineId)))
      .orderBy(asc(routineExercise.sortOrder), asc(routineExercise.createdAt))
      .all();
  },
  get(id: string): RoutineExercise | undefined {
    return getDb()
      .select()
      .from(routineExercise)
      .where(live(routineExercise, eq(routineExercise.id, id)))
      .get();
  },
  add(
    routineId: string,
    exerciseId: string,
    config: Omit<CreateInput<'routine_exercise'>, 'routineId' | 'exerciseId' | 'sortOrder'> = {},
  ): RoutineExercise {
    const sortOrder = routineExerciseRepo.listByRoutine(routineId).length;
    return createRow('routine_exercise', { ...config, routineId, exerciseId, sortOrder });
  },
  update(id: string, patch: PatchInput<'routine_exercise'>): RoutineExercise | undefined {
    return updateRow('routine_exercise', id, patch);
  },
  remove(id: string): void {
    softDeleteRow('routine_exercise', id);
  },
  /** จัดลำดับใหม่ตาม id ที่ส่งมา */
  reorder(routineId: string, orderedIds: string[]): void {
    transaction(() => {
      const current = routineExerciseRepo.listByRoutine(routineId);
      orderedIds.forEach((id, index) => {
        const row = current.find((r) => r.id === id);
        if (row && row.sortOrder !== index) updateRow('routine_exercise', id, { sortOrder: index });
      });
    });
  },
};
