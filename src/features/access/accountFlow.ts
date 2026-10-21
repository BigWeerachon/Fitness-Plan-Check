import { entitlementRepo } from '../../db/repos/entitlementRepo';
import { getOwner } from '../../db/owner';
import { deriveSnapshot, hasAccess, type CustomerInfoLike } from '../../domain/entitlement/machine';
import type { StorePlan, TrialEligibility } from '../../domain/entitlement/paywall';
import type { PurchaseResult } from '../../services/purchases/types';
import { getServices } from '../../services/registry';
import { useEntitlement } from '../../stores/entitlement';
import { now } from '../../utils/clock';
import { getAccess } from './useAccess';

/**
 * ลำดับงานของสิทธิ์และการซื้อ (SPEC B4–B6, B9; ไม่มีบัญชี/ล็อกอิน D81) — UI เรียกฟังก์ชันในไฟล์นี้เท่านั้น
 *
 * เปิดแอป → โหลดแคชสิทธิ์ในเครื่อง → ตรวจกับ RevenueCat (ผู้ใช้นิรนาม) เมื่อออนไลน์
 * ซื้อ → เรียกสโตร์ได้ทันที ไม่ต้องล็อกอินก่อน
 * กู้คืน → สโตร์ผูกการซื้อในบัญชี Apple ID / Google กับเครื่องนี้ (เครื่องใหม่/ติดตั้งใหม่)
 * ได้สิทธิ์ → เรียก hook "onEntitled" (ย้ายข้อมูลตั้งค่าเริ่มต้นเข้าข้อมูลหลัก)
 */

type Hook = () => void | Promise<void>;
const entitledHooks = new Set<Hook>();

/** ลงทะเบียนงานที่ต้องทำเมื่อเครื่องนี้มีสิทธิ์ใช้งาน (เรียกซ้ำได้ ต้อง idempotent) */
export function onEntitled(hook: Hook): () => void {
  entitledHooks.add(hook);
  return () => entitledHooks.delete(hook);
}

async function runEntitledHooks() {
  for (const h of [...entitledHooks]) {
    try {
      await h();
    } catch (e) {
      console.warn('[entitlement] hook failed', e);
    }
  }
}

let unsubscribeInfo: (() => void) | null = null;

/** ข้อมูลที่เก่ากว่านี้ถือว่า SDK อ่านจากแคชในเครื่อง (ออฟไลน์) ไม่ใช่ผลตรวจสด */
export const LIVE_INFO_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * RevenueCat SDK ตอนออฟไลน์อาจคืน CustomerInfo จากแคชบนเครื่องแทนการ error
 * ถ้าถือว่าเป็นข้อมูลสด ช่วงผ่อนผันออฟไลน์ 48 ชม. (B9) จะไม่ทำงาน จึงตัดสินจาก requestDate
 */
export function isLiveInfo(info: CustomerInfoLike, nowMs: number): boolean {
  const requested = Date.parse(info.requestDate ?? '');
  return Number.isNaN(requested) || nowMs - requested <= LIVE_INFO_MAX_AGE_MS;
}

/** รับ CustomerInfo จาก RevenueCat → สถานะ → แคช → แจ้ง hook เมื่อมีสิทธิ์ — คืนว่าเป็นข้อมูลสดหรือไม่ */
export function applyCustomerInfo(info: CustomerInfoLike): boolean {
  // สิทธิ์เป็นของเครื่องนี้ (ผู้ใช้ RevenueCat นิรนาม) แคชไว้ใต้เจ้าของเดียวกับข้อมูลในเครื่อง
  const key = getOwner();
  const nowMs = now();
  const live = isLiveInfo(info, nowMs);
  const snapshot = deriveSnapshot(info, nowMs);
  // ข้อมูลเก่าจากแคชของ SDK ไม่เขียนทับแคชของเราที่อาจใหม่กว่า
  if (live || !useEntitlement.getState().cached) entitlementRepo.save(key, snapshot);
  const effective = live
    ? { ...snapshot, userId: key }
    : (entitlementRepo.get(key) ?? { ...snapshot, userId: key });
  useEntitlement.getState().set({ cached: effective, fresh: live });
  if (hasAccess(effective.state)) void runEntitledHooks();
  return live;
}

