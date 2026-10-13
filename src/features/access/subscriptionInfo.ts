import type { TFunction } from 'i18next';
import { Platform } from 'react-native';
import type { CachedEntitlement } from '../../db/repos/entitlementRepo';
import { formatDateLong, formatDateShort } from '../../i18n/format';
import { now } from '../../utils/clock';

export interface SubscriptionInfo {
  /** ชื่อสถานะ เช่น "ทดลองใช้ฟรี" */
  status: string;
  /** รายละเอียดวันที่ (SPEC B7) เช่น "ช่วงทดลองสิ้นสุด 16 ต.ค. 2569" */
  detail: string | null;
  /** ป้ายเล็กๆ บนหน้าแรก (null = ไม่ต้องแสดง) */
  badge: string | null;
  /** สิ่งที่ผู้ใช้ควรทำต่อในสโตร์ (null = ไม่มี) เช่น ยกเลิกรายเดือนที่ซ้อนกับซื้อขาด (SPEC J5) */
  notice: string | null;
}

/**
 * ข้อความสถานะสมาชิกและวันสิ้นสุดทดลอง/วันต่ออายุจาก expirationDate ของสโตร์ (SPEC B7)
 * ใช้ร่วมกันทั้งหน้าตั้งค่า/บัญชี และป้ายบนหน้าแรก
 */
export function describeSubscription(
  entitlement: CachedEntitlement | null,
  t: TFunction,
  os: string = Platform.OS,
): SubscriptionInfo {
  const state = entitlement?.state ?? 'NO_ENTITLEMENT';
  const status = t(`account.status.${state}`);
  const expiresAt = entitlement?.expirationDate ? new Date(entitlement.expirationDate) : null;
  const longDate = expiresAt ? formatDateLong(expiresAt) : '';
  const shortDate = expiresAt ? formatDateShort(expiresAt, new Date(now())) : '';
  const base = { status, detail: null, badge: null, notice: null };
  switch (state) {
    case 'TRIALING':
      return {
        ...base,
        detail: expiresAt
          ? t(entitlement?.willRenew ? 'account.dates.trialEndsThenRenews' : 'account.dates.trialEnds', {
              date: longDate,
            })
          : null,
        badge: expiresAt ? t('account.badge.trial', { date: shortDate }) : null,
      };
    case 'SUBSCRIBED_MONTHLY':
      return {
        ...base,
        detail: expiresAt
          ? t(entitlement?.willRenew ? 'account.dates.renews' : 'account.dates.endsOn', { date: longDate })
          : null,
        badge: expiresAt
          ? t(entitlement?.willRenew ? 'account.badge.renews' : 'account.badge.ending', { date: shortDate })
          : null,
      };
    case 'BILLING_GRACE':
      return {
        ...base,
        detail: expiresAt ? t('account.dates.billing', { date: longDate }) : null,
        badge: t('account.badge.billing'),
      };
    case 'LIFETIME':
      return {
        ...base,
        detail: t('account.dates.lifetime'),
        notice: entitlement?.alsoRenewingMonthly
          ? t('account.notice.monthlyStillActive', {
              store: os === 'ios' ? t('paywall.store.ios') : t('paywall.store.android'),
            })
          : null,
      };
    case 'EXPIRED':
      return { ...base, detail: expiresAt ? t('account.dates.expiredOn', { date: longDate }) : null };
    default:
      return base;
  }
}
