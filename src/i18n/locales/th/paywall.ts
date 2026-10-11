import type { LocaleShape } from '../../types';
import type en from '../en/paywall';

const paywall: LocaleShape<typeof en> = {
  title: 'Fitnese Pro',
  headline: {
    subscribe: 'ปลดล็อกแผนการฝึกทั้งหมดของคุณ',
    winback: 'ยินดีต้อนรับกลับ — ฝึกต่อจากเดิมได้เลย',
    billing: 'มีปัญหาเรื่องการชำระเงิน',
    upgrade: 'ใช้ Fitnese Pro ได้ตลอดไป',
  },
  sub: {
    subscribe: 'ใช้ได้ทุกฟีเจอร์ ทุกอุปกรณ์ของคุณ',
    winback: 'โปรแกรมและประวัติของคุณยังอยู่ครบ',
    billing:
      'การชำระเงินครั้งล่าสุดไม่สำเร็จ สิทธิ์ใช้งานจึงถูกพักไว้ อัปเดตวิธีชำระเงินในบัญชี {{store}} เพื่อใช้งานต่อ',
    upgrade: 'จ่ายครั้งเดียว ใช้ทุกฟีเจอร์ได้ถาวร ทุกอุปกรณ์ของคุณ',
  },
  billed: {
    trial: 'ฟรี {{count}} วัน จากนั้น {{price}}/เดือน',
    monthly: '{{price}}/เดือน ต่ออายุอัตโนมัติ',
    lifetime: '{{price}} จ่ายครั้งเดียว',
  },
  features: {
    today: 'รู้ทันทีว่าวันนี้ต้องฝึกอะไร',
    programs: 'ตารางรายสัปดาห์ โปรแกรม และเทมเพลตของคุณเอง',
    overload: 'Progressive overload ปรับได้ระหว่างฝึก',
    stats: 'สถิติตามกรุ๊ป ประเภท routine และกลุ่มกล้ามเนื้อ',
    sync: 'ซิงก์ข้ามอุปกรณ์ของคุณ',
  },
  plans: {
    monthly: 'รายเดือน',
    lifetime: 'ซื้อขาด',
    perMonth: '{{price}} / เดือน',
    oneTime: '{{price}} ครั้งเดียว',
    perMonthLabel: 'ต่อเดือน',
    oneTimeLabel: 'จ่ายครั้งเดียว',
    trialBadge: 'ทดลองฟรี {{count}} วัน',
    monthlyNote: 'ต่ออายุทุกเดือน ยกเลิกได้ทุกเมื่อ',
    lifetimeNote: 'ปลดล็อกทุกฟีเจอร์ถาวร ไม่มีช่วงทดลอง',
  },
  cta: {
    trial: 'เริ่มทดลองฟรี จากนั้น {{price}}/เดือน',
    monthly: 'สมัครรายเดือน {{price}} / เดือน',
    lifetime: 'ซื้อขาด {{price}}',
    fixPayment: 'แก้ไขการชำระเงิน',
    signInFirst: 'คุณจะล็อกอินด้วย Google หรือ Apple ก่อน เพื่อให้การซื้อผูกกับบัญชีของคุณ',
    signedInAs: 'ล็อกอินเป็น {{email}}',
  },
  disclosure: {
    trialThenPrice: 'ฟรี {{count}} วัน จากนั้น {{price}} ต่อเดือน',
    monthlyPrice: '{{price}} ต่อเดือน ไม่มีช่วงทดลองฟรี',
    autoRenew: 'สมาชิกต่ออายุอัตโนมัติทุกเดือนจนกว่าคุณจะยกเลิก',
    cancelBeforeTrialEnds:
      'ยกเลิกได้ทุกเมื่อก่อนสิ้นสุดช่วงทดลองในการตั้งค่าบัญชี {{store}} และจะไม่ถูกเรียกเก็บเงิน',
    cancelAnytime: 'ยกเลิกได้ทุกเมื่อในการตั้งค่าบัญชี {{store}} และใช้งานได้จนสิ้นรอบบิล',
    lifetimeNoTrial: 'แบบซื้อขาดเป็นการซื้อครั้งเดียว ไม่มีช่วงทดลองฟรี',
  },
  upgrade: {
    notice:
      'การซื้อแบบซื้อขาดจะไม่ยกเลิกสมาชิกรายเดือนหรือช่วงทดลองฟรีให้อัตโนมัติ โปรดยกเลิกเองในการตั้งค่าบัญชี {{store}} เพื่อไม่ให้ถูกเรียกเก็บค่ารายเดือน',
    manage: 'เปิดการตั้งค่าสมาชิก',
  },
  manageSubscription: 'จัดการหรือยกเลิกสมาชิก',
  restore: 'กู้คืนการซื้อ',
  restored: 'กู้คืนการซื้อเรียบร้อยแล้ว',
  nothingToRestore: 'ไม่พบการซื้อก่อนหน้าของบัญชีนี้',
  success: 'เรียบร้อย! ขอให้สนุกกับ Fitnese Pro',
  unavailable: 'ตอนนี้โหลดแพ็กเกจจากสโตร์ไม่ได้',
  loadingPlans: 'กำลังโหลดแพ็กเกจจากสโตร์…',
  terms: 'ข้อกำหนดการใช้งาน',
  privacy: 'นโยบายความเป็นส่วนตัว',
  references: 'แหล่งอ้างอิง',
  account: 'บัญชีและการตั้งค่า',
  store: { ios: 'App Store', android: 'Google Play' },
};

export default paywall;
