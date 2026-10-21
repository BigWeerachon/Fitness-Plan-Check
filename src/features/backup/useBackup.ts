import type { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import type { BackupSummary } from '../../domain/backup';
import { formatDateLong } from '../../i18n/format';
import { useSettings } from '../../stores/settings';
import { confirmDestructive } from '../../utils/confirmDestructive';
import { applyBackup, createBackup, readBackupFile } from './backupFlow';

/** ตารางที่แสดงจำนวนในกล่องยืนยันการกู้คืน (ส่วนที่ผู้ใช้เข้าใจได้) */
const SUMMARY_LINES = [
  ['program', 'backup.counts.programs'],
  ['workout_session', 'backup.counts.workouts'],
  ['session_set', 'backup.counts.sets'],
  ['daily_log', 'backup.counts.dailyLogs'],
  ['custom_exercise', 'backup.counts.customExercises'],
] as const;

/** ข้อความสรุปไฟล์สำรอง: วันที่สำรอง เวอร์ชันแอป และจำนวนข้อมูลหลัก */
export function describeBackupSummary(summary: BackupSummary, t: TFunction): string {
  const counts = SUMMARY_LINES.map(([table, key]) => t(key, { n: summary.counts[table] ?? 0 })).join('\n');
  return t('backup.confirmBody', {
    date: formatDateLong(new Date(summary.exportedAt)),
    version: summary.appVersion,
    counts,
  });
}

export type BackUpResult = 'shared' | 'unavailable' | 'error';
export type RestoreStep = 'canceled' | 'invalid' | 'confirming';

/**
 * ปุ่ม "สำรองข้อมูล" และ "กู้คืนจากไฟล์" (D82) — ใช้ได้ทั้งหน้าตั้งค่าและหน้าบัญชี (เข้าถึงได้แม้ล็อก)
 * กู้คืน: เลือกไฟล์ → ตรวจ → สรุป + ยืนยันแบบย้อนกลับไม่ได้ → แทนที่ข้อมูลทั้งหมด → onRestored
 */
export function useBackup(opts: { onRestored?: () => void } = {}) {
  const { t } = useTranslation();
  const lastBackupAt = useSettings((s) => s.lastBackupAt);
  const [busy, setBusy] = useState(false);
  const { onRestored } = opts;

  const backUp = useCallback(async (): Promise<BackUpResult> => {
    setBusy(true);
    try {
      const result = await createBackup(t('backup.shareTitle'));
      if (result === 'unavailable') Alert.alert(t('backup.unavailable'));
      return result;
    } catch {
      Alert.alert(t('common.errorTitle'), t('backup.backupFailed'));
      return 'error';
    } finally {
      setBusy(false);
    }
  }, [t]);

  const restore = useCallback(async (): Promise<RestoreStep> => {
    setBusy(true);
    const outcome = await readBackupFile().finally(() => setBusy(false));
    if (outcome.status === 'canceled') return 'canceled';
    if (outcome.status === 'invalid') {
      Alert.alert(t('backup.invalidTitle'), t(`backup.invalid.${outcome.reason}`));
      return 'invalid';
    }
    const { backup, summary } = outcome;
    confirmDestructive(t, {
      title: t('backup.confirmTitle'),
      message: describeBackupSummary(summary, t),
      confirmLabel: t('backup.confirm'),
      onConfirm: () => {
        try {
          applyBackup(backup);
        } catch {
          Alert.alert(t('common.errorTitle'), t('backup.restoreFailed'));
          return;
        }
        Alert.alert(t('backup.restored'));
        onRestored?.();
      },
    });
    return 'confirming';
  }, [t, onRestored]);

  const lastBackupLabel =
    lastBackupAt === null
      ? t('backup.neverBackedUp')
      : t('backup.lastBackup', { date: formatDateLong(new Date(lastBackupAt)) });

  return { backUp, restore, busy, lastBackupLabel };
}
