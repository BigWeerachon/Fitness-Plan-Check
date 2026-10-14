/**
 * ตรรกะตัดสินว่าผู้ที่มีสิทธิ์อยู่แล้ว (เช่น กู้คืนการซื้อบนเครื่องใหม่) ต้องทำขั้นตั้งค่าเริ่มต้นขั้นไหนต่อ (SPEC C)
 * ข้ามได้เฉพาะขั้นที่มีข้อมูลในเครื่องแล้ว — ขั้น 1 (ภาษา/ธีม/สี) เป็นค่าของเครื่องจึงไม่เกี่ยว
 */

export interface BodyDataLike {
  sex?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: string | null;
  goal?: string | null;
}

/** โปรไฟล์มีข้อมูลร่างกายอย่างน้อยหนึ่งช่องหรือไม่ (หน่วยอย่างเดียวไม่นับ) */
export function hasBodyData(profile: BodyDataLike | null | undefined): boolean {
  if (!profile) return false;
  return [
    profile.sex,
    profile.age,
    profile.heightCm,
    profile.weightKg,
    profile.activityLevel,
    profile.goal,
  ].some((v) => v !== undefined && v !== null);
}

export type OnboardingResumeStep = 'profile' | 'program' | 'done';

/** ขั้นที่ต้องไปต่อ: ยังไม่มีข้อมูลร่างกาย → ขั้น 2, ยังไม่มีโปรแกรม → ขั้น 3, ครบแล้ว → เข้าแอป */
export function nextOnboardingStep(input: {
  hasBodyData: boolean;
  hasProgram: boolean;
}): OnboardingResumeStep {
  if (!input.hasBodyData) return 'profile';
  if (!input.hasProgram) return 'program';
  return 'done';
}

/**
 * ควรย้ายร่างตั้งค่าเริ่มต้นเข้าข้อมูลหลักตอนนี้หรือยัง — ย้ายเมื่อผู้ใช้ทำครบแล้ว (onboardingDone) หรือเลือกโปรแกรมแล้ว
 * ห้ามย้ายกลางทาง (หลังขั้น 2 ก่อนขั้น 3) ไม่งั้นร่างถูกตีว่าย้ายแล้วและโปรแกรมที่เลือกทีหลังไม่ถูกสร้าง
 */
export function shouldMigrateDraft(input: {
  hasDraft: boolean;
  migrated: boolean;
  onboardingDone: boolean;
  hasQuickStart: boolean;
}): boolean {
  if (!input.hasDraft || input.migrated) return false;
  return input.onboardingDone || input.hasQuickStart;
}
