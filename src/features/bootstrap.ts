import { onAccountDeleted, onEntitled } from './access/accountFlow';
import { notifyDataChanged } from '../stores/dataVersion';
import { onLocalWrite } from '../db/mutations';
import { wipeUserTables } from '../db/wipe';
import { draftRepo } from './onboarding/draft';
import { migrateDraftWhenReady } from './onboarding/resume';

/**
 * ลงทะเบียนงานที่ต้องเกิดตามเหตุการณ์ของบัญชี (เรียกครั้งเดียวตอนเปิดแอป)
 * - ข้อมูลในเครื่องเปลี่ยน → หน้าจอรีเฟรช
 * - ได้สิทธิ์ → ย้ายข้อมูลตั้งค่าเริ่มต้นเข้าข้อมูลหลัก (เมื่อพร้อม)
 * - ลบบัญชี → ลบข้อมูลผู้ใช้ทั้งหมดในเครื่อง
 */
let registered = false;
const extraEntitledHooks: ((userId: string) => void | Promise<void>)[] = [];

/** ฟีเจอร์อื่นเพิ่มงานตอนได้สิทธิ์ — ทำหลังย้ายข้อมูลตั้งค่าเริ่มต้น */
export function addEntitledTask(task: (userId: string) => void | Promise<void>): void {
  extraEntitledHooks.push(task);
}

export function registerAppHooks(): void {
  if (registered) return;
  registered = true;
  onLocalWrite(() => notifyDataChanged());
  onEntitled(async (userId) => {
    // ย้ายเฉพาะเมื่อผู้ใช้ทำตั้งค่าเริ่มต้นครบแล้ว ไม่งั้นร่างที่ยังไม่ครบถูกตีว่าย้ายแล้วและโปรแกรมที่เลือกทีหลังหาย
    migrateDraftWhenReady(userId);
    for (const task of extraEntitledHooks) await task(userId);
  });
  onAccountDeleted(() => {
    wipeUserTables();
    // คำตอบตั้งค่าเริ่มต้น (เพศ อายุ น้ำหนัก ฯลฯ) เป็นข้อมูลส่วนตัวด้วย ต้องลบตาม "ลบข้อมูลในเครื่อง" (B12)
    draftRepo.clear();
    notifyDataChanged();
  });
}

/** สำหรับเทสต์ */
export function resetAppHooksForTests(): void {
  registered = false;
  extraEntitledHooks.length = 0;
}
