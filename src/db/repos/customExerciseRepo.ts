import { asc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { createRow, softDeleteRow, updateRow, type CreateInput, type PatchInput } from '../mutations';
import { customExercise, type CustomExercise } from '../schema';
import { live } from './query';

/** ท่าที่ผู้ใช้สร้างเอง (SPEC F7) — ต้องมีกลุ่มกล้ามเนื้อหลัก 1 กลุ่ม */
export const customExerciseRepo = {
  list(): CustomExercise[] {
    return getDb()
      .select()
      .from(customExercise)
      .where(live(customExercise))
      .orderBy(asc(customExercise.name))
      .all();
  },
  get(id: string): CustomExercise | undefined {
    return getDb()
      .select()
      .from(customExercise)
      .where(live(customExercise, eq(customExercise.id, id)))
      .get();
  },
  /** รวมท่าที่ถูกลบแล้ว (ใช้แสดงชื่อในประวัติ) */
  getAny(id: string): CustomExercise | undefined {
    return getDb().select().from(customExercise).where(eq(customExercise.id, id)).get();
  },
  create(values: CreateInput<'custom_exercise'>): CustomExercise {
    return createRow('custom_exercise', { ...values, name: values.name.trim() });
  },
  update(id: string, patch: PatchInput<'custom_exercise'>): void {
    updateRow('custom_exercise', id, patch);
  },
  remove(id: string): void {
    softDeleteRow('custom_exercise', id);
  },
};
