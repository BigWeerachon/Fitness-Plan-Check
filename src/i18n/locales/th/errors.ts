import type { LocaleShape } from '../../types';
import type en from '../en/errors';

const errors: LocaleShape<typeof en> = {
  generic: 'เกิดข้อผิดพลาด ลองอีกครั้งนะ',
  purchaseFailed: 'การซื้อไม่สำเร็จ คุณยังไม่ถูกเรียกเก็บเงิน',
  purchaseOffline: 'ไม่มีอินเทอร์เน็ต คุณยังไม่ถูกเรียกเก็บเงิน ลองใหม่เมื่อออนไลน์',
  purchaseNotAllowed: 'เครื่องนี้ไม่อนุญาตให้ซื้อ',
  storeUnavailable: 'ตอนนี้เชื่อมต่อสโตร์ไม่ได้ ลองใหม่ภายหลัง',
  linkFailed: 'เปิดลิงก์นี้ไม่ได้ ลองใหม่ภายหลัง',
  restoreFailed: 'กู้คืนการซื้อไม่สำเร็จ ลองอีกครั้งนะ',
  required: 'กรุณากรอกช่องนี้',
  invalidNumber: 'กรุณากรอกตัวเลขให้ถูกต้อง',
  outOfRange: 'กรุณากรอกค่าระหว่าง {{min}} ถึง {{max}}',
};

export default errors;
