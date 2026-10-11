import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { CachedEntitlement } from '@/db/repos/entitlementRepo';
import { EMPTY_SNAPSHOT, type EntitlementState } from '@/domain/entitlement/machine';
import { describeSubscription, type SubscriptionInfo } from '@/features/access/subscriptionInfo';
import { setLanguage, t, type Language } from '@/i18n';
import { setClockForTests } from '@/utils/clock';

// วันนี้ = ศุกร์ 9 ต.ค. 2026 (เวลาท้องถิ่น)
const NOW = new Date('2026-10-09T09:00:00').getTime();
const OCT_14 = new Date('2026-10-14T09:00:00').getTime();
const OCT_7 = new Date('2026-10-07T09:00:00').getTime();
const JAN_1 = new Date('2027-01-01T09:00:00').getTime();

function cached(state: EntitlementState, extra: Partial<CachedEntitlement> = {}): CachedEntitlement {
  return {
    ...EMPTY_SNAPSHOT,
    state,
    productId: state === 'LIFETIME' ? 'fitnese_lifetime' : 'fitnese_monthly',
    expirationDate: state === 'LIFETIME' ? null : OCT_14,
    verifiedAt: NOW,
    userId: 'u1',
    ...extra,
  };
}

type Row = [string, CachedEntitlement | null, Record<Language, SubscriptionInfo>];

const none = (status: Record<Language, string>): Record<Language, SubscriptionInfo> => ({
  en: { status: status.en, detail: null, badge: null, notice: null },
  th: { status: status.th, detail: null, badge: null, notice: null },
});

