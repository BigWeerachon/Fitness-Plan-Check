import { asc, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { createRow, updateRow, type PatchInput } from '../mutations';
import { profile, type Profile } from '../schema';
import { live } from './query';

/** โปรไฟล์และการตั้งค่าที่ผูกบัญชี (หน่วย ตัวจับเวลาพัก วันเริ่มสัปดาห์ โปรแกรมที่ใช้งาน) — หนึ่งแถวต่อบัญชี */
export const profileRepo = {
  /**
   * ถ้ามีโปรไฟล์ซ้ำ (สองเครื่องสร้างตอนออฟไลน์) ใช้แถวที่แก้ไขล่าสุด เพื่อไม่ให้การแก้ไขถูกซ่อน
   * ระหว่างรอ sync รวมแถว (reconcileDuplicateRows)
   */
  get(): Profile | undefined {
    return getDb()
      .select()
      .from(profile)
      .where(live(profile))
      .orderBy(desc(profile.updatedAt), asc(profile.createdAt), asc(profile.id))
      .get();
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
