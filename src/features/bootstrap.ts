import { onEntitled } from './access/accountFlow';
import { notifyDataChanged } from '../stores/dataVersion';
import { onLocalWrite } from '../db/mutations';
import { applyDraftWhenReady } from './onboarding/resume';

/**
 * ลงทะเบียนงานที่ต้องเกิดตามเหตุการณ์ของแอป (เรียกครั้งเดียวตอนเปิดแอป)
 * - ข้อมูลในเครื่องเปลี่ยน → หน้าจอรีเฟรช
 * - ได้สิทธิ์ → ย้ายร่างตั้งค่าเริ่มต้นเข้าข้อมูลหลัก (เมื่อพร้อม)
 */
let registered = false;
const extraEntitledHooks: (() => void | Promise<void>)[] = [];

/** ฟีเจอร์อื่นเพิ่มงานตอนได้สิทธิ์ — ทำหลังย้ายข้อมูลตั้งค่าเริ่มต้น */
export function addEntitledTask(task: () => void | Promise<void>): void {
  extraEntitledHooks.push(task);
}

export function registerAppHooks(): void {
  if (registered) return;
  registered = true;
  onLocalWrite(() => notifyDataChanged());
  onEntitled(async () => {
    // ย้ายเฉพาะเมื่อผู้ใช้ทำตั้งค่าเริ่มต้นครบแล้ว ไม่งั้นร่างที่ยังไม่ครบถูกตีว่าย้ายแล้วและโปรแกรมที่เลือกทีหลังหาย
    applyDraftWhenReady();
    for (const task of extraEntitledHooks) await task();
  });
}

/** สำหรับเทสต์ */
export function resetAppHooksForTests(): void {
  registered = false;
  extraEntitledHooks.length = 0;
}
