import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { describeSyncDetail } from '@/features/sync/syncDetail';
import { setLanguage, t } from '@/i18n';

// วันนี้ = ศุกร์ 9 ต.ค. 2026 (เวลาท้องถิ่น)
const NOW = new Date(2026, 9, 9, 18, 0).getTime();
const TODAY_0930 = new Date(2026, 9, 9, 9, 30).getTime();

describe('describeSyncDetail', () => {
  beforeAll(() => setLanguage('en'));
  afterAll(() => setLanguage('en'));

  it('says never synced when there is no last sync time', () => {
    expect(describeSyncDetail({ lastSyncedAt: null, pending: 0 }, t, NOW)).toBe('Not synced yet');
  });

  it('shows the relative day and time of the last sync', () => {
    expect(describeSyncDetail({ lastSyncedAt: TODAY_0930, pending: 0 }, t, NOW)).toBe(
      'Last synced Today 09:30',
    );
  });

  it('appends the number of changes waiting to upload', () => {
    expect(describeSyncDetail({ lastSyncedAt: TODAY_0930, pending: 3 }, t, NOW)).toBe(
      'Last synced Today 09:30 · 3 changes waiting to upload',
    );
    expect(describeSyncDetail({ lastSyncedAt: null, pending: 1 }, t, NOW)).toBe(
      'Not synced yet · 1 change waiting to upload',
    );
  });
});
