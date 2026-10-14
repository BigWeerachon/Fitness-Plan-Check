import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { onboardingDraft } from '../../db/schema';
import type { ActivityLevel, Goal, LengthUnit, Sex, WeightUnit } from '../../db/schema';
import { getOwner } from '../../db/owner';
import { now } from '../../utils/clock';

/**
 * ข้อมูลขั้นตั้งค่าเริ่มต้น (SPEC C) เก็บเป็นร่างชั่วคราวก่อนมีสิทธิ์ใช้งาน (B3)
 * ย้ายเข้าข้อมูลหลักหลังได้สิทธิ์ (B4 ขั้นสุดท้าย) ด้วย applyOnboardingDraft
 */
export type QuickStart = { kind: 'template'; key: string } | { kind: 'custom' } | { kind: 'skip' };

export interface DraftData {
  sex?: Sex | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  goal?: Goal | null;
  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;
  profileSkipped?: boolean;
  quickStart?: QuickStart;
}

/** ค่าที่เก็บเมื่อกด "ข้ามไปก่อน" ขั้น 2: ล้างข้อมูลร่างกายที่เคยกรอก (กรอก → ถัดไป → ย้อนกลับ → ข้าม) เหลือแค่หน่วย */
export function skippedProfileDraft(units: Pick<DraftData, 'weightUnit' | 'lengthUnit'>): DraftData {
  return {
    sex: null,
    age: null,
    heightCm: null,
    weightKg: null,
    activityLevel: null,
    goal: null,
    weightUnit: units.weightUnit,
    lengthUnit: units.lengthUnit,
    profileSkipped: true,
  };
}

const ID = 'draft';

export interface DraftRow {
  data: DraftData;
  migratedAt: number | null;
  migratedTo: string | null;
}

export const draftRepo = {
  get(): DraftRow | null {
    const row = getDb().select().from(onboardingDraft).where(eq(onboardingDraft.id, ID)).get();
    return row
      ? { data: row.data as DraftData, migratedAt: row.migratedAt, migratedTo: row.migratedTo }
      : null;
  },
  /** รวมค่าใหม่เข้ากับร่างเดิม */
  save(patch: DraftData): DraftData {
    const current = draftRepo.get()?.data ?? {};
    const data = { ...current, ...patch };
    getDb()
      .insert(onboardingDraft)
      .values({
        id: ID,
        data: data as Record<string, unknown>,
        updatedAt: now(),
        migratedAt: null,
        migratedTo: null,
      })
      .onConflictDoUpdate({
        target: onboardingDraft.id,
        set: { data: data as Record<string, unknown>, updatedAt: now() },
      })
      .run();
    return data;
  },
  /** ทำเครื่องหมายว่าย้ายร่างเข้าข้อมูลหลักแล้ว (migratedTo = เจ้าของข้อมูลในเครื่อง) */
  markApplied(): void {
    getDb()
      .update(onboardingDraft)
      .set({ migratedAt: now(), migratedTo: getOwner() })
      .where(eq(onboardingDraft.id, ID))
      .run();
  },
  clear(): void {
    getDb().delete(onboardingDraft).where(eq(onboardingDraft.id, ID)).run();
  },
};
