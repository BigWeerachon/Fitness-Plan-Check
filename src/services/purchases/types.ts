import type { CustomerInfoLike } from '../../domain/entitlement/machine';
import type { StorePlan, TrialEligibility } from '../../domain/entitlement/paywall';

export type PurchaseResult =
  | { status: 'success'; info: CustomerInfoLike }
  | { status: 'cancelled' }
  | { status: 'error'; code: 'network' | 'store' | 'not_allowed' | 'unknown' };

export interface StorePlans {
  monthly: StorePlan | null;
  lifetime: StorePlan | null;
}

/**
 * ห่อ RevenueCat (react-native-purchases) — สถานะสิทธิ์มาจากที่นี่เท่านั้น (SPEC B2)
 * ใช้ app user id นิรนามที่ RevenueCat สร้างเอง ไม่มีบัญชี/ล็อกอิน (D81): ซื้อได้ทันที
 * และกู้คืนการซื้อผ่านบัญชีสโตร์ (Apple ID / Google) เมื่อเปลี่ยนเครื่องหรือติดตั้งใหม่
 */
export interface PurchasesService {
  configure(): Promise<void>;
  getCustomerInfo(): Promise<CustomerInfoLike>;
  getPlans(): Promise<StorePlans>;
  checkTrialEligibility(plan: StorePlan): Promise<TrialEligibility>;
  purchase(plan: StorePlan): Promise<PurchaseResult>;
  restore(): Promise<CustomerInfoLike>;
  onCustomerInfo(listener: (info: CustomerInfoLike) => void): () => void;
  /** ลิงก์ตรงไปหน้าจัดการ/ยกเลิกสมาชิกของสโตร์ (SPEC B5, K) */
  manageSubscriptionsUrl(): Promise<string>;
}

export const STORE_SUBSCRIPTION_URLS = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
} as const;
