import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo } from '../../db/repos/programRepo';
import { currentLanguage, t } from '../../i18n';
import { createEmptyProgram, instantiateTemplate } from '../programs/instantiate';
import { draftRepo } from './draft';

/**
 * ย้ายข้อมูลขั้นตั้งค่าเริ่มต้น (ในเครื่อง) เข้าบัญชีหลังได้สิทธิ์ (SPEC B4 ขั้นสุดท้าย)
 * - ทำครั้งเดียวต่อร่าง (idempotent)
 * - ไม่ทับข้อมูลที่บัญชีมีอยู่แล้ว (เช่น ติดตั้งใหม่แล้วดึงข้อมูลจากคลาวด์มาแล้ว B11): เติมเฉพาะช่องที่ว่าง
 *   และสร้างโปรแกรมจากเทมเพลตเฉพาะเมื่อบัญชียังไม่มีโปรแกรมเลย
 * เรียกหลังพยายามดึงข้อมูลจากคลาวด์แล้ว (ดู registerAppHooks)
 */
export function migrateDraftToAccount(userId: string): 'migrated' | 'nothing' {
  const draft = draftRepo.get();
  if (!draft || draft.migratedAt) return 'nothing';
  const d = draft.data;
  const existing = profileRepo.get();
  const patch: Parameters<typeof profileRepo.update>[0] = {};
  const fill = <K extends keyof typeof patch>(key: K, value: (typeof patch)[K] | undefined | null) => {
    if (value === undefined || value === null) return;
    const current = existing?.[key as keyof typeof existing];
    if (current === undefined || current === null) patch[key] = value;
  };
  fill('sex', d.sex);
  fill('age', d.age);
  fill('heightCm', d.heightCm);
  fill('weightKg', d.weightKg);
  fill('activityLevel', d.activityLevel);
  fill('goal', d.goal);
  if (!existing) {
    if (d.weightUnit) patch.weightUnit = d.weightUnit;
    if (d.lengthUnit) patch.lengthUnit = d.lengthUnit;
  }
  profileRepo.update(patch);

  if (programRepo.list().length === 0 && d.quickStart) {
    if (d.quickStart.kind === 'template') instantiateTemplate(d.quickStart.key, currentLanguage());
    else if (d.quickStart.kind === 'custom') createEmptyProgram(t('programs.defaultName'));
  }
  draftRepo.markMigrated(userId);
  return 'migrated';
}
