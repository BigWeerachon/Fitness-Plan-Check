import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Alert, type AlertButton } from 'react-native';
import { exportAllUserData } from '@/db/backup';
import { MIGRATIONS } from '@/db/migrations.generated';
import { programRepo } from '@/db/repos/programRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { BACKUP_FORMAT_VERSION, MAX_BACKUP_BYTES, parseBackup, serializeBackup } from '@/domain/backup';
import { backupSpec } from '@/db/backup';
import type { BackupFailure } from '@/features/backup/backupFlow';
import { describeBackupSummary, useBackup } from '@/features/backup/useBackup';
import { setLanguage, t } from '@/i18n';
import { useSettings } from '@/stores/settings';
import { setClockForTests } from '@/utils/clock';
import { freshEnv } from '../helpers/env';
import { dumpUserTables, liveUserRows, populateRichData } from '../helpers/richData';

const files = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;
const pick = DocumentPicker.getDocumentAsync as jest.MockedFunction<typeof DocumentPicker.getDocumentAsync>;
const NOW = new Date('2026-10-09T09:00:00').getTime();

/** ผู้ใช้เลือกไฟล์ที่มีเนื้อหานี้ (ถ้า content = null → ไฟล์เปิดไม่ได้) */
function pickFile(content: string | null, opts: { size?: number } = {}) {
  const uri = 'file:///picked/fitnese-backup-2026-10-01.json';
  if (content === null) files.delete(uri);
  else files.set(uri, content);
  pick.mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        uri,
        name: 'fitnese-backup-2026-10-01.json',
        size: opts.size ?? content?.length,
        lastModified: NOW,
        mimeType: 'application/json',
      },
    ],
  });
}

function backupText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...exportAllUserData({ appVersion: '1.0.0', exportedAt: NOW }), ...overrides });
}

let alert: jest.SpiedFunction<typeof Alert.alert>;

beforeAll(() => setLanguage('en'));
beforeEach(() => {
  setClockForTests(() => NOW);
  freshEnv('lifetime');
  useSettings.getState().load();
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

describe('useBackup — back up', () => {
  it('writes fitnese-backup-<local date>.json to the cache, opens the share sheet and remembers the date', async () => {
    populateRichData();
    const share = jest.mocked(Sharing.shareAsync);
    share.mockClear();
    const { result } = renderHook(() => useBackup());
    expect(result.current.lastBackupLabel).toBe(t('backup.neverBackedUp'));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.backUp();
    });
    expect(outcome).toBe('shared');
    const uri = 'file:///cache/fitnese-backup-2026-10-09.json';
    expect(share).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'application/json' }));
    const parsed = parseBackup(files.get(uri)!, backupSpec());
    expect(parsed.ok && parsed.summary.counts.workout_session).toBe(2);
    expect(useSettings.getState().lastBackupAt).toBe(NOW);
    expect(result.current.lastBackupLabel).toBe(t('backup.lastBackup', { date: 'Oct 9, 2026' }));
    expect(alert).not.toHaveBeenCalled();
  });

  it('says so when sharing is unavailable and does not record a backup', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useBackup());
    await act(async () => {
      expect(await result.current.backUp()).toBe('unavailable');
    });
    expect(alert).toHaveBeenCalledWith(t('backup.unavailable'));
    expect(useSettings.getState().lastBackupAt).toBeNull();
  });

  it('shows a friendly error when the file cannot be written', async () => {
    jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => useBackup());
    await act(async () => {
      expect(await result.current.backUp()).toBe('error');
    });
    expect(alert).toHaveBeenCalledWith(t('common.errorTitle'), t('backup.backupFailed'));
    expect(useSettings.getState().lastBackupAt).toBeNull();
  });
});

