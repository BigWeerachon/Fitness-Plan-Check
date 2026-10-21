import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { env } from '@/services/config';
import { useEntitlement } from '@/stores/entitlement';
import { useSettings } from '@/stores/settings';
import { freshEnv } from '../helpers/env';

jest.setTimeout(60_000);
const ORIGINAL = env.tryoutBuild;
afterEach(() => {
  env.tryoutBuild = ORIGINAL;
  jest.restoreAllMocks();
});

async function flush(times = 12) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function boot(url: string, scenario: Parameters<typeof freshEnv>[0]) {
  const purchases = freshEnv(scenario).purchases;
  useSettings.getState().set('onboardingDone', true);
  useSettings.getState().set('language', 'en');
  const view = renderRouter('./src/app', { initialUrl: url });
  return { purchases, view };
}

describe('tryout build: banner on the pages a tester sees (D85)', () => {
  it('shows on the paywall when the flag is on', async () => {
    env.tryoutBuild = true;
    boot('/', 'new');
    expect(await screen.findByTestId('paywall')).toBeTruthy();
    expect(screen.getByTestId('tryout-banner')).toBeTruthy();
    expect(screen.getByText('Purchases are simulated. Not the store version.')).toBeTruthy();
  });

  it('shows on the account page (reachable without access)', async () => {
    env.tryoutBuild = true;
    boot('/account', 'new');
    expect(await screen.findByTestId('account')).toBeTruthy();
    expect(screen.getByTestId('tryout-banner')).toBeTruthy();
  });

  it('shows on settings for an entitled tester', async () => {
    env.tryoutBuild = true;
    boot('/settings', 'monthly');
    expect(await screen.findByTestId('settings')).toBeTruthy();
    expect(screen.getByTestId('tryout-banner')).toBeTruthy();
  });

  it('is absent from paywall, account and settings when the flag is off', async () => {
    env.tryoutBuild = false;
    const paywall = boot('/', 'new');
    expect(await screen.findByTestId('paywall')).toBeTruthy();
    expect(screen.queryByTestId('tryout-banner')).toBeNull();
    paywall.view.unmount();
    const account = boot('/account', 'new');
    expect(await screen.findByTestId('account')).toBeTruthy();
    expect(screen.queryByTestId('tryout-banner')).toBeNull();
    account.view.unmount();
    boot('/settings', 'monthly');
    expect(await screen.findByTestId('settings')).toBeTruthy();
    expect(screen.queryByTestId('tryout-banner')).toBeNull();
  });
});

describe('tryout build: the simulated store lets a tester try the whole app', () => {
  it('starts the free trial from the paywall and enters the app', async () => {
    env.tryoutBuild = true;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { purchases: s } = boot('/', 'new');
    fireEvent.press(await screen.findByTestId('paywall-cta'));
    await flush();
    expect(s.purchaseCalls).toEqual([{ plan: 'monthly' }]);
    expect(alert).toHaveBeenCalled();
    expect(useEntitlement.getState().cached?.state).toBe('TRIALING');
    expect(await screen.findByTestId('today')).toBeTruthy();
  });

  it('can also buy lifetime, and restore is reachable and answers from the simulated store', async () => {
    env.tryoutBuild = true;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { purchases: s } = boot('/', 'new');
    fireEvent.press(await screen.findByTestId('paywall-restore'));
    await flush();
    expect(s.restoreCalls).toBe(1);
    expect(alert).toHaveBeenCalledTimes(1);
    fireEvent.press(await screen.findByTestId('plan-lifetime'));
    fireEvent.press(screen.getByTestId('paywall-cta'));
    await flush();
    expect(s.purchaseCalls).toEqual([{ plan: 'lifetime' }]);
    expect(useEntitlement.getState().cached?.state).toBe('LIFETIME');
  });
});

describe('registry picks the simulated store only for the tryout build in a release bundle', () => {
  const loadRegistry = (tryout: string | undefined) => {
    const prevDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    const prevFlag = process.env.EXPO_PUBLIC_TRYOUT_BUILD;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    if (tryout === undefined) delete process.env.EXPO_PUBLIC_TRYOUT_BUILD;
    else process.env.EXPO_PUBLIC_TRYOUT_BUILD = tryout;
    try {
      let mod: typeof import('@/services/registry') | undefined;
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- ต้องโหลดใหม่ภายใน isolateModules
        mod = require('@/services/registry') as typeof import('@/services/registry');
      });
      return mod!;
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = prevDev;
      if (prevFlag === undefined) delete process.env.EXPO_PUBLIC_TRYOUT_BUILD;
      else process.env.EXPO_PUBLIC_TRYOUT_BUILD = prevFlag;
    }
  };

  it('release + tryout flag → mock mode', () => {
    expect(loadRegistry('1').getServices().mode).toBe('mock');
  });
});
