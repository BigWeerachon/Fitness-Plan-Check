import { inArray } from 'drizzle-orm';
import { getDb, transaction } from './client';
import { appSettings, entitlementCache, onboardingDraft, USER_TABLE_NAMES, USER_TABLES } from './schema';

/** ลบข้อมูลผู้ใช้ทุกตาราง (ข้อมูลการฝึก/โปรไฟล์) แบบถาวร ไม่ใช่ soft delete — ต้องเรียกในทรานแซกชัน */
function deleteUserTables(): void {
  for (const name of USER_TABLE_NAMES) getDb().delete(USER_TABLES[name]).run();
}

/**
 * "ลบข้อมูลทั้งหมดในเครื่องนี้" (D81): ตารางผู้ใช้ทุกตาราง + ร่างตั้งค่าเริ่มต้น + แคชสิทธิ์
 * + ค่าตั้งค่าที่ระบุ (settingKeys) ในทรานแซกชันเดียว — ล้มเหลว = ไม่มีอะไรถูกลบ
 */
export function wipeLocalData(settingKeys: readonly string[]): void {
  transaction(() => {
    deleteUserTables();
    getDb().delete(onboardingDraft).run();
    getDb().delete(entitlementCache).run();
    if (settingKeys.length > 0) {
      getDb()
        .delete(appSettings)
        .where(inArray(appSettings.key, [...settingKeys]))
        .run();
    }
  });
}
