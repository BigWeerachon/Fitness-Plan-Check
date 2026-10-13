import type { TFunction } from 'i18next';
import { Alert } from 'react-native';

/**
 * กล่องยืนยันการกระทำที่ย้อนกลับไม่ได้: ปุ่มยกเลิก (common.cancel) + ปุ่มสีแดงที่เรียก onConfirm
 * ข้อความทั้งหมดต้องเป็นสตริงที่แปลแล้ว (ป้ายปุ่มยืนยันบางหน้าใช้ชื่อ action ไม่ใช่ common.delete)
 */
export function confirmDestructive(
  t: TFunction,
  opts: { title: string; message: string; confirmLabel: string; onConfirm: () => void },
): void {
  Alert.alert(opts.title, opts.message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: opts.confirmLabel, style: 'destructive', onPress: opts.onConfirm },
  ]);
}
