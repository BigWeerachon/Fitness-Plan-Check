import { asc } from 'drizzle-orm';
import { getDb } from '../client';
import { createRow, updateRow, type PatchInput } from '../mutations';
import { profile, type Profile } from '../schema';
import { live } from './query';

/** โปรไฟล์และการตั้งค่าที่ผูกบัญชี (หน่วย ตัวจับเวลาพัก วันเริ่มสัปดาห์ โปรแกรมที่ใช้งาน) — หนึ่งแถวต่อบัญชี */
export const profileRepo = {
  get(): Profile | undefined {
    return getDb().select().from(profile).where(live(profile)).orderBy(asc(profile.createdAt)).get();
  },
  /** อ่านโปรไฟล์ ถ้ายังไม่มีให้สร้างด้วยค่าเริ่มต้น */
  ensure(): Profile {
    return profileRepo.get() ?? createRow('profile', {});
  },
  update(patch: PatchInput<'profile'>): Profile {
    const current = profileRepo.ensure();
    return updateRow('profile', current.id, patch) ?? current;
  },
};
