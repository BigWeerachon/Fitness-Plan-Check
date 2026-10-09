import { describe, expect, it, jest } from '@jest/globals';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { useSettings } from '@/stores/settings';
import { freshEnv } from '../helpers/env';

jest.setTimeout(30_000);

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('app shell + access gate', () => {
  it('first launch goes to onboarding (C)', async () => {
    freshEnv('new');
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Make it yours')).toBeTruthy();
  });

  it('after onboarding, a user without entitlement lands on the paywall (B3/B4)', async () => {
    freshEnv('new');
    useSettings.getState().set('onboardingDone', true);
    renderRouter('./src/app', { initialUrl: '/' });
    await flush();
    expect(await screen.findByText('Fitnese Pro')).toBeTruthy();
    expect(screen.getByTestId('glow-background')).toBeTruthy();
  });
});
