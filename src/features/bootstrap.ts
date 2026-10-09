import { onAccountDeleted, onBeforeSignOut, onEntitled } from './access/accountFlow';
import { getAccess } from './access/useAccess';
import { claimLocalRows, configureSync, requestSync, syncNow, wipeLocalData } from './sync/engine';
import { useAuth } from '../stores/auth';

/**
 * ลงทะเบียนงานที่ต้องเกิดตามเหตุการณ์ของบัญชี (เรียกครั้งเดียวตอนเปิดแอป)
 * - ได้สิทธิ์ → ผูกข้อมูลในเครื่องกับบัญชี + เริ่มซิงก์ (ดึงข้อมูลจากคลาวด์ด้วย — เครื่องใหม่ได้ข้อมูลครบ B11)
 * - ล็อกเอาต์ → พยายามส่งคิวซิงก์ที่ค้างก่อน (ไม่ส่งได้ก็ไม่หาย เพราะข้อมูลยังอยู่ในเครื่อง)
 * - ลบบัญชี → ลบข้อมูลในเครื่องของบัญชีนั้น
 */
let registered = false;
const extraEntitledHooks: ((userId: string) => void | Promise<void>)[] = [];

/** ฟีเจอร์อื่นเพิ่มงานตอนได้สิทธิ์ (เช่น ย้ายข้อมูลตั้งค่าเริ่มต้น) — ทำก่อนเริ่มซิงก์ */
export function addEntitledTask(task: (userId: string) => void | Promise<void>): void {
  extraEntitledHooks.push(task);
}

const SIGN_OUT_FLUSH_TIMEOUT_MS = 5_000;

export function registerAppHooks(): void {
  if (registered) return;
  registered = true;
  configureSync({
    userId: () => useAuth.getState().user?.id ?? null,
    canSync: () => getAccess().allowed,
  });
  onEntitled(async (userId) => {
    for (const task of extraEntitledHooks) await task(userId);
    claimLocalRows(userId);
    requestSync(0);
  });
  onBeforeSignOut(async () => {
    await Promise.race([syncNow(), new Promise((r) => setTimeout(r, SIGN_OUT_FLUSH_TIMEOUT_MS))]);
  });
  onAccountDeleted((userId) => {
    wipeLocalData(userId);
  });
}

/** สำหรับเทสต์ */
export function resetAppHooksForTests(): void {
  registered = false;
  extraEntitledHooks.length = 0;
}
