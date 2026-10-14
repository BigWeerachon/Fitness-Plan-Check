import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo } from '../../db/repos/programRepo';
import { hasBodyData, nextOnboardingStep, shouldMigrateDraft } from '../../domain/onboardingResume';
import { useSettings } from '../../stores/settings';
import { draftRepo } from './draft';
import { applyOnboardingDraft } from './migrate';

/**
 * ย้ายร่างตั้งค่าเริ่มต้นเข้าข้อมูลหลักเมื่อถึงเวลา (ดู shouldMigrateDraft)
 * ถ้ายังทำไม่ครบ (กลางขั้น 2–3) จะไม่ทำอะไร ปล่อยให้ปุ่มเสร็จสิ้นของขั้น 3 ย้ายเอง
 */
export function applyDraftWhenReady(): void {
  const draft = draftRepo.get();
  const ready = shouldMigrateDraft({
    hasDraft: !!draft,
    migrated: !!draft?.migratedAt,
    onboardingDone: useSettings.getState().onboardingDone,
    hasQuickStart: !!draft?.data.quickStart,
  });
  if (ready) applyOnboardingDraft();
}

export type EntitledResume = 'profile' | 'program' | 'done';

/**
 * ผู้ใช้ที่มีสิทธิ์อยู่แล้วแต่ยังไม่ได้ทำเครื่องหมายว่าผ่านตั้งค่าเริ่มต้น (เช่น มีข้อมูลในเครื่องอยู่แล้ว):
 * ขั้นที่ต้องทำต่อ โดยข้ามขั้นที่มีข้อมูลแล้ว (SPEC C) — อ่านอย่างเดียว
 */
export function entitledResumeStep(): EntitledResume {
  return nextOnboardingStep({
    hasBodyData: hasBodyData(profileRepo.get()),
    hasProgram: programRepo.list().length > 0,
  });
}

/** ครบทุกขั้นแล้ว: ทำเครื่องหมายว่าตั้งค่าเริ่มต้นเสร็จ (AccessGate จะพาเข้าแอปเอง) และย้ายร่างที่เหลือ */
export function completeEntitledOnboarding(): void {
  useSettings.getState().set('onboardingDone', true);
  applyOnboardingDraft();
}
