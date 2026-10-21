import { afterEach, describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { TryoutBanner } from '@/features/access/TryoutBanner';
import { env } from '@/services/config';
import { useSettings } from '@/stores/settings';

const ORIGINAL = env.tryoutBuild;
afterEach(() => {
  env.tryoutBuild = ORIGINAL;
});

describe('TryoutBanner (D85)', () => {
  it('renders nothing when the tryout flag is off', async () => {
    env.tryoutBuild = false;
    render(<TryoutBanner />);
    await act(async () => {});
    expect(screen.queryByTestId('tryout-banner')).toBeNull();
  });

  it('shows the test-build notice in the chosen language when the flag is on', async () => {
    env.tryoutBuild = true;
    useSettings.getState().set('language', 'en');
    render(<TryoutBanner />);
    await act(async () => {});
    const banner = screen.getByTestId('tryout-banner');
    expect(banner.props.accessibilityLabel).toBe(
      'Test build. Purchases are simulated. Not the store version.',
    );
    expect(screen.getByText('Test build')).toBeTruthy();
    expect(screen.getByText('Purchases are simulated. Not the store version.')).toBeTruthy();
  });

  it('is not interactive (cannot be dismissed)', async () => {
    env.tryoutBuild = true;
    render(<TryoutBanner />);
    await act(async () => {});
    const banner = screen.getByTestId('tryout-banner');
    expect(banner.props.onPress).toBeUndefined();
    expect(banner.props.accessibilityRole).toBe('text');
  });
});