/** ตรวจสิทธิ์กับ RevenueCat: ดึง CustomerInfo → ใช้ → ตั้งสถานะออนไลน์ (ล้มเหลว = ออฟไลน์) */
async function checkEntitlementOnline(fetchInfo: () => Promise<CustomerInfoLike>): Promise<void> {
  useEntitlement.getState().set({ checking: true });
  try {
    const live = applyCustomerInfo(await fetchInfo());
    useEntitlement.getState().set({ online: live });
  } catch {
    // ออฟไลน์: ใช้แคช (SPEC B9) แล้วตรวจใหม่เมื่อออนไลน์
    useEntitlement.getState().set({ online: false });
  } finally {
    useEntitlement.getState().set({ checking: false });
  }
}

/** โหลดแคชสิทธิ์ของเครื่องนี้เข้า store (ไม่เรียกเครือข่าย) */
export function loadCachedEntitlement(): void {
  const cached = entitlementRepo.get(getOwner());
  useEntitlement.getState().set({ cached, fresh: false, loaded: true });
}

/** เรียกครั้งเดียวตอนเปิดแอป */
export async function bootstrapEntitlement(): Promise<void> {
  const { purchases } = getServices();
  loadCachedEntitlement();
  // getAccess() อ่านจาก store ที่เพิ่งตั้งด้านบน (รวมกฎหมดอายุ/ช่วงผ่อนผันแล้ว)
  if (getAccess().allowed) void runEntitledHooks();
  try {
    await purchases.configure();
  } catch (e) {
    console.warn('[entitlement] purchases configure failed', e);
  }
  unsubscribeInfo?.();
  unsubscribeInfo = purchases.onCustomerInfo((info) => {
    applyCustomerInfo(info);
  });
  await refreshEntitlement();
}

/** ตรวจสิทธิ์ใหม่ (เปิดแอป/กลับเข้าแอป/กลับมาออนไลน์) */
export async function refreshEntitlement(): Promise<void> {
  const { purchases } = getServices();
  await checkEntitlementOnline(() => purchases.getCustomerInfo());
}

/** ตรวจสิทธิ์ทดลองฟรีกับสโตร์ก่อนแสดง Paywall (SPEC B6) */
export async function checkTrialEligibility(monthly: StorePlan | null): Promise<TrialEligibility> {
  if (!monthly) return 'ineligible';
  try {
    const result = await getServices().purchases.checkTrialEligibility(monthly);
    useEntitlement.getState().set({ trialEligibility: result });
    return result;
  } catch {
    useEntitlement.getState().set({ trialEligibility: 'unknown' });
    return 'unknown';
  }
}

/** ซื้อ/เริ่มทดลองผ่านสโตร์โดยตรง (ไม่มีขั้นล็อกอิน D81) */
export async function purchasePlan(plan: StorePlan): Promise<PurchaseResult> {
  const result = await getServices().purchases.purchase(plan);
  if (result.status === 'success') applyCustomerInfo(result.info);
  return result;
}

/** restored = ได้สิทธิ์, ended = พบสมาชิกในบัญชีสโตร์แต่หมดอายุ/ชำระเงินไม่ผ่าน, none = ไม่พบการซื้อเลย */
export type RestoreOutcome = 'restored' | 'ended' | 'none' | 'error';

/** กู้คืนการซื้อจากบัญชีสโตร์ของเครื่องนี้ (เครื่องใหม่/ติดตั้งใหม่) — ไม่ต้องล็อกอิน */
export async function restorePurchases(): Promise<RestoreOutcome> {
  try {
    const info = await getServices().purchases.restore();
    applyCustomerInfo(info);
    const { state } = deriveSnapshot(info, now());
    if (hasAccess(state)) return 'restored';
    return state === 'EXPIRED' ? 'ended' : 'none';
  } catch {
    return 'error';
  }
}

export async function manageSubscriptionsUrl(): Promise<string> {
  return getServices().purchases.manageSubscriptionsUrl();
}
