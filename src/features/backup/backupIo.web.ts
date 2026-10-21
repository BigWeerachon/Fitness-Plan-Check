import * as DocumentPicker from 'expo-document-picker';
import type { PickedFile, ShareResult } from './backupIo';

export type { PickedFile, ShareResult } from './backupIo';

/**
 * พรีวิวบนเว็บ: ไม่มีระบบไฟล์ของแอป → ดาวน์โหลดไฟล์ผ่านเบราว์เซอร์ และอ่านไฟล์ที่เลือกด้วย File API ของเบราว์เซอร์
 */
export async function saveBackupFile(
  filename: string,
  content: string,
  _dialogTitle: string,
): Promise<ShareResult> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return 'unavailable';
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return 'shared';
}

export async function pickBackupFile(): Promise<PickedFile> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '.json'],
    base64: false,
  });
  if (result.canceled || result.assets.length === 0) return { canceled: true };
  const asset = result.assets[0];
  const file = asset.file;
  return {
    canceled: false,
    name: asset.name,
    size: asset.size ?? null,
    read: async () => {
      if (file) return file.text();
      return (await fetch(asset.uri)).text();
    },
  };
}
