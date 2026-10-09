import type { LocaleShape } from '../../types';
import type en from '../en/errors';

const errors: LocaleShape<typeof en> = {
  generic: 'เกิดข้อผิดพลาด ลองอีกครั้งนะ',
  network: 'ไม่มีอินเทอร์เน็ต การเปลี่ยนแปลงบันทึกในเครื่องแล้ว และจะซิงก์ภายหลัง',
  signInFailed: 'ล็อกอินไม่สำเร็จ ลองอีกครั้งนะ',
  signInCancelled: 'ยกเลิกการล็อกอินแล้ว',
  purchaseFailed: 'การซื้อไม่สำเร็จ คุณยังไม่ถูกเรียกเก็บเงิน',
  purchaseNotAllowed: 'เครื่องนี้ไม่อนุญาตให้ซื้อ',
  storeUnavailable: 'ตอนนี้เชื่อมต่อสโตร์ไม่ได้ ลองใหม่ภายหลัง',
  restoreFailed: 'กู้คืนการซื้อไม่สำเร็จ ลองอีกครั้งนะ',
  syncFailed: 'ซิงก์ไม่สำเร็จ ระบบจะลองใหม่ให้ ข้อมูลในเครื่องไม่หาย',
  notConfigured: 'ฟีเจอร์นี้ยังไม่ได้ตั้งค่า',
  required: 'กรุณากรอกช่องนี้',
  invalidNumber: 'กรุณากรอกตัวเลขให้ถูกต้อง',
  outOfRange: 'กรุณากรอกค่าระหว่าง {{min}} ถึง {{max}}',
};

export default errors;
