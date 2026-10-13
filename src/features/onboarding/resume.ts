import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo } from '../../db/repos/programRepo';
import { hasBodyData, nextOnboardingStep, shouldMigrateDraft } from '../../domain/onboardingResume';
import { useSettings } from '../../stores/settings';
import { syncNow, type SyncOutcome } from '../sync/engine';
import { draftRepo } from './draft';
import { migrateDraftToAccount } from './migrate';

/** รอดึงข้อมูลจากคลาวด์รอบแรกได้นานสุดเท่านี้ (ออฟไลน์/ช้า → ไปต่อโดยไม่รอ) */
export const FIRST_PULL_TIMEOUT_MS = 8_000;

/** ดึงข้อมูลจากคลาวด์รอบแรก (เครื่องใหม่ B11) — คืนผลซิงก์ หรือ 'timeout' ถ้าช้าเกินกำหนด */
export async function waitForFirstPull(): Promise<SyncOutcome | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), FIRST_PULL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([syncNow(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ย้ายร่างตั้งค่าเริ่มต้นเข้าบัญชีเมื่อถึงเวลา (ดู shouldMigrateDraft) — ดึงข้อมูลคลาวด์ก่อนเพื่อไม่สร้างโปรแกรมซ้ำ
 * ถ้ายังทำไม่ครบ (กลางขั้น 2–3) จะไม่ทำอะไร ปล่อยให้ปุ่มเสร็จสิ้นของขั้น 3 ย้ายเอง
 */
export async function migrateDraftWhenReady(userId: string): Promise<void> {
  const draft = draftRepo.get();
  const ready = shouldMigrateDraft({
    hasDraft: !!draft,
    migrated: !!draft?.migratedAt,
    onboardingDone: useSettings.getState().onboardingDone,
    hasQuickStart: !!draft?.data.quickStart,
  });
  if (!ready) return;
  await waitForFirstPull();
  migrateDraftToAccount(userId);
}

export type EntitledResume = 'profile' | 'program' | 'done' | 'unknown';

/**
 * ผู้ใช้ที่ล็อกอินและมีสิทธิ์อยู่แล้วแต่เครื่องนี้ยังไม่เคยผ่านตั้งค่าเริ่มต้น (เช่น ติดตั้งใหม่ B11):
 * หลังดึงข้อมูลคลาวด์รอบแรก ข้ามขั้นที่มีข้อมูลแล้ว (SPEC C) — ครบทุกขั้นก็ทำเครื่องหมายว่าเสร็จและเข้าแอปได้เลย
 * ดึงข้อมูลไม่สำเร็จ → 'unknown' (ไม่รู้ว่าคลาวด์มีอะไร จึงไม่ข้ามขั้นใด)
 */
export async function resumeEntitledOnboarding(userId: string): Promise<EntitledResume> {
  const outcome = await waitForFirstPull();
  if (outcome !== 'synced') return 'unknown';
  const step = nextOnboardingStep({
    hasBodyData: hasBodyData(profileRepo.get()),
    hasProgram: programRepo.list().length > 0,
  });
  if (step === 'done') {
    useSettings.getState().set('onboardingDone', true);
    migrateDraftToAccount(userId);
  }
  return step;
}
