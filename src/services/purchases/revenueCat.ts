import { Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import type { CustomerInfoLike } from '../../domain/entitlement/machine';
import type { StorePlan, TrialEligibility } from '../../domain/entitlement/paywall';
import { env } from '../config';
import { plansFromOffering, type OfferingLike } from './mapping';
import {
  STORE_SUBSCRIPTION_URLS,
  type PurchaseResult,
  type PurchasesService,
  type StorePlans,
} from './types';

/**
 * Adapter ของ RevenueCat จริง (ใช้เมื่อมีคีย์ใน .env)
 * configure แบบนิรนาม (ไม่ส่ง appUserID) และไม่เรียก logIn/logOut เลย (D81)
 * SDK จำ app user id ไว้ในเครื่องเอง — เครื่องเดิมที่เคยผูก id ไว้ก่อนอัปเดตยังใช้ id เดิมต่อ
 */
export class RevenueCatPurchasesService implements PurchasesService {
  private configured = false;
  private packages = new Map<string, PurchasesPackage>();

  async configure(): Promise<void> {
    if (this.configured) return;
    const apiKey = Platform.OS === 'ios' ? env.rcIosKey : env.rcAndroidKey;
    if (!apiKey) throw new Error('RevenueCat API key missing');
    Purchases.configure({ apiKey });
    this.configured = true;
  }

  async getCustomerInfo(): Promise<CustomerInfoLike> {
    await this.configure();
    return Purchases.getCustomerInfo();
  }

  async getPlans(): Promise<StorePlans> {
    await this.configure();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    this.packages.clear();
    current?.availablePackages.forEach((p) => this.packages.set(p.identifier, p));
    return plansFromOffering(current as unknown as OfferingLike | null);
  }

  async checkTrialEligibility(plan: StorePlan): Promise<TrialEligibility> {
    if (plan.kind !== 'monthly' || !plan.trialDays) return 'ineligible';
    // Google Play ส่ง free trial offer มาให้เฉพาะผู้ที่มีสิทธิ์อยู่แล้ว (trialDays มาจาก defaultOption.freePhase)
    if (Platform.OS !== 'ios') return 'eligible';
    try {
      const result = await Purchases.checkTrialOrIntroductoryPriceEligibility([plan.productId]);
      const status = result[plan.productId]?.status;
      if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return 'eligible';
      if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) return 'ineligible';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async purchase(plan: StorePlan): Promise<PurchaseResult> {
    await this.configure();
    const pkg = this.packages.get(plan.packageId);
    if (!pkg) return { status: 'error', code: 'store' };
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return { status: 'success', info: customerInfo };
    } catch (e) {
      const err = e as { userCancelled?: boolean; code?: string };
      if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)
        return { status: 'cancelled' };
      if (err.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) return { status: 'error', code: 'network' };
      if (err.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR)
        return { status: 'error', code: 'not_allowed' };
      if (err.code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) return { status: 'error', code: 'store' };
      return { status: 'error', code: 'unknown' };
    }
  }

  async restore(): Promise<CustomerInfoLike> {
    await this.configure();
    return Purchases.restorePurchases();
  }

  onCustomerInfo(listener: (info: CustomerInfoLike) => void): () => void {
    const wrapped = (info: CustomerInfo) => listener(info);
    Purchases.addCustomerInfoUpdateListener(wrapped);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(wrapped);
    };
  }

  async manageSubscriptionsUrl(): Promise<string> {
    try {
      const info = await Purchases.getCustomerInfo();
      if (info.managementURL) return info.managementURL;
    } catch {
      // ใช้ลิงก์มาตรฐานของสโตร์แทน
    }
    return Platform.OS === 'ios' ? STORE_SUBSCRIPTION_URLS.ios : STORE_SUBSCRIPTION_URLS.android;
  }
}
