import Constants from 'expo-constants';
import { backupSpec, exportAllUserData, restoreAllUserData } from '../../db/backup';
import {
  backupFilename,
  MAX_BACKUP_BYTES,
  parseBackup,
  serializeBackup,
  type BackupFile,
  type BackupProblem,
  type BackupSummary,
} from '../../domain/backup';
import { toLocalDate } from '../../domain/dates';
import { notifyDataChanged } from '../../stores/dataVersion';
import { useRestTimer } from '../../stores/restTimer';
import { useSettings } from '../../stores/settings';
import { now } from '../../utils/clock';
import { pickBackupFile, saveBackupFile, type ShareResult } from './backupIo';

/** สำรอง/กู้คืนข้อมูลเป็นไฟล์ (D82) — ฟังก์ชันล้วนฝั่งแอป ไม่แสดง UI (ดู useBackup) */

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/** เขียนไฟล์สำรอง fitnese-backup-YYYY-MM-DD.json แล้วเปิดหน้าแชร์ของระบบ — แชร์ได้ = บันทึกวันที่สำรองล่าสุด */
export async function createBackup(dialogTitle: string): Promise<ShareResult> {
  const exportedAt = now();
  const backup = exportAllUserData({ appVersion: appVersion(), exportedAt });
  const result = await saveBackupFile(
    backupFilename(toLocalDate(exportedAt)),
    serializeBackup(backup),
    dialogTitle,
  );
  if (result === 'shared') useSettings.getState().set('lastBackupAt', exportedAt);
  return result;
}

/** เหตุผลที่ใช้ไฟล์ไม่ได้: จากการตรวจเนื้อหา หรืออ่านไฟล์ไม่ได้เลย */
export type BackupFailure = BackupProblem | 'unreadable';

export type ReadBackupOutcome =
  | { status: 'canceled' }
  | { status: 'invalid'; reason: BackupFailure }
  | { status: 'ready'; backup: BackupFile; summary: BackupSummary };

/** ให้ผู้ใช้เลือกไฟล์แล้วตรวจ — ยังไม่แตะข้อมูลในเครื่อง */
export async function readBackupFile(): Promise<ReadBackupOutcome> {
  let text: string;
  try {
    const picked = await pickBackupFile();
    if (picked.canceled) return { status: 'canceled' };
    if (picked.size !== null && picked.size > MAX_BACKUP_BYTES) {
      return { status: 'invalid', reason: 'tooLarge' };
    }
    text = await picked.read();
  } catch {
    return { status: 'invalid', reason: 'unreadable' };
  }
  const parsed = parseBackup(text, backupSpec());
  if (!parsed.ok) return { status: 'invalid', reason: parsed.reason };
  return { status: 'ready', backup: parsed.backup, summary: parsed.summary };
}

/** แทนที่ข้อมูลทั้งหมดในเครื่องด้วยไฟล์สำรอง (ทรานแซกชันเดียว ล้มเหลว = โยน error และไม่มีอะไรเปลี่ยน) แล้วรีเฟรชหน้าจอ */
export function applyBackup(backup: BackupFile): void {
  restoreAllUserData(backup);
  useSettings.getState().load();
  // ตัวจับเวลาพักอาจอ้างเซสชันที่ไม่มีแล้ว
  useRestTimer.getState().stop();
  notifyDataChanged();
}
