import type { LocaleShape } from '../../types';
import type en from '../en/onboarding';

const onboarding: LocaleShape<typeof en> = {
  step1Title: 'ตั้งค่าให้เป็นแบบของคุณ',
  step2Title: 'ข้อมูลของคุณ',
  step3Title: 'เริ่มโปรแกรมอย่างเร็ว',
  stepOf: 'ขั้นที่ {{step}} จาก {{total}}',
  step1Sub: 'เลือกภาษา ธีม และสีหลัก เปลี่ยนได้ตลอดเวลา',
  haveAccount: 'มีบัญชีอยู่แล้ว — ล็อกอิน',
  step2Sub: 'ใช้เพื่อประมาณแคลอรี่และเป้าหมายสารอาหารเท่านั้น ข้ามไปก่อนได้',
  sex: 'เพศ',
  sexes: { male: 'ชาย', female: 'หญิง' },
  age: 'อายุ',
  height: 'ส่วนสูง',
  weight: 'น้ำหนัก',
  feet: 'ฟุต',
  inches: 'นิ้ว',
  activity: 'ระดับกิจกรรม',
  activities: {
    sedentary: 'นั่งเป็นส่วนใหญ่',
    light: 'ออกกำลังกายเบาๆ 1–3 วันต่อสัปดาห์',
    moderate: 'ออกกำลังกายปานกลาง 3–5 วันต่อสัปดาห์',
    active: 'ออกกำลังกายหนัก 6–7 วันต่อสัปดาห์',
    very_active: 'ออกกำลังกายหนักมากหรือทำงานใช้แรง',
  },
  goal: 'เป้าหมาย',
  goals: { lose: 'ลดไขมัน', maintain: 'คงที่', gain: 'เพิ่มกล้าม' },
  units: 'หน่วย',
  ageRange: 'กรอกอายุระหว่าง {{min}} ถึง {{max}}',
  under18: 'อายุต่ำกว่า 18 ปี: แอปจะไม่แนะนำเป้าหมายลดน้ำหนัก',
  step3Sub: 'เริ่มจากโปรแกรมสำเร็จรูป แอปจัดวันในสัปดาห์ให้อัตโนมัติ และแก้ไขได้ทั้งหมด',
  daysPerWeek_one: '{{count}} วันต่อสัปดาห์',
  daysPerWeek_other: '{{count}} วันต่อสัปดาห์',
  custom: 'สร้างเอง',
  customSub: 'เริ่มจากโปรแกรมว่าง แล้วเพิ่ม routine เอง',
  skipProgram: 'ข้ามไปก่อน',
  finish: 'ดำเนินการต่อ',
};

export default onboarding;
