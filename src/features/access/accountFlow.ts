import { entitlementRepo } from '../../db/repos/entitlementRepo';
import { setOwner } from '../../db/owner';
import { deriveSnapshot, hasAccess, type CustomerInfoLike } from '../../domain/entitlement/machine';
import { assertCanPurchase, type StorePlan, type TrialEligibility } from '../../domain/entitlement/paywall';
import { AuthCancelledError, type AuthProvider, type AuthUser } from '../../services/auth/types';
import type { PurchaseResult } from '../../services/purchases/types';
import { getServices } from '../../services/registry';
import { useAuth } from '../../stores/auth';
import { useEntitlement } from '../../stores/entitlement';
import { now } from '../../utils/clock';
import { getAccess } from './useAccess';

/**
 * ลำดับงานของบัญชีและสิทธิ์ (SPEC B4, B9, B11, B12) — UI เรียกฟังก์ชันในไฟล์นี้เท่านั้น
 *
 * เปิดแอป → โหลดเซสชันที่จำไว้ + แคชสิทธิ์ → ตรวจกับ RevenueCat เมื่อออนไลน์
 * ล็อกอิน → RevenueCat logIn(userId) → สิทธิ์ของบัญชีกลับมาทันที (เครื่องใหม่/ติดตั้งใหม่)
 * ซื้อ → ต้องล็อกอินและ logIn RevenueCat ด้วย id เดียวกันก่อนเสมอ
 * ได้สิทธิ์ → เรียก hook "onEntitled" (ย้ายข้อมูลตั้งค่าเริ่มต้นเข้าบัญชี + เริ่มซิงก์)
 */

type Hook = (userId: string) => void | Promise<void>;
const entitledHooks = new Set<Hook>();
const signOutHooks = new Set<Hook>();
const deleteHooks = new Set<Hook>();

/** ลงทะเบียนงานที่ต้องทำเมื่อบัญชีมีสิทธิ์ใช้งาน (เรียกซ้ำได้ ต้อง idempotent) */
export function onEntitled(hook: Hook): () => void {
  entitledHooks.add(hook);
  return () => entitledHooks.delete(hook);
}

/** งานก่อนล็อกเอาต์ (เช่น ส่งคิวซิงก์ที่ค้าง) */
export function onBeforeSignOut(hook: Hook): () => void {
  signOutHooks.add(hook);
  return () => signOutHooks.delete(hook);
}

/** งานลบข้อมูลในเครื่องของบัญชีที่ถูกลบ */
export function onAccountDeleted(hook: Hook): () => void {
  deleteHooks.add(hook);
  return () => deleteHooks.delete(hook);
}

async function runHooks(hooks: Set<Hook>, userId: string) {
  for (const h of [...hooks]) {
    try {
      await h(userId);
    } catch (e) {
      console.warn('[account] hook failed', e);
    }
  }
}

let unsubscribeInfo: (() => void) | null = null;
let unsubscribeAuth: (() => void) | null = null;

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
export function applyCustomerInfo(info: CustomerInfoLike, userId: string): boolean {
  if (useAuth.getState().user?.id !== userId) return false;
  const t = now();
  const live = isLiveInfo(info, t);
  const snapshot = deriveSnapshot(info, t);
  // ข้อมูลเก่าจากแคชของ SDK ไม่เขียนทับแคชของเราที่อาจใหม่กว่า
  if (live || !useEntitlement.getState().cached) entitlementRepo.save(userId, snapshot);
  const cached = live ? { ...snapshot, userId } : (entitlementRepo.get(userId) ?? { ...snapshot, userId });
  useEntitlement.getState().set({ cached, fresh: live });
  if (hasAccess(cached.state)) void runHooks(entitledHooks, userId);
  return live;
}

async function linkPurchases(user: AuthUser): Promise<void> {
  const { purchases } = getServices();
  const store = useEntitlement.getState();
  store.set({ checking: true });
  try {
    const info = await purchases.logIn(user.id);
    const live = applyCustomerInfo(info, user.id);
    store.set({ online: live });
  } catch {
    // ออฟไลน์: ใช้แคช (SPEC B9) แล้วตรวจใหม่เมื่อออนไลน์
    store.set({ online: false });
  } finally {
    useEntitlement.getState().set({ checking: false });
  }
}

function adoptUser(user: AuthUser | null): void {
  setOwner(user?.id ?? null);
  useAuth.getState().setUser(user);
  const cached = user ? entitlementRepo.get(user.id) : null;
  useEntitlement.getState().set({ cached, fresh: false });
  if (user && cached && hasAccess(cached.state) && getAccess().allowed) void runHooks(entitledHooks, user.id);
}

