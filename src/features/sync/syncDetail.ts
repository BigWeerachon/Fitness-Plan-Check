import type { TFunction } from 'i18next';
import { formatRelativeDay, formatTime } from '../../i18n/format';

/** บรรทัดรายละเอียดสถานะซิงก์ในหน้าตั้งค่า: ซิงก์ล่าสุดเมื่อไร (หรือยังไม่เคย) + จำนวนรายการที่ค้างส่ง */
export function describeSyncDetail(
  sync: { lastSyncedAt: number | null; pending: number },
  t: TFunction,
  nowMs: number,
): string {
  const lastSynced = sync.lastSyncedAt
    ? t('sync.lastSynced', {
        when: `${formatRelativeDay(new Date(sync.lastSyncedAt), new Date(nowMs))} ${formatTime(new Date(sync.lastSyncedAt))}`,
      })
    : t('sync.never');
  const pending = sync.pending > 0 ? t('sync.pending', { count: sync.pending }) : null;
  return [lastSynced, pending].filter(Boolean).join(' · ');
}
