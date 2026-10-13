import { and, eq, isNull, type AnyColumn, type SQL } from 'drizzle-orm';
import { MANAGED_FIELDS, type Managed } from '../mutations';
import { getOwner } from '../owner';

/** เงื่อนไขมาตรฐาน: แถวของเจ้าของปัจจุบันที่ยังไม่ถูกลบ */
export function live(
  table: { ownerId: AnyColumn; deletedAt: AnyColumn },
  ...extra: (SQL | undefined)[]
): SQL {
  return and(eq(table.ownerId, getOwner()), isNull(table.deletedAt), ...extra) as SQL;
}

/** ตัดฟิลด์ที่ระบบจัดการเองออก (ใช้ตอนคัดลอกแถว) */
export function stripManaged<T extends Record<string, unknown>>(row: T): Omit<T, Managed> {
  const out: Record<string, unknown> = { ...row };
  for (const k of MANAGED_FIELDS) delete out[k];
  return out as Omit<T, Managed>;
}
