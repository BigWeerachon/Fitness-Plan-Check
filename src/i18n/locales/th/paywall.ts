import type { LocaleShape } from '../../types';
import type en from '../en/paywall';

const paywall: LocaleShape<typeof en> = {
  title: 'Fitnese Pro',
  headline: {
    trial: 'ลองใช้ทุกฟีเจอร์ฟรี {{count}} วัน',
    subscribe: 'ปลดล็อกแผนการฝึกทั้งหมดของคุณ',
    winback: 'ยินดีต้อนรับกลับ — ฝึกต่อจากเดิมได้เลย',
    billing: 'มีปัญหาเรื่องการชำระเงิน',
  },
  sub: {
    trial: 'จากนั้น {{price}} ต่อเดือน ยกเลิกได้ทุกเมื่อ',
    subscribe: 'ใช้ได้ทุกฟีเจอร์ ทุกอุปกรณ์ของคุณ',
    winback: 'โปรแกรมและประวัติของคุณยังอยู่ครบ',
    billing: 'อัปเดตวิธีชำระเงินในบัญชีสโตร์เพื่อใช้งานต่อ',
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
    trial: 'เริ่มทดลองฟรี {{count}} วัน',
    monthly: 'สมัครรายเดือน {{price}} / เดือน',
    lifetime: 'ซื้อขาด {{price}}',
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
