import type { LocaleShape } from '../../types';
import type en from '../en/a11y';

const a11y: LocaleShape<typeof en> = {
  weekdayOn: '{{day}}: มีในตาราง',
  weekdayOff: '{{day}}: ไม่มีในตาราง',
  add: 'เพิ่ม',
  menu: 'ตัวเลือกเพิ่มเติม',
  close: 'ปิด',
  back: 'ย้อนกลับ',
  selected: 'เลือกอยู่',
  locked: 'ถูกล็อก ต้องมีแพ็กเกจ',
  progress: 'เสร็จ {{done}} จาก {{total}}',
};

export default a11y;
