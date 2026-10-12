import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Alert, Linking, StyleSheet } from 'react-native';
import { entitlementRepo } from '@/db/repos/entitlementRepo';
import { setOwner } from '@/db/owner';
import { deriveSnapshot } from '@/domain/entitlement/machine';
import type { MockScenario } from '@/services/purchases/mockPurchases';
import { useAuth } from '@/stores/auth';
import { useEntitlement } from '@/stores/entitlement';
import { useSettings } from '@/stores/settings';
import { now } from '@/utils/clock';
import { freshEnv } from '../helpers/env';

jest.setTimeout(60_000);
afterEach(() => {
  jest.restoreAllMocks();
});

const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

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

/** บัญชีที่ล็อกอินค้างไว้และ RevenueCat ผูกแล้ว ด้วยสถานะจากสโตร์จำลองตาม scenario */
async function signedIn(scenario: MockScenario) {
  const s = freshEnv(scenario);
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'en');
  const user = await s.auth.signIn('google');
  const info = await s.purchases.logIn(user.id);
  setOwner(user.id);
  entitlementRepo.save(user.id, deriveSnapshot(info, now()));
  useAuth.setState({ user, status: 'signedIn' });
  useEntitlement.setState({
    cached: { ...entitlementRepo.get(user.id)! },
    fresh: true,
    checking: false,
    online: true,
  });
  return s;
}

const fontSize = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as never) as { fontSize?: number }).fontSize ?? 0;

describe('paywall → login → purchase (SPEC B4–B6, J2)', () => {
  it('shows the store price, trial offer and every required disclosure', async () => {
    boot('new');
    await flush();
    // หัวข้อเน้นฟีเจอร์ — คำว่า "ฟรี" ไม่เด่นกว่ายอดที่ถูกเรียกเก็บ (App Review 3.1.2)
    expect(await screen.findByText('Unlock your full training plan')).toBeTruthy();
    expect(screen.queryByText(/Try everything free/)).toBeNull();
    expect(screen.getByText('All features, on all your devices.')).toBeTruthy();
    expect(screen.getByText('7-day free trial')).toBeTruthy();
    const billed = await screen.findByTestId('paywall-billed');
    expect(billed.props.children).toBe('7 days free, then ฿19.00/month');
    expect(fontSize(billed)).toBeGreaterThanOrEqual(fontSize(screen.getByText('7-day free trial')));
    expect(screen.getByTestId('paywall-cta').props.accessibilityLabel).toBe(
      'Start free trial, then ฿19.00/month',
    );
    expect(screen.queryByTestId('paywall-fix-payment')).toBeNull();
    // ราคาเต็มจากสโตร์ (ไม่ตัดทอน) + รอบการชำระ และอ่านรวมกันสำหรับโปรแกรมอ่านหน้าจอ
    expect(within(screen.getByTestId('plan-monthly')).getByText('฿19.00')).toBeTruthy();
    expect(within(screen.getByTestId('plan-monthly')).getByText('per month')).toBeTruthy();
    expect(within(screen.getByTestId('plan-lifetime')).getByText('฿99.00')).toBeTruthy();
    expect(within(screen.getByTestId('plan-lifetime')).getByText('one-time payment')).toBeTruthy();
    expect(screen.getByTestId('plan-monthly').props.accessibilityLabel).toContain('฿19.00 / month');
    expect(screen.getByTestId('plan-lifetime').props.accessibilityLabel).toContain('฿99.00 one-time');
    expect(screen.getByText('Free for 7 days, then ฿19.00 per month.')).toBeTruthy();
    expect(
      screen.getByText('The subscription renews automatically each month until you cancel.'),
    ).toBeTruthy();
    expect(
      screen.getByText(/cancel at least 24 hours before the trial ends in your App Store account settings/),
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
    expect(screen.getByTestId('paywall-billed').props.children).toBe('฿99.00 one-time payment');
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
    expect(
      screen.queryByText(/7-day free trial|Free for 7 days|days free|Start free trial|Start 7-day/i),
    ).toBeNull();
    expect(screen.getByTestId('paywall-billed').props.children).toBe('฿19.00/month, renews automatically');
    expect(screen.getByText('฿19.00 per month. No free trial.')).toBeTruthy();
    expect(s.purchases.purchaseCalls).toHaveLength(0);
  });

  it('says the user was not charged when a purchase fails offline (N8)', async () => {
    const s = await signedIn('new');
    renderRouter('./src/app', { initialUrl: '/' });
    await flush();
    expect(await screen.findByText('Start free trial, then ฿19.00/month')).toBeTruthy();
    s.purchases.failNextPurchase = { status: 'error', code: 'network' };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(screen.getByTestId('paywall-cta'));
    await flush(12);
    expect(alert).toHaveBeenCalledWith(
      'Something went wrong',
      'No internet connection. You were not charged — please try again when you’re online.',
    );
    expect(alert).not.toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/will sync later/));
  });

  it('does not open a second purchase when linking the account restores access (J3)', async () => {
    const s = freshEnv('monthly');
    useSettings.getState().set('onboardingDone', true);
    useSettings.getState().set('language', 'en');
    // ล็อกอินค้างไว้ แต่ตอนเปิดแอปผูก RevenueCat ไม่สำเร็จ → ยังไม่รู้ว่าบัญชีนี้สมัครรายเดือนไว้แล้ว
    await s.auth.signIn('google');
    jest.spyOn(s.purchases, 'logIn').mockRejectedValueOnce(new Error('network'));
    renderRouter('./src/app', { initialUrl: '/' });
    await flush();
    expect(await screen.findByText('Subscribe for ฿19.00 / month')).toBeTruthy();
    fireEvent.press(screen.getByTestId('paywall-cta'));
    await flush(12);
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    expect(useEntitlement.getState().cached?.state).toBe('SUBSCRIBED_MONTHLY');
    expect(await screen.findByTestId('today')).toBeTruthy();
  });

  it('asks a user whose payment failed to fix it in the store instead of subscribing again (J5)', async () => {
    const s = await signedIn('billing_retry');
    expect(useEntitlement.getState().cached).toMatchObject({
      state: 'EXPIRED',
      billingIssueAt: expect.any(Number),
    });
    renderRouter('./src/app', { initialUrl: '/' });
    await flush();
    expect(await screen.findByText('There’s a problem with your payment')).toBeTruthy();
    expect(screen.getByText(/Update your payment method in your App Store account/)).toBeTruthy();
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(screen.getByTestId('paywall-fix-payment'));
    await flush();
    expect(openURL).toHaveBeenCalledWith(MANAGE_URL);
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    // ยังซื้อแพ็กเกจได้ แต่ไม่ใช่ปุ่มหลัก
    expect(await screen.findByTestId('plan-lifetime')).toBeTruthy();
  });

  it('welcomes back a user whose subscription simply ended', async () => {
    await signedIn('expired');
    renderRouter('./src/app', { initialUrl: '/' });
    await flush();
    expect(await screen.findByText('Welcome back — pick up where you left off')).toBeTruthy();
    expect(screen.queryByTestId('paywall-fix-payment')).toBeNull();
  });

  it('shows an error instead of an unhandled rejection when the store link cannot open (K)', async () => {
    boot('new');
    await flush();
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(await screen.findByTestId('paywall-manage'));
    await flush();
    expect(alert).toHaveBeenCalledWith(
      'Something went wrong',
      'The store is not available right now. Please try again later.',
    );
  });

  it('keeps account, restore, legal and references reachable without a plan (B3)', async () => {
    boot('new');
    await flush();
    fireEvent.press(await screen.findByLabelText('Account & settings'));
    expect(await screen.findByText('Restore purchases')).toBeTruthy();
    expect(screen.getByText('Delete account and data')).toBeTruthy();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(screen.getByTestId('account-manage'));
    await flush();
    expect(openURL).toHaveBeenCalledWith(MANAGE_URL);
    fireEvent.press(screen.getByText('References'));
    expect(await screen.findByText(/Mifflin MD/)).toBeTruthy();
    expect(screen.getByText(/ISSN|International Society of Sports Nutrition/)).toBeTruthy();
    expect(screen.getByText(/Compendium of Physical Activities/)).toBeTruthy();
  });
});

