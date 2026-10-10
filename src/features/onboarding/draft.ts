import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { onboardingDraft } from '../../db/schema';
import type { ActivityLevel, Goal, LengthUnit, Sex, WeightUnit } from '../../db/schema';
import { now } from '../../utils/clock';

/**
 * ข้อมูลขั้นตั้งค่าเริ่มต้น (SPEC C) เก็บในเครื่องชั่วคราวก่อนล็อกอิน (B3)
 * ย้ายเข้าบัญชีหลังได้สิทธิ์ (B4 ขั้นสุดท้าย) ด้วย migrateDraftToAccount
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
  markMigrated(userId: string): void {
    getDb()
      .update(onboardingDraft)
      .set({ migratedAt: now(), migratedTo: userId })
      .where(eq(onboardingDraft.id, ID))
      .run();
  },
  clear(): void {
    getDb().delete(onboardingDraft).where(eq(onboardingDraft.id, ID)).run();
  },
};
