import { getDb, transaction } from './client';
import { USER_TABLE_NAMES, USER_TABLES } from './schema';

/**
 * ลบข้อมูลผู้ใช้ทุกตารางในเครื่องแบบถาวร (ไม่ใช่ soft delete) ในทรานแซกชันเดียว
 * ล้มเหลว = ไม่มีอะไรถูกลบ — ใช้ตอน "ลบข้อมูลทั้งหมดในเครื่อง"
 */
export function wipeUserTables(): void {
  transaction(() => {
    for (const name of USER_TABLE_NAMES) getDb().delete(USER_TABLES[name]).run();
  });
}