/** เรียกครั้งเดียวตอนเปิดแอป */
export async function bootstrapAccount(): Promise<void> {
  const { auth, purchases } = getServices();
  try {
    await purchases.configure();
  } catch (e) {
    console.warn('[account] purchases configure failed', e);
  }
  unsubscribeInfo?.();
  unsubscribeInfo = purchases.onCustomerInfo((info) => {
    const id = purchases.currentAppUserId();
    if (id) applyCustomerInfo(info, id);
  });
  let user: AuthUser | null = null;
  try {
    user = await auth.init();
  } catch (e) {
    console.warn('[account] auth init failed', e);
  }
  adoptUser(user);
  // รับการเปลี่ยนเซสชันภายหลัง: กลับมาออนไลน์แล้วต่ออายุโทเค็นสำเร็จ / ถูกล็อกเอาต์จากเซิร์ฟเวอร์
  unsubscribeAuth?.();
  unsubscribeAuth = auth.onChange((next) => {
    const current = useAuth.getState().user;
    if (!next) {
      if (current) adoptUser(null);
      return;
    }
    if (current?.id === next.id) {
      void refreshEntitlement();
      return;
    }
    adoptUser(next);
    void linkPurchases(next);
  });
  if (user) await linkPurchases(user);
}

/** ตรวจสิทธิ์ใหม่ (กลับเข้าแอป/กลับมาออนไลน์) */
export async function refreshEntitlement(): Promise<void> {
  const user = useAuth.getState().user;
  if (!user) return;
  const { purchases } = getServices();
  if (purchases.currentAppUserId() !== user.id) return linkPurchases(user);
  const store = useEntitlement.getState();
  store.set({ checking: true });
  try {
    const live = applyCustomerInfo(await purchases.getCustomerInfo(), user.id);
    store.set({ online: live });
  } catch {
    store.set({ online: false });
  } finally {
    useEntitlement.getState().set({ checking: false });
  }
}

export type SignInOutcome = 'success' | 'cancelled' | 'error';

/** ล็อกอินด้วย Google/Apple แล้วผูก RevenueCat กับบัญชี (SPEC B4 ขั้น "ล็อกอินสำเร็จ → logIn(userId)") */
export async function signIn(provider: AuthProvider): Promise<SignInOutcome> {
  const { auth } = getServices();
  try {
    const user = await auth.signIn(provider);
    adoptUser(user);
    await linkPurchases(user);
    return 'success';
  } catch (e) {
    if (e instanceof AuthCancelledError) return 'cancelled';
    console.warn('[account] sign-in failed', e);
    return 'error';
  }
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

/**
 * ซื้อ/เริ่มทดลอง — ห้ามเริ่มก่อนล็อกอิน (SPEC B4): ตรวจซ้ำที่นี่และใน adapter อีกชั้น
 */
export async function purchasePlan(plan: StorePlan): Promise<PurchaseResult> {
  const user = useAuth.getState().user;
  const { purchases } = getServices();
  assertCanPurchase({ authUserId: user?.id ?? null, purchasesUserId: purchases.currentAppUserId() });
  const result = await purchases.purchase(plan, user!.id);
  if (result.status === 'success') applyCustomerInfo(result.info, user!.id);
  return result;
}

export type RestoreOutcome = 'restored' | 'none' | 'error' | 'needLogin';

/** กู้คืนการซื้อ — สิทธิ์ผูกกับบัญชี จึงต้องล็อกอินก่อน (ดู DECISIONS.md) */
export async function restorePurchases(): Promise<RestoreOutcome> {
  const user = useAuth.getState().user;
  if (!user) return 'needLogin';
  const { purchases } = getServices();
  try {
    if (purchases.currentAppUserId() !== user.id) await purchases.logIn(user.id);
    const info = await purchases.restore();
    applyCustomerInfo(info, user.id);
    return hasAccess(deriveSnapshot(info, now()).state) ? 'restored' : 'none';
  } catch {
    return 'error';
  }
}

/** ล็อกเอาต์: ข้อมูลในเครื่องของบัญชียังอยู่ (กรองตาม owner) กลับมาครบเมื่อล็อกอินใหม่ */
export async function signOut(): Promise<void> {
  const user = useAuth.getState().user;
  const { auth, purchases } = getServices();
  if (user) await runHooks(signOutHooks, user.id);
  await purchases.logOut();
  await auth.signOut();
  adoptUser(null);
}

/**
 * ลบบัญชีและข้อมูลทั้งหมด (SPEC B12): ลบบนเซิร์ฟเวอร์ (เพิกถอนโทเค็น Apple) → ลบข้อมูลในเครื่องของบัญชีนี้
 * การลบบัญชีไม่ยกเลิกการสมัครในสโตร์ — หน้าจอต้องแจ้งก่อนยืนยัน
 */
export async function deleteAccount(): Promise<void> {
  const user = useAuth.getState().user;
  if (!user) return;
  const { auth, purchases } = getServices();
  await auth.deleteAccount();
  await runHooks(deleteHooks, user.id);
  entitlementRepo.remove(user.id);
  await purchases.logOut();
  adoptUser(null);
}

export async function manageSubscriptionsUrl(): Promise<string> {
  return getServices().purchases.manageSubscriptionsUrl();
}