describe('lifetime upgrade from settings (SPEC J5)', () => {
  it('lets a monthly subscriber buy lifetime, warning that the subscription is not cancelled', async () => {
    const s = await signedIn('monthly');
    renderRouter('./src/app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-lifetime'));
    expect(await screen.findByText('Get Fitnese Pro with one payment')).toBeTruthy();
    // มีสิทธิ์อยู่แล้วแต่ไม่ถูกพากลับหน้าแรก และเห็นเฉพาะซื้อขาดในราคาจากสโตร์
    expect(await screen.findByTestId('plan-lifetime')).toBeTruthy();
    expect(screen.queryByTestId('plan-monthly')).toBeNull();
    expect(screen.queryByText(/free trial, then|days free/i)).toBeNull();
    expect(screen.getByTestId('paywall-billed').props.children).toBe('฿99.00 one-time payment');
    expect(screen.getByTestId('paywall-upgrade-notice').props.children).toBe(
      'Buying lifetime does not cancel your monthly subscription or free trial. Cancel it yourself in your App Store account settings so you aren’t charged for it.',
    );
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(screen.getByTestId('paywall-upgrade-manage'));
    await flush();
    expect(openURL).toHaveBeenCalledWith(MANAGE_URL);

    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    expect(screen.getByTestId('paywall-cta').props.accessibilityLabel).toBe('Buy lifetime for ฿99.00');
    fireEvent.press(screen.getByTestId('paywall-cta'));
    await flush(12);
    expect(s.purchases.purchaseCalls).toEqual([{ plan: 'lifetime', appUserId: expect.any(String) }]);
    expect(alert).toHaveBeenCalledWith('You’re all set! Enjoy Fitnese Pro.');
    expect(useEntitlement.getState().cached?.state).toBe('LIFETIME');
    expect(await screen.findByTestId('today')).toBeTruthy();
  });

  it.each(['trialing', 'billing_grace'] as const)('offers the upgrade to %s users too', async (scenario) => {
    await signedIn(scenario);
    renderRouter('./src/app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('settings-lifetime')).toBeTruthy();
  });

  it('does not offer the upgrade to lifetime owners', async () => {
    await signedIn('lifetime');
    renderRouter('./src/app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('settings')).toBeTruthy();
    expect(screen.queryByTestId('settings-lifetime')).toBeNull();
  });

  it('sends lifetime owners home even through a direct upgrade link', async () => {
    const s = await signedIn('lifetime');
    renderRouter('./src/app', { initialUrl: '/paywall?upgrade=lifetime' });
    await flush();
    expect(await screen.findByTestId('today')).toBeTruthy();
    expect(screen.queryByTestId('paywall')).toBeNull();
    expect(s.purchases.purchaseCalls).toHaveLength(0);
  });
});
