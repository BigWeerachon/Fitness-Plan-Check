import { Directory, File, Paths } from 'expo-file-system';

/**
 * ไฟล์ชั่วคราวที่มีข้อมูลผู้ใช้ในแคชของแอป (D82): ไฟล์สำรอง JSON / CSV ที่ส่งไปหน้าแชร์ และสำเนาไฟล์ที่ตัวเลือกไฟล์คัดลอกมา
 * ทั้งหมดถูกลบเมื่อ "ลบข้อมูลทั้งหมดในเครื่องนี้" และไฟล์ส่งออกเก่าถูกลบทุกครั้งที่ส่งออกใหม่
 * ไม่ลบทันทีหลังหน้าแชร์ปิด เพราะบน Android แอปปลายทางอาจยังอ่านไฟล์อยู่หลัง shareAsync คืนค่า
 */

const EXPORTS_DIR = 'exports';
/** โฟลเดอร์ที่ expo-document-picker คัดลอกไฟล์ที่เลือกไปไว้ (copyToCacheDirectory) ทั้ง iOS และ Android */
const PICKER_DIR = 'DocumentPicker';

function deleteDir(name: string): void {
  try {
    const dir = new Directory(Paths.cache, name);
    if (dir.exists) dir.delete();
  } catch {
    // ทำให้ดีที่สุด: ระบบลบแคชเองได้ภายหลัง และต้องไม่ทำให้การลบข้อมูลในฐานข้อมูลล้มเหลว
  }
}

/** เขียนไฟล์ส่งออกใหม่ในโฟลเดอร์ exports ของแคช (ลบไฟล์ส่งออกเก่าก่อน) */
export function writeExportFile(filename: string, content: string): File {
  deleteDir(EXPORTS_DIR);
  const dir = new Directory(Paths.cache, EXPORTS_DIR);
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, filename);
  file.create();
  file.write(content);
  return file;
}

/** ลบสำเนาไฟล์ที่เลือก ถ้าอยู่ในแคชของแอป (ไม่แตะไฟล์ต้นฉบับของผู้ใช้) */
export function removeCachedCopy(uri: string): void {
  try {
    const cache = Paths.cache.uri.replace(/\/$/, '');
    if (!uri.startsWith(`${cache}/`)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // ทำให้ดีที่สุด
  }
}

/** ลบไฟล์ส่งออกและสำเนาไฟล์ที่เลือกทั้งหมดในแคช */
export function clearLocalFiles(): void {
  deleteDir(EXPORTS_DIR);
  deleteDir(PICKER_DIR);
}
