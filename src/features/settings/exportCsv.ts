import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import { dailyLogCsv, workoutCsv } from '../../domain/csv';
import { toLocalDate } from '../../domain/dates';
import { now } from '../../utils/clock';
import { exerciseDisplayName } from '../exercises/resolve';
import { loadStats } from '../stats/loadStats';

export type ExportKind = 'workouts' | 'daily';

/** สร้างเนื้อหา CSV จากข้อมูลในเครื่องของบัญชีปัจจุบัน */
export function buildExport(kind: ExportKind): { filename: string; content: string } {
  const stamp = toLocalDate(now());
  if (kind === 'daily') {
    return { filename: `fitnese-daily-${stamp}.csv`, content: dailyLogCsv(dailyLogRepo.listAll()) };
  }
  const { data } = loadStats();
  const exerciseOrder = new Map<string, number>();
  for (const s of data.sessions) {
    for (const e of sessionRepo.exercises(s.id)) exerciseOrder.set(e.id, e.sortOrder);
  }
  return {
    filename: `fitnese-workouts-${stamp}.csv`,
    content: workoutCsv({
      sessions: data.sessions,
      sets: data.sets,
      exerciseOrder,
      exerciseName: exerciseDisplayName,
    }),
  };
}

/**
 * ส่งออก CSV แล้วเปิดหน้าแชร์ของระบบ (บันทึกลงไฟล์/ส่งอีเมล ฯลฯ)
 * ไฟล์อยู่ในโฟลเดอร์แคชของแอปเท่านั้น ระบบลบได้เองเมื่อพื้นที่เหลือน้อย
 */
export async function shareExport(kind: ExportKind, dialogTitle: string): Promise<'shared' | 'unavailable'> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const { filename, content } = buildExport(kind);
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle,
  });
  return 'shared';
}
