import type { LocaleShape } from '../../types';
import type en from '../en/week';

const week: LocaleShape<typeof en> = {
  title: 'ตารางประจำสัปดาห์',
  program: 'โปรแกรมของทั้งสัปดาห์',
  switched: 'สลับทั้งสัปดาห์เป็น {{name}} แล้ว',
  weekStart: 'สัปดาห์เริ่มวัน',
  monday: 'จันทร์',
  sunday: 'อาทิตย์',
  routinesHint: 'แตะวันเพื่อเลือกวันของแต่ละ routine สวิตช์ใช้เปิด/ปิด routine ในตาราง',
  enabledA11y: '{{name}} อยู่ในตาราง',
  copyDay: 'คัดลอกจากวันอื่น',
  copyFrom: 'คัดลอกจาก',
  copyTo: 'ไปยัง',
  copy: 'คัดลอก',
  copied: '{{to}} เหมือน {{from}} แล้ว',
  upcoming: '7 วันข้างหน้า',
  upcomingHint: 'แตะวันที่เพื่อเปลี่ยนเฉพาะวันนั้น',
  rest: 'พัก',
  free: 'เซสชันอิสระ',
  changed: 'เปลี่ยนแล้ว',
  dayTitle: 'เปลี่ยนแผน {{date}}',
  usePlan: 'ใช้ตามตารางสัปดาห์',
  noProgram: 'เลือกโปรแกรมก่อน',
  noProgramBody: 'ตารางประจำสัปดาห์เป็นของแต่ละโปรแกรม',
};

export default week;
