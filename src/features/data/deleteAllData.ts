import { wipeLocalData } from '../../db/wipe';
import { notifyDataChanged } from '../../stores/dataVersion';
import { useEntitlement } from '../../stores/entitlement';
import { useRestTimer } from '../../stores/restTimer';
import { useSettings, type DeviceSettings } from '../../stores/settings';
import { refreshEntitlement } from '../access/accountFlow';

/**
 * ค่าตั้งค่าที่นับเป็นข้อมูลของผู้ใช้และถูกลบไปด้วย: สถานะ "ผ่านตั้งค่าเริ่มต้นแล้ว" (เริ่มใหม่ตั้งแต่ต้น)
 * และวันที่สำรองข้อมูลล่าสุด (ไม่มีข้อมูลให้สำรองแล้ว D82)
 * ภาษา/ธีม/สีหลัก/มุมมองสถิติเป็นค่าของเครื่อง ไม่ใช่ข้อมูลส่วนตัว จึงเก็บไว้ (D81)
 */
export const USER_SETTING_KEYS = [
  'onboardingDone',
  'lastBackupAt',
] as const satisfies readonly (keyof DeviceSettings)[];

/**
 * ลบข้อมูลทั้งหมดในเครื่องนี้ (แทน "ลบบัญชี" เดิม D81): ข้อมูลการฝึก/โปรไฟล์ทุกตาราง ร่างตั้งค่าเริ่มต้น
 * แคชสิทธิ์ และค่าตั้งค่าใน USER_SETTING_KEYS — ลบในทรานแซกชันเดียว ล้มเหลว = ไม่มีอะไรถูกลบ (โยน error)
 * ไม่ยกเลิกการสมัครในสโตร์: ตรวจสิทธิ์กับสโตร์ใหม่ทันทีเพื่อให้สมาชิกที่ยังมีสิทธิ์ใช้ต่อได้
 */
export async function deleteAllLocalData(): Promise<void> {
  wipeLocalData(USER_SETTING_KEYS);
  // โหลดค่าตั้งค่าใหม่จากฐานข้อมูล → ค่าที่ถูกลบกลับเป็นค่าเริ่มต้น
  useSettings.getState().load();
  useEntitlement.getState().set({ cached: null, fresh: false, trialEligibility: 'unknown' });
  useRestTimer.getState().stop();
  notifyDataChanged();
  await refreshEntitlement();
}