const table: Row[] = [
  [
    'TRIALING that will renew',
    cached('TRIALING', { willRenew: true, periodType: 'TRIAL' }),
    {
      en: {
        status: 'Free trial',
        detail: 'Trial ends Oct 14, 2026, then renews monthly',
        badge: 'Trial ends Wed, Oct 14',
        notice: null,
      },
      th: {
        status: 'ทดลองใช้ฟรี',
        detail: 'ช่วงทดลองสิ้นสุด 14 ต.ค. 2569 จากนั้นต่ออายุรายเดือน',
        badge: 'ทดลองถึง พ. 14 ต.ค.',
        notice: null,
      },
    },
  ],
  [
    'TRIALING cancelled during the trial (J5)',
    cached('TRIALING', { willRenew: false, periodType: 'TRIAL' }),
    {
      en: {
        status: 'Free trial',
        detail: 'Trial ends Oct 14, 2026',
        badge: 'Trial ends Wed, Oct 14',
        notice: null,
      },
      th: {
        status: 'ทดลองใช้ฟรี',
        detail: 'ช่วงทดลองสิ้นสุด 14 ต.ค. 2569',
        badge: 'ทดลองถึง พ. 14 ต.ค.',
        notice: null,
      },
    },
  ],
  [
    'SUBSCRIBED_MONTHLY renewing',
    cached('SUBSCRIBED_MONTHLY', { willRenew: true }),
    {
      en: { status: 'Monthly', detail: 'Renews Oct 14, 2026', badge: 'Renews Wed, Oct 14', notice: null },
      th: { status: 'รายเดือน', detail: 'ต่ออายุ 14 ต.ค. 2569', badge: 'ต่ออายุ พ. 14 ต.ค.', notice: null },
    },
  ],
  [
    'SUBSCRIBED_MONTHLY renewing next year shows the year on the badge',
    cached('SUBSCRIBED_MONTHLY', { willRenew: true, expirationDate: JAN_1 }),
    {
      en: { status: 'Monthly', detail: 'Renews Jan 1, 2027', badge: 'Renews Fri, Jan 1, 2027', notice: null },
      th: {
        status: 'รายเดือน',
        detail: 'ต่ออายุ 1 ม.ค. 2570',
        badge: 'ต่ออายุ ศ. 1 ม.ค. 2570',
        notice: null,
      },
    },
  ],
  [
    'SUBSCRIBED_MONTHLY cancelled (ends at period end)',
    cached('SUBSCRIBED_MONTHLY', { willRenew: false }),
    {
      en: {
        status: 'Monthly',
        detail: 'Access until Oct 14, 2026',
        badge: 'Access until Wed, Oct 14',
        notice: null,
      },
      th: {
        status: 'รายเดือน',
        detail: 'ใช้ได้ถึง 14 ต.ค. 2569',
        badge: 'ใช้ได้ถึง พ. 14 ต.ค.',
        notice: null,
      },
    },
  ],
  [
    'BILLING_GRACE',
    cached('BILLING_GRACE', { willRenew: true, billingIssueAt: NOW - 86_400_000 }),
    {
      en: {
        status: 'Payment issue',
        detail: 'Update your payment by Oct 14, 2026 to keep access',
        badge: 'Payment issue',
        notice: null,
      },
      th: {
        status: 'มีปัญหาการชำระเงิน',
        detail: 'อัปเดตการชำระเงินภายใน 14 ต.ค. 2569 เพื่อใช้งานต่อ',
        badge: 'มีปัญหาการชำระเงิน',
        notice: null,
      },
    },
  ],
  [
    'EXPIRED',
    cached('EXPIRED', { expirationDate: OCT_7 }),
    {
      en: { status: 'Expired', detail: 'Ended Oct 7, 2026', badge: null, notice: null },
      th: { status: 'หมดอายุแล้ว', detail: 'สิ้นสุดเมื่อ 7 ต.ค. 2569', badge: null, notice: null },
    },
  ],
  [
    'LIFETIME',
    cached('LIFETIME'),
    {
      en: { status: 'Lifetime', detail: 'Unlocked forever', badge: null, notice: null },
      th: { status: 'ซื้อขาด', detail: 'ปลดล็อกถาวร', badge: null, notice: null },
    },
  ],
  [
    'LIFETIME while the monthly still renews (J5)',
    cached('LIFETIME', { alsoRenewingMonthly: true }),
    {
      en: {
        status: 'Lifetime',
        detail: 'Unlocked forever',
        badge: null,
        notice: 'Your monthly plan is still active — cancel it in App Store to avoid being charged',
      },
      th: {
        status: 'ซื้อขาด',
        detail: 'ปลดล็อกถาวร',
        badge: null,
        notice: 'แพ็กเกจรายเดือนของคุณยังใช้งานอยู่ — ยกเลิกใน App Store เพื่อไม่ให้ถูกเรียกเก็บเงิน',
      },
    },
  ],
  [
    'NO_ENTITLEMENT',
    cached('NO_ENTITLEMENT', { expirationDate: null }),
    none({ en: 'No active plan', th: 'ยังไม่มีแพ็กเกจ' }),
  ],
  ['signed out (no cache)', null, none({ en: 'No active plan', th: 'ยังไม่มีแพ็กเกจ' })],
];

describe('describeSubscription — membership text and home badge (SPEC B7, J5)', () => {
  beforeAll(() => setClockForTests(() => NOW));
  afterAll(() => {
    setClockForTests(null);
    setLanguage('en');
  });

  describe.each<Language>(['en', 'th'])('%s', (lng) => {
    beforeAll(() => setLanguage(lng));

    it.each(table)('%s', (_name, c, expected) => {
      expect(describeSubscription(c, t, 'ios')).toEqual(expected[lng]);
    });
  });

  it('names the store of the platform in the lifetime + monthly reminder', () => {
    setLanguage('en');
    const both = cached('LIFETIME', { alsoRenewingMonthly: true });
    expect(describeSubscription(both, t, 'android').notice).toBe(
      'Your monthly plan is still active — cancel it in Google Play to avoid being charged',
    );
    // ค่าที่ค้างจากสถานะอื่นไม่ทำให้ขึ้นคำเตือน
    expect(describeSubscription(cached('EXPIRED', { alsoRenewingMonthly: true }), t).notice).toBeNull();
  });
});
