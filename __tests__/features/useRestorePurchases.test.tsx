import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { signIn } from '@/features/access/accountFlow';
import { alertRestoreOutcome, useRestorePurchases } from '@/features/access/useRestorePurchases';
import { setLanguage, t } from '@/i18n';
import { freshEnv } from '../helpers/env';

beforeAll(() => setLanguage('en'));
afterEach(() => {
  jest.restoreAllMocks();
});

describe('alertRestoreOutcome', () => {
  it('shows a message per outcome', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    alertRestoreOutcome('restored', t);
    alertRestoreOutcome('none', t);
    alertRestoreOutcome('error', t);
    expect(alert.mock.calls).toEqual([
      [t('paywall.restored')],
      [t('paywall.nothingToRestore')],
      [t('common.errorTitle'), t('errors.restoreFailed')],
    ]);
  });
});

describe('useRestorePurchases', () => {
  it('sends a signed-out user to login and restores right after (?then=restore)', async () => {
    freshEnv('lifetime');
    const push = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useRestorePurchases());
    await result.current();
    expect(push).toHaveBeenCalledWith({ pathname: '/login', params: { then: 'restore' } });
    expect(alert).not.toHaveBeenCalled();
  });

  it('alerts the outcome for a signed-in user without navigating', async () => {
    freshEnv('lifetime');
    await signIn('google');
    const push = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useRestorePurchases());
    await result.current();
    expect(push).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(t('paywall.restored'));
  });
});
