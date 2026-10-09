import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { useSettings } from '@/stores/settings';
import { freshEnv } from '../helpers/env';

jest.setTimeout(60_000);

async function flush(times = 8) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function boot(scenario: Parameters<typeof freshEnv>[0] = 'new') {
  const s = freshEnv(scenario);
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'en');
  renderRouter('./src/app', { initialUrl: '/' });
  return s;
}

describe('paywall → login → purchase (SPEC B4–B6, J2)', () => {
  it('shows the store price, trial offer and every required disclosure', async () => {
    boot('new');
    await flush();
    expect(await screen.findByText('Try everything free for 7 days')).toBeTruthy();
    expect(screen.getByText('Then ฿19.00 per month. Cancel anytime.')).toBeTruthy();
    expect(screen.getByText('7-day free trial')).toBeTruthy();
    expect(screen.getByText('฿19.00 / month')).toBeTruthy();
    expect(screen.getByText('฿99.00 one-time')).toBeTruthy();
    expect(screen.getByText('Free for 7 days, then ฿19.00 per month.')).toBeTruthy();
    expect(
      screen.getByText('The subscription renews automatically each month until you cancel.'),
    ).toBeTruthy();
    expect(
      screen.getByText(/Cancel anytime before the trial ends in your App Store account settings/),
    ).toBeTruthy();
    expect(
      screen.getByText('Lifetime is a one-time purchase and does not include a free trial.'),
    ).toBeTruthy();
    expect(screen.getByText('Restore purchases')).toBeTruthy();
    expect(screen.getByText('Manage or cancel subscription')).toBeTruthy();
    expect(screen.getByText('Terms of Use')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('requires sign-in before the purchase, returns with the chosen plan, then unlocks the app', async () => {
    const s = boot('new');
    await flush();
    fireEvent.press(await screen.findByTestId('plan-lifetime'));
    fireEvent.press(screen.getByText('Buy lifetime for ฿99.00'));
    await flush();
    // ยังไม่ล็อกอิน → ไปหน้าล็อกอิน ไม่มีการเรียกซื้อ
    expect(await screen.findByText('Continue with Google')).toBeTruthy();
    expect(screen.getByLabelText('Sign in with Apple')).toBeTruthy();
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    fireEvent.press(screen.getByTestId('signin-google'));
    await flush(12);
    // กลับ Paywall พร้อมแพ็กเกจที่เลือกไว้ (ซื้อขาด)
    expect(await screen.findByText('Buy lifetime for ฿99.00')).toBeTruthy();
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(screen.getByTestId('paywall-cta'));
    await flush(12);
    expect(s.purchases.purchaseCalls).toEqual([{ plan: 'lifetime', appUserId: expect.any(String) }]);
    expect(alert).toHaveBeenCalledWith('You’re all set! Enjoy Fitnese Pro.');
    alert.mockRestore();
  });

  it('never advertises the free trial to users who already used it (B6)', async () => {
    const s = boot('trial_used');
    await flush();
    fireEvent.press(await screen.findByTestId('paywall-cta'));
    await flush();
    fireEvent.press(await screen.findByTestId('signin-apple'));
    await flush(12);
    expect(await screen.findByText('Subscribe for ฿19.00 / month')).toBeTruthy();
    expect(screen.queryByText(/7-day free trial|Free for 7 days|Start 7-day/i)).toBeNull();
    expect(screen.queryByText('Try everything free for 7 days')).toBeNull();
    expect(screen.getByText('฿19.00 per month. No free trial.')).toBeTruthy();
    expect(s.purchases.purchaseCalls).toHaveLength(0);
  });

  it('keeps account, restore, legal and references reachable without a plan (B3)', async () => {
    boot('new');
    await flush();
    fireEvent.press(await screen.findByLabelText('Account & settings'));
    expect(await screen.findByText('Restore purchases')).toBeTruthy();
    expect(screen.getByText('Delete account and data')).toBeTruthy();
    fireEvent.press(screen.getByText('References'));
    expect(await screen.findByText(/Mifflin MD/)).toBeTruthy();
    expect(screen.getByText(/ISSN|International Society of Sports Nutrition/)).toBeTruthy();
    expect(screen.getByText(/Compendium of Physical Activities/)).toBeTruthy();
  });
});
