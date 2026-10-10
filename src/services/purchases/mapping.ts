import type { PlanKind, StorePlan } from '../../domain/entitlement/paywall';

/** รูปร่างขั้นต่ำของ PurchasesPackage ที่ใช้ (แยกไว้ให้เทสต์ได้โดยไม่ต้องมี native module) */
export interface PackageLike {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    priceString: string;
    introPrice?: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null;
    defaultOption?: {
      freePhase?: {
        billingPeriod: { unit: string; value: number };
        billingCycleCount?: number | null;
      } | null;
    } | null;
  };
}

export interface OfferingLike {
  monthly: PackageLike | null;
  lifetime: PackageLike | null;
  availablePackages: PackageLike[];
}

const DAYS_PER_UNIT: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/**
 * จำนวนวันทดลองฟรีที่สโตร์ตั้งไว้ให้แพ็กเกจ (null = ไม่มี free trial)
 * iOS: introductory offer ราคา 0 / Google Play: defaultOption.freePhase
 */
export function trialDaysOf(pkg: PackageLike | null | undefined): number | null {
  if (!pkg) return null;
  const free = pkg.product.defaultOption?.freePhase;
  if (free) {
    const per = DAYS_PER_UNIT[free.billingPeriod.unit.toUpperCase()];
    if (per) return per * free.billingPeriod.value * Math.max(1, free.billingCycleCount ?? 1);
  }
  const intro = pkg.product.introPrice;
  if (intro && intro.price === 0) {
    const per = DAYS_PER_UNIT[intro.periodUnit.toUpperCase()];
    if (per) return per * intro.periodNumberOfUnits * Math.max(1, intro.cycles);
  }
  return null;
}

function toPlan(kind: PlanKind, pkg: PackageLike | null): StorePlan | null {
  if (!pkg) return null;
  return {
    kind,
    packageId: pkg.identifier,
    productId: pkg.product.identifier,
    priceString: pkg.product.priceString,
    trialDays: kind === 'monthly' ? trialDaysOf(pkg) : null,
  };
}

/** หาแพ็กเกจรายเดือน/ซื้อขาดจาก offering ปัจจุบัน (ใช้ package type มาตรฐานก่อน แล้วค่อยดูจาก product id) */
export function plansFromOffering(offering: OfferingLike | null | undefined): {
  monthly: StorePlan | null;
  lifetime: StorePlan | null;
} {
  if (!offering) return { monthly: null, lifetime: null };
  const byType = (type: string) => offering.availablePackages.find((p) => p.packageType === type) ?? null;
  const byId = (part: string) =>
    offering.availablePackages.find((p) => p.product.identifier.toLowerCase().includes(part)) ?? null;
  return {
    monthly: toPlan('monthly', offering.monthly ?? byType('MONTHLY') ?? byId('monthly')),
    lifetime: toPlan('lifetime', offering.lifetime ?? byType('LIFETIME') ?? byId('lifetime')),
  };
}
