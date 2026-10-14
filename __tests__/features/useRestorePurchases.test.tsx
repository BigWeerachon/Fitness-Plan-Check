import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
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
  it('restores straight from the store account without any sign-in and alerts the outcome', async () => {
    const s = freshEnv('lifetime');
    s.purchases.simulateReinstall();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useRestorePurchases());
    expect(await result.current()).toBe('restored');
    expect(s.purchases.restoreCalls).toBe(1);
    expect(alert).toHaveBeenCalledWith(t('paywall.restored'));
  });

  it('tells the user when the store account has nothing to restore', async () => {
    freshEnv('new');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useRestorePurchases());
    expect(await result.current()).toBe('none');
    expect(alert).toHaveBeenCalledWith(t('paywall.nothingToRestore'));
  });
});
