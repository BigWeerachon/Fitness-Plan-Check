import type { LocaleShape } from '../../types';
import type en from '../en/account';

const account: LocaleShape<typeof en> = {
  title: 'การตั้งค่า',
  sections: {
    appearance: 'การแสดงผล',
    membership: 'สมาชิก',
    data: 'ข้อมูลของคุณ',
    info: 'ข้อมูล',
  },
  language: 'ภาษา',
  theme: 'ธีม',
  themeDark: 'มืด',
  themeLight: 'สว่าง',
  themeSystem: 'ตามระบบ',
  accent: 'สีหลัก',
  status: {
    NO_ENTITLEMENT: 'ยังไม่มีแพ็กเกจ',
    TRIALING: 'ทดลองใช้ฟรี',
    SUBSCRIBED_MONTHLY: 'รายเดือน',
    LIFETIME: 'ซื้อขาด',
    BILLING_GRACE: 'มีปัญหาการชำระเงิน',
    EXPIRED: 'หมดอายุแล้ว',
  },
  dates: {
    trialEnds: 'ช่วงทดลองสิ้นสุด {{date}}',
    trialEndsThenRenews: 'ช่วงทดลองสิ้นสุด {{date}} จากนั้นต่ออายุรายเดือน',
    renews: 'ต่ออายุ {{date}}',
    endsOn: 'ใช้ได้ถึง {{date}}',
    expiredOn: 'สิ้นสุดเมื่อ {{date}}',
    lifetime: 'ใช้ได้ตลอดอายุการให้บริการ',
    billing: 'อัปเดตการชำระเงินภายใน {{date}} เพื่อใช้งานต่อ',
  },
  badge: {
    trial: 'ทดลองถึง {{date}}',
    renews: 'ต่ออายุ {{date}}',
    ending: 'ใช้ได้ถึง {{date}}',
    billing: 'มีปัญหาการชำระเงิน',
  },
  notice: {
    monthlyStillActive: 'แพ็กเกจรายเดือนของคุณยังใช้งานอยู่ — ยกเลิกใน {{store}} เพื่อไม่ให้ถูกเรียกเก็บเงิน',
    openStore: 'เปิดหน้าการสมัครสมาชิกในสโตร์',
  },
  restore: 'กู้คืนการซื้อ',
  manage: 'จัดการสมาชิก',
  getLifetime: 'อัปเกรดเป็นแบบซื้อขาด',
  seePlans: 'ดูแพ็กเกจ',
  editSetup: 'แก้ไขการตั้งค่าเริ่มต้น',
  editSetupSub: 'โปรไฟล์และโปรแกรมเริ่มต้นของคุณ',
  privacy: 'นโยบายความเป็นส่วนตัว',
  terms: 'ข้อกำหนดการใช้งาน',
  references: 'แหล่งอ้างอิง',
  deleteData: 'ลบข้อมูลทั้งหมดในเครื่องนี้',
  version: 'เวอร์ชัน',
  delete: {
    heading: 'ลบข้อมูลทั้งหมดในเครื่องนี้?',
    body: 'การลบจะลบทุกอย่างที่ Fitnese เก็บไว้ในเครื่องนี้อย่างถาวร — โปรแกรม ประวัติการฝึก สถิติ บันทึกรายวัน โปรไฟล์ และคำตอบตอนตั้งค่าเริ่มต้น ข้อมูลไม่ได้เก็บไว้ที่อื่น จึงกู้คืนไม่ได้ เว้นแต่คุณบันทึกไฟล์สำรองไว้',
    subscriptionWarning:
      'การลบข้อมูลไม่ยกเลิกการสมัครสมาชิกใน App Store หรือ Google Play หากไม่ต้องการถูกเรียกเก็บเงิน กรุณายกเลิกในบัญชีสโตร์',
    manage: 'เปิดหน้าการสมัครสมาชิก',
    confirmCheck: 'ฉันเข้าใจว่าข้อมูลทั้งหมดในเครื่องนี้จะถูกลบ',
    confirm: 'ลบข้อมูลทั้งหมด',
    confirmTitle: 'ยืนยันลบข้อมูลทั้งหมดถาวร?',
    confirmBody: 'ทุกอย่างจะถูกลบออกจากเครื่องนี้ และกู้คืนไม่ได้',
    working: 'กำลังลบ…',
    done: 'ลบข้อมูลทั้งหมดในเครื่องนี้เรียบร้อยแล้ว',
    failed: 'ลบข้อมูลไม่สำเร็จ ข้อมูลยังอยู่ครบเหมือนเดิม ลองอีกครั้งนะ',
  },
};

export default account;
