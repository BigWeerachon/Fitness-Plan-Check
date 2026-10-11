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
  c: CachedEntitlement | null,
  t: TFunction,
  os: string = Platform.OS,
): SubscriptionInfo {
  const state = c?.state ?? 'NO_ENTITLEMENT';
  const status = t(`account.status.${state}`);
  const exp = c?.expirationDate ? new Date(c.expirationDate) : null;
  const long = exp ? formatDateLong(exp) : '';
  const short = exp ? formatDateShort(exp, new Date(now())) : '';
  const base = { status, detail: null, badge: null, notice: null };
  switch (state) {
    case 'TRIALING':
      return {
        ...base,
        detail: exp
          ? t(c?.willRenew ? 'account.dates.trialEndsThenRenews' : 'account.dates.trialEnds', { date: long })
          : null,
        badge: exp ? t('account.badge.trial', { date: short }) : null,
      };
    case 'SUBSCRIBED_MONTHLY':
      return {
        ...base,
        detail: exp
          ? t(c?.willRenew ? 'account.dates.renews' : 'account.dates.endsOn', { date: long })
          : null,
        badge: exp
          ? t(c?.willRenew ? 'account.badge.renews' : 'account.badge.ending', { date: short })
          : null,
      };
    case 'BILLING_GRACE':
      return {
        ...base,
        detail: exp ? t('account.dates.billing', { date: long }) : null,
        badge: t('account.badge.billing'),
      };
    case 'LIFETIME':
      return {
        ...base,
        detail: t('account.dates.lifetime'),
        notice: c?.alsoRenewingMonthly
          ? t('account.notice.monthlyStillActive', {
              store: os === 'ios' ? t('paywall.store.ios') : t('paywall.store.android'),
            })
          : null,
      };
    case 'EXPIRED':
      return { ...base, detail: exp ? t('account.dates.expiredOn', { date: long }) : null };
    default:
      return base;
  }
}
