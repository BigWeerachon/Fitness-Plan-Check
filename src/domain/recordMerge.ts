import { compareStrings } from './compare';

/**
 * รวมแถวที่ "ควรมีแถวเดียว" แต่หลายเครื่องสร้างซ้ำตอนออฟไลน์ (เช่น profile, daily_log ของวันเดียวกัน)
 * - แถวที่เหลือ (survivor) = สร้างเก่าสุด (เสมอกันใช้ id น้อยกว่า) → ทุกเครื่องเลือกแถวเดียวกัน
 * - แต่ละช่องใช้ค่าจากแถวที่แก้ไขล่าสุดที่ "มีค่า" (updatedAt มากสุด เสมอกันใช้ id มากกว่า) ตรงกับที่สถิติใช้
 */

export interface MergeableRow {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface MergePlan<T extends MergeableRow> {
  survivorId: string;
  /** เฉพาะช่องที่ค่าต่างจาก survivor เดิม */
  patch: Partial<T>;
  duplicateIds: string[];
}

/** มากกว่า 0 ถ้า a ใหม่กว่า b */
function recency(a: MergeableRow, b: MergeableRow): number {
  return a.updatedAt - b.updatedAt || compareStrings(a.id, b.id);
}

export function planMerge<T extends MergeableRow>(
  rows: readonly T[],
  fields: readonly (keyof T)[],
): MergePlan<T> | null {
  if (rows.length < 2) return null;
  const survivor = [...rows].sort((a, b) => a.createdAt - b.createdAt || compareStrings(a.id, b.id))[0];
  const newestFirst = [...rows].sort((a, b) => recency(b, a));
  const patch: Partial<T> = {};
  for (const f of fields) {
    const source = newestFirst.find((r) => r[f] != null);
    if (source && source[f] !== survivor[f]) patch[f] = source[f];
  }
  return {
    survivorId: survivor.id,
    patch,
    duplicateIds: rows.filter((r) => r.id !== survivor.id).map((r) => r.id),
  };
}
