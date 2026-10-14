import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo } from '../../db/repos/programRepo';
import { currentLanguage, t } from '../../i18n';
import type { Profile } from '../../db/schema';
import { createEmptyProgram, instantiateTemplate } from '../programs/instantiate';
import { draftRepo, type DraftData, type QuickStart } from './draft';

type ProfilePatch = Parameters<typeof profileRepo.update>[0];

/**
 * ช่องที่ต้องเขียนลงโปรไฟล์จากร่าง — ข้อมูลร่างกายเติมเฉพาะช่องที่โปรไฟล์ยังว่าง (ไม่ทับของเดิม)
 * ส่วนหน่วยตั้งเฉพาะเมื่อยังไม่มีโปรไฟล์เลย (โปรไฟล์เดิมมีหน่วยของตัวเองอยู่แล้ว)
 */
export function buildProfilePatch(draftData: DraftData, existing: Profile | undefined): ProfilePatch {
  const patch: ProfilePatch = {};
  const fill = <K extends keyof ProfilePatch>(key: K, value: ProfilePatch[K] | undefined | null) => {
    if (value === undefined || value === null) return;
    const current = existing?.[key as keyof Profile];
    if (current === undefined || current === null) patch[key] = value;
  };
  // กด "ข้ามไปก่อน" = ไม่ให้ข้อมูลร่างกาย แม้เคยกรอกไว้ก่อนย้อนกลับมากดข้าม (เหลือแค่หน่วย)
  if (!draftData.profileSkipped) {
    fill('sex', draftData.sex);
    fill('age', draftData.age);
    fill('heightCm', draftData.heightCm);
    fill('weightKg', draftData.weightKg);
    fill('activityLevel', draftData.activityLevel);
    fill('goal', draftData.goal);
  }
  if (!existing) {
    if (draftData.weightUnit) patch.weightUnit = draftData.weightUnit;
    if (draftData.lengthUnit) patch.lengthUnit = draftData.lengthUnit;
  }
  return patch;
}

/** สร้างโปรแกรมเริ่มต้นตามที่เลือกในร่าง เฉพาะเมื่อยังไม่มีโปรแกรมเลย */
function createStarterProgramIfNone(quickStart: QuickStart | undefined): void {
  if (programRepo.list().length > 0 || !quickStart) return;
  if (quickStart.kind === 'template') instantiateTemplate(quickStart.key, currentLanguage());
  else if (quickStart.kind === 'custom') createEmptyProgram(t('programs.defaultName'));
}

/**
 * ย้ายร่างตั้งค่าเริ่มต้นเข้าข้อมูลหลักในเครื่องหลังได้สิทธิ์ (SPEC B4 ขั้นสุดท้าย)
 * - ทำครั้งเดียวต่อร่าง (idempotent)
 * - ไม่ทับข้อมูลที่มีอยู่แล้ว (เช่น กู้คืนจากไฟล์สำรองมาก่อน): เติมเฉพาะช่องที่ว่าง
 *   และสร้างโปรแกรมจากเทมเพลตเฉพาะเมื่อยังไม่มีโปรแกรมเลย
 */
export function applyOnboardingDraft(): 'migrated' | 'nothing' {
  const draft = draftRepo.get();
  if (!draft || draft.migratedAt) return 'nothing';
  profileRepo.update(buildProfilePatch(draft.data, profileRepo.get()));
  createStarterProgramIfNone(draft.data.quickStart);
  draftRepo.markApplied();
  return 'migrated';
}