describe('useBackup — restore from file', () => {
  it('does nothing when the picker is cancelled', async () => {
    const { result } = renderHook(() => useBackup());
    await act(async () => {
      expect(await result.current.restore()).toBe('canceled');
    });
    expect(alert).not.toHaveBeenCalled();
  });

  it.each<[BackupFailure, () => string]>([
    ['notJson', () => 'hello, this is not a backup'],
    ['notBackup', () => JSON.stringify({ format: 'something-else', formatVersion: 1 })],
    ['newerFormat', () => backupText({ formatVersion: BACKUP_FORMAT_VERSION + 1 })],
    ['newerSchema', () => backupText({ schemaVersion: MIGRATIONS.length + 1 })],
    ['missingTable', () => backupText({ tables: {} })],
  ] as const)(
    'rejects an invalid file (%s) with a friendly message and changes nothing',
    async (reason, make) => {
      populateRichData();
      const before = dumpUserTables();
      pickFile(make());
      const { result } = renderHook(() => useBackup());
      await act(async () => {
        expect(await result.current.restore()).toBe('invalid');
      });
      expect(alert).toHaveBeenCalledWith(t('backup.invalidTitle'), t(`backup.invalid.${reason}`));
      expect(dumpUserTables()).toEqual(before);
    },
  );

  it('rejects an oversized file before reading it, and a file it cannot open', async () => {
    const { result } = renderHook(() => useBackup());
    pickFile('{}', { size: MAX_BACKUP_BYTES + 1 });
    await act(async () => {
      expect(await result.current.restore()).toBe('invalid');
    });
    expect(alert).toHaveBeenLastCalledWith(t('backup.invalidTitle'), t('backup.invalid.tooLarge'));
    pickFile(null);
    await act(async () => {
      expect(await result.current.restore()).toBe('invalid');
    });
    expect(alert).toHaveBeenLastCalledWith(t('backup.invalidTitle'), t('backup.invalid.unreadable'));
  });

  it('shows a summary with a destructive confirm, then replaces all data and refreshes', async () => {
    populateRichData();
    const text = serializeBackup(exportAllUserData({ appVersion: '1.0.0', exportedAt: NOW }));
    const expected = liveUserRows();

    // เครื่องใหม่ที่มีข้อมูลอื่นอยู่แล้ว (ยังไม่ผ่านตั้งค่าเริ่มต้น)
    freshEnv('new');
    useSettings.getState().load();
    expect(useSettings.getState().onboardingDone).toBe(false);
    programRepo.create('Something else');
    pickFile(text);
    const onRestored = jest.fn();
    const { result } = renderHook(() => useBackup({ onRestored }));
    await act(async () => {
      expect(await result.current.restore()).toBe('confirming');
    });

    const [title, message, buttons] = alert.mock.calls[0] as [string, string, AlertButton[]];
    expect(title).toBe(t('backup.confirmTitle'));
    expect(message).toContain('Oct 9, 2026');
    expect(message).toContain(t('backup.counts.workouts', { n: 2 }));
    expect(message).toContain(t('backup.counts.programs', { n: 1 }));
    // ยังไม่เปลี่ยนอะไรจนกว่าจะกดยืนยัน
    expect(programRepo.list().map((p) => p.name)).toEqual(['Something else']);
    const confirm = buttons.find((b) => b.style === 'destructive')!;
    expect(confirm.text).toBe(t('backup.confirm'));
    expect(buttons.find((b) => b.style === 'cancel')?.text).toBe(t('common.cancel'));

    act(() => confirm.onPress!());
    expect(dumpUserTables()).toEqual(expected);
    expect(sessionRepo.listCompleted()).toHaveLength(2);
    expect(useSettings.getState().onboardingDone).toBe(true);
    expect(alert).toHaveBeenLastCalledWith(t('backup.restored'));
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it('keeps the current data when the user cancels the confirmation', async () => {
    populateRichData();
    pickFile(backupText());
    programRepo.create('Made after the backup');
    const before = dumpUserTables();
    const { result } = renderHook(() => useBackup());
    await act(async () => {
      await result.current.restore();
    });
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    buttons.find((b) => b.style === 'cancel')?.onPress?.();
    expect(dumpUserTables()).toEqual(before);
  });
});

describe('describeBackupSummary', () => {
  it('lists the backup date, app version and the main counts', () => {
    const msg = describeBackupSummary(
      {
        exportedAt: NOW,
        appVersion: '2.1.0',
        schemaVersion: 7,
        counts: { program: 2, workout_session: 40, session_set: 600, daily_log: 90, custom_exercise: 3 },
        totalRows: 735,
      },
      t,
    );
    expect(msg).toContain('Oct 9, 2026');
    expect(msg).toContain('2.1.0');
    for (const line of [
      'Programs: 2',
      'Workouts: 40',
      'Sets: 600',
      'Daily log entries: 90',
      'Custom exercises: 3',
    ]) {
      expect(msg).toContain(line);
    }
  });
});
