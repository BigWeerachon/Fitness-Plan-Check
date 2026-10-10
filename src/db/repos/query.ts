import { and, eq, isNull, type SQL } from 'drizzle-orm';
import { getOwner } from '../owner';

/** เงื่อนไขมาตรฐาน: แถวของเจ้าของปัจจุบันที่ยังไม่ถูกลบ */
export function live(table: any, ...extra: (SQL | undefined)[]): SQL {
  return and(eq(table.ownerId, getOwner()), isNull(table.deletedAt), ...extra) as SQL;
}

const MANAGED = ['id', 'ownerId', 'createdAt', 'updatedAt', 'deletedAt'] as const;
type Managed = (typeof MANAGED)[number];

/** ตัดฟิลด์ที่ระบบจัดการเองออก (ใช้ตอนคัดลอกแถว) */
export function stripManaged<T extends Record<string, unknown>>(row: T): Omit<T, Managed> {
  const out: Record<string, unknown> = { ...row };
  for (const k of MANAGED) delete out[k];
  return out as Omit<T, Managed>;
}
