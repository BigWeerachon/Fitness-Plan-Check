import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { removeCachedCopy, writeExportFile } from '../data/localFiles';

/**
 * อ่าน/เขียนไฟล์สำรองบนเครื่อง (iOS/Android) — บนเว็บใช้ backupIo.web.ts
 * ไฟล์ส่งออกอยู่ในโฟลเดอร์แคชของแอป (data/localFiles) แล้วเปิดหน้าแชร์ของระบบ ให้ผู้ใช้เลือกที่เก็บเอง (Drive/LINE/Files/อีเมล)
 */

export type ShareResult = 'shared' | 'unavailable';

export async function saveBackupFile(
  filename: string,
  content: string,
  dialogTitle: string,
): Promise<ShareResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const file = writeExportFile(filename, content);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle });
  return 'shared';
}

export type PickedFile =
  { canceled: true } | { canceled: false; name: string; size: number | null; read(): Promise<string> };

/** เลือกไฟล์ (รับทุกชนิด เพราะแอปแชร์บางตัวเปลี่ยน MIME type ของ .json — ตรวจเนื้อหาทีหลัง) */
export async function pickBackupFile(): Promise<PickedFile> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return { canceled: true };
  const asset = result.assets[0];
  return {
    canceled: false,
    name: asset.name,
    size: asset.size ?? null,
    read: async () => {
      try {
        return await new File(asset.uri).text();
      } finally {
        // สำเนาในแคชมีข้อมูลทั้งหมด — อ่านแล้วไม่ต้องเก็บ
        removeCachedCopy(asset.uri);
      }
    },
  };
}
