import type { LocaleShape } from '../../types';
import type en from '../en/settings';

const settings: LocaleShape<typeof en> = {
  title: 'ตั้งค่า',
  sections: {
    appearance: 'หน้าตาแอป',
    workout: 'หน่วยและการฝึก',
    profile: 'โปรไฟล์',
    membership: 'สมาชิก',
    data: 'ข้อมูลของคุณ',
    account: 'บัญชี',
    about: 'เกี่ยวกับ',
  },
  weightUnit: 'หน่วยน้ำหนัก',
  lengthUnit: 'หน่วยส่วนสูง',
  restTimer: 'ตัวจับเวลาพัก',
  restTimerA11y: 'ตัวจับเวลาพักระหว่างเซ็ต',
  restDefault: 'เวลาพักเริ่มต้น',
  weekStart: 'วันเริ่มต้นสัปดาห์',
  weightStep: 'ก้าวเพิ่มน้ำหนัก',
  weightStepHint: 'ใช้ตอนแนะนำเป้าหมายครั้งถัดไป',
  profile: 'โปรไฟล์และเป้าหมาย',
  profileSub: 'ข้อมูลร่างกาย เป้าแคลอรี่และสารอาหาร',
  exportCsv: 'ส่งออก CSV',
  exportSub: 'บันทึกหรือแชร์ข้อมูลเป็นไฟล์ตาราง',
  exportWorkouts: 'การฝึก (ทุกเซ็ต)',
  exportDaily: 'บันทึกรายวัน (น้ำหนักและแคลอรี่)',
  exportTitle: 'ส่งออกข้อมูล Fitnese',
  exportUnavailable: 'อุปกรณ์นี้แชร์ไฟล์ไม่ได้',
  exportFailed: 'สร้างไฟล์ไม่สำเร็จ ลองอีกครั้ง',
};

export default settings;
