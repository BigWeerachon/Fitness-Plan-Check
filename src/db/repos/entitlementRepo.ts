import { eq } from 'drizzle-orm';
import type { EntitlementSnapshot, EntitlementState, PeriodType } from '../../domain/entitlement/machine';
import { getDb } from '../client';
import { entitlementCache } from '../schema';

export type CachedEntitlement = EntitlementSnapshot & { userId: string };

/** แคชสถานะสิทธิ์ (SPEC B9) ใต้เจ้าของในเครื่อง (getOwner) — เขียนจากข้อมูล RevenueCat เท่านั้น */
export const entitlementRepo = {
  get(userId: string): CachedEntitlement | null {
    const row = getDb().select().from(entitlementCache).where(eq(entitlementCache.userId, userId)).get();
    if (!row) return null;
    return {
      userId: row.userId,
      state: row.state as EntitlementState,
      productId: row.productId,
      periodType: (row.periodType as PeriodType | null) ?? null,
      expirationDate: row.expirationDate,
      willRenew: row.willRenew,
      billingIssueAt: row.billingIssueAt,
      verifiedAt: row.verifiedAt,
      alsoRenewingMonthly: row.alsoRenewingMonthly,
    };
  },
  save(userId: string, s: EntitlementSnapshot): void {
    const values = {
      userId,
      state: s.state,
      productId: s.productId,
      periodType: s.periodType,
      expirationDate: s.expirationDate,
      willRenew: s.willRenew,
      billingIssueAt: s.billingIssueAt,
      verifiedAt: s.verifiedAt,
      alsoRenewingMonthly: s.alsoRenewingMonthly,
    };
    getDb()
      .insert(entitlementCache)
      .values(values)
      .onConflictDoUpdate({ target: entitlementCache.userId, set: values })
      .run();
  },
};
