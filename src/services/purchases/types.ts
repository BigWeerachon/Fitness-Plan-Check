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
 * purchase() ต้องได้ authUserId ที่ตรงกับ app user id ที่ logIn แล้ว มิฉะนั้นโยน PurchaseRequiresLoginError (SPEC B4)
 */
export interface PurchasesService {
  configure(): Promise<void>;
  logIn(userId: string): Promise<CustomerInfoLike>;
  logOut(): Promise<void>;
  /** app user id ที่ logIn ไว้ (null = ผู้ใช้นิรนาม) */
  currentAppUserId(): string | null;
  getCustomerInfo(): Promise<CustomerInfoLike>;
  getPlans(): Promise<StorePlans>;
  checkTrialEligibility(plan: StorePlan): Promise<TrialEligibility>;
  purchase(plan: StorePlan, authUserId: string | null): Promise<PurchaseResult>;
  restore(): Promise<CustomerInfoLike>;
  onCustomerInfo(listener: (info: CustomerInfoLike) => void): () => void;
  /** ลิงก์ตรงไปหน้าจัดการ/ยกเลิกสมาชิกของสโตร์ (SPEC B5, K) */
  manageSubscriptionsUrl(): Promise<string>;
}

export const STORE_SUBSCRIPTION_URLS = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
} as const;
