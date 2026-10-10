import { onAccountDeleted, onBeforeSignOut, onEntitled } from './access/accountFlow';
import { getAccess } from './access/useAccess';
import { claimLocalRows, configureSync, requestSync, syncNow, wipeLocalData } from './sync/engine';
import { useAuth } from '../stores/auth';
import { notifyDataChanged } from '../stores/dataVersion';
import { onLocalWrite } from '../db/mutations';
import { onOwnerChange } from '../db/owner';
import { draftRepo } from './onboarding/draft';
import { migrateDraftToAccount } from './onboarding/migrate';

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
const FIRST_PULL_TIMEOUT_MS = 8_000;

export function registerAppHooks(): void {
  if (registered) return;
  registered = true;
  // ข้อมูลในเครื่องเปลี่ยน → หน้าจอรีเฟรช
  onLocalWrite(() => notifyDataChanged());
  onOwnerChange(() => notifyDataChanged());
  configureSync({
    userId: () => useAuth.getState().user?.id ?? null,
    canSync: () => getAccess().allowed,
  });
  onEntitled(async (userId) => {
    claimLocalRows(userId);
    // ดึงข้อมูลจากคลาวด์ก่อน (เครื่องใหม่ B11) แล้วค่อยย้ายข้อมูลตั้งค่าเริ่มต้น เพื่อไม่สร้างโปรแกรมซ้ำ
    if (draftRepo.get() && !draftRepo.get()?.migratedAt) {
      await Promise.race([syncNow(), new Promise((r) => setTimeout(r, FIRST_PULL_TIMEOUT_MS))]);
      migrateDraftToAccount(userId);
    }
    for (const task of extraEntitledHooks) await task(userId);
    requestSync(0);
  });
  onBeforeSignOut(async () => {
    await Promise.race([syncNow(), new Promise((r) => setTimeout(r, SIGN_OUT_FLUSH_TIMEOUT_MS))]);
  });
  onAccountDeleted((userId) => {
    wipeLocalData(userId);
    // คำตอบตั้งค่าเริ่มต้น (เพศ อายุ น้ำหนัก ฯลฯ) เป็นข้อมูลส่วนตัวด้วย ต้องลบตาม "ลบข้อมูลในเครื่อง" (B12)
    draftRepo.clear();
  });
}

/** สำหรับเทสต์ */
export function resetAppHooksForTests(): void {
  registered = false;
  extraEntitledHooks.length = 0;
}
