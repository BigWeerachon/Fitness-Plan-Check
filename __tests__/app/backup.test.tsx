import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { exportAllUserData } from '@/db/backup';
import { programRepo } from '@/db/repos/programRepo';
import { serializeBackup } from '@/domain/backup';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { t } from '@/i18n';
import { useSettings } from '@/stores/settings';
import { now, setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';
import { freshEnv } from '../helpers/env';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

const files = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

describe('backup file rows (D82)', () => {
  it('settings: backs up to a shared file, shows the last backup date and the on-device hint', async () => {
    await entitledApp();
    instantiateTemplate('ppl3', 'en');
    renderRouter('./src/app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('settings')).toBeTruthy();
    expect(screen.getByTestId('settings-backup-hint')).toHaveTextContent(t('backup.hint'));
    expect(within(screen.getByTestId('settings-backup')).getByText(t('backup.neverBackedUp'))).toBeTruthy();
    expect(screen.getByTestId('settings-restore-file')).toBeTruthy();

    const share = jest.mocked(Sharing.shareAsync);
    share.mockClear();
    fireEvent.press(screen.getByTestId('settings-backup'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0]).toBe('file:///cache/exports/fitnese-backup-2026-10-09.json');
    await waitFor(() =>
      expect(
        within(screen.getByTestId('settings-backup')).getByText(
          t('backup.lastBackup', { date: 'Oct 9, 2026' }),
        ),
      ).toBeTruthy(),
    );
  });

  it('account page: restores a backup on a new phone without a plan, then the paywall asks to restore the purchase', async () => {
    // เครื่องเก่า: มีโปรแกรม แล้วสำรองไว้
    await entitledApp();
    instantiateTemplate('ppl3', 'en');
    const text = serializeBackup(exportAllUserData({ appVersion: '1.0.0', exportedAt: now() }));
    const uri = 'file:///downloads/fitnese-backup-2026-10-09.json';
    files.set(uri, text);

    // เครื่องใหม่: ยังไม่มีสิทธิ์ ยังไม่ตั้งค่าเริ่มต้น
    freshEnv('new');
    useSettings.getState().load();
    useSettings.getState().set('language', 'en');
    expect(programRepo.list()).toHaveLength(0);

    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri, name: 'fitnese-backup-2026-10-09.json', size: text.length, lastModified: 0 }],
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });

    renderRouter('./src/app', { initialUrl: '/account' });
    expect(await screen.findByTestId('account-backup-hint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('account-restore-file'));
    await flush();

    expect(programRepo.list()).toHaveLength(1);
    expect(useSettings.getState().onboardingDone).toBe(true);
    // ข้อมูลกลับมาแล้ว แต่ยังล็อกจนกว่าจะกู้คืนการซื้อ (B3)
    expect(await screen.findByTestId('paywall')).toBeTruthy();
  });
});
