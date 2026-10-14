import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { bootstrapEntitlement, purchasePlan, refreshEntitlement } from '@/features/access/accountFlow';
import { getOwner } from '@/db/owner';
import type { MockScenario } from '@/services/purchases/mockPurchases';
import { useEntitlement } from '@/stores/entitlement';
import { useSettings } from '@/stores/settings';
import { setClockForTests } from '@/utils/clock';
import { freshEnv, type TestServices } from '../helpers/env';
import { flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

/** เครื่องที่บัญชีสโตร์จำลองมีสถานะตาม scenario (ตรวจกับสโตร์แล้ว) — วันนี้ = ศุกร์ 9 ต.ค. 2026 */
async function withStore(scenario: MockScenario): Promise<TestServices> {
  const s = freshEnv(scenario);
  const t0 = new Date('2026-10-09T09:00:00').getTime();
  setClockForTests(() => t0);
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'en');
  await bootstrapEntitlement();
  return s;
}

describe('membership dates and reminders (SPEC B7, J5)', () => {
  it('the "trialing" store scenario shows the trial end on Today and in Settings', async () => {
    await withStore('trialing');
    expect(useEntitlement.getState().cached).toMatchObject({ state: 'TRIALING', willRenew: true });

    const r = renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('today')).toBeTruthy();
    // ทดลอง 5 วันจากสโตร์ → สิ้นสุดพุธ 14 ต.ค.
    expect(await screen.findByText('Trial ends Wed, Oct 14')).toBeTruthy();
    r.unmount();

    renderRouter('./src/app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('settings')).toBeTruthy();
    const membership = screen.getByTestId('settings-membership');
    expect(within(membership).getByText('Free trial')).toBeTruthy();
    expect(within(membership).getByText('Trial ends Oct 14, 2026, then renews monthly')).toBeTruthy();
    expect(screen.queryByTestId('settings-monthly-notice')).toBeNull();
  });

  it('a renewing monthly subscriber sees a small renewal badge on Today', async () => {
    await withStore('monthly');
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('today')).toBeTruthy();
    expect(await screen.findByText('Renews Thu, Oct 29')).toBeTruthy();
  });

  it('after buying lifetime, Settings reminds the user to cancel the monthly that still renews', async () => {
    const s = await withStore('monthly');
    expect((await purchasePlan(s.purchases.lifetimePlan)).status).toBe('success');
    expect(entitlementRepo.get(getOwner())).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: true });

    // หน้าบัญชี (เข้าได้เสมอ) แสดงคำเตือนเดียวกัน
    const account = renderRouter('./src/app', { initialUrl: '/account' });
    expect(await screen.findByTestId('account-monthly-notice')).toBeTruthy();
    account.unmount();

    renderRouter('./src/app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('settings')).toBeTruthy();
    expect(within(screen.getByTestId('settings-membership')).getByText('Lifetime')).toBeTruthy();
    const notice = screen.getByTestId('settings-monthly-notice');
    expect(
      within(notice).getByText(
        'Your monthly plan is still active — cancel it in App Store to avoid being charged',
      ),
    ).toBeTruthy();
    // แตะแล้วไปหน้าจัดการสมาชิกของสโตร์
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(notice);
    await flush();
    expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');

    // ยกเลิกรายเดือนในสโตร์แล้ว → คำเตือนหายไป
    await act(async () => {
      s.purchases.simulateCancel();
      await refreshEntitlement();
    });
    await flush();
    expect(entitlementRepo.get(getOwner())).toMatchObject({ state: 'LIFETIME', alsoRenewingMonthly: false });
    expect(screen.queryByTestId('settings-monthly-notice')).toBeNull();
  });
});
