import type { TFunction } from 'i18next';
import type { CachedEntitlement } from '../../db/repos/entitlementRepo';
import { formatDateLong, formatDateShort } from '../../i18n/format';

export interface SubscriptionInfo {
  /** ชื่อสถานะ เช่น "ทดลองใช้ฟรี" */
  status: string;
  /** รายละเอียดวันที่ (SPEC B7) เช่น "ช่วงทดลองสิ้นสุด 16 ต.ค. 2569" */
  detail: string | null;
  /** ป้ายเล็กๆ บนหน้าแรก (null = ไม่ต้องแสดง) */
  badge: string | null;
}

/**
 * ข้อความสถานะสมาชิกและวันสิ้นสุดทดลอง/วันต่ออายุจาก expirationDate ของสโตร์ (SPEC B7)
 * ใช้ร่วมกันทั้งหน้าตั้งค่า/บัญชี และป้ายบนหน้าแรก
 */
export function describeSubscription(c: CachedEntitlement | null, t: TFunction): SubscriptionInfo {
  const state = c?.state ?? 'NO_ENTITLEMENT';
  const status = t(`account.status.${state}`);
  const exp = c?.expirationDate ? new Date(c.expirationDate) : null;
  const long = exp ? formatDateLong(exp) : '';
  const short = exp ? formatDateShort(exp) : '';
  switch (state) {
    case 'TRIALING':
      return {
        status,
        detail: exp
          ? t(c?.willRenew ? 'account.dates.trialEndsThenRenews' : 'account.dates.trialEnds', { date: long })
          : null,
        badge: exp ? t('account.badge.trial', { date: short }) : null,
      };
    case 'SUBSCRIBED_MONTHLY':
      return {
        status,
        detail: exp
          ? t(c?.willRenew ? 'account.dates.renews' : 'account.dates.endsOn', { date: long })
          : null,
        badge: exp && !c?.willRenew ? t('account.badge.ending', { date: short }) : null,
      };
    case 'BILLING_GRACE':
      return {
        status,
        detail: exp ? t('account.dates.billing', { date: long }) : null,
        badge: t('account.badge.billing'),
      };
    case 'LIFETIME':
      return { status, detail: t('account.dates.lifetime'), badge: null };
    case 'EXPIRED':
      return { status, detail: exp ? t('account.dates.expiredOn', { date: long }) : null, badge: null };
    default:
      return { status, detail: null, badge: null };
  }
}
