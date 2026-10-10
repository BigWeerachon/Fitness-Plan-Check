import type { LocaleShape } from '../../types';
import type en from '../en/date';

const date: LocaleShape<typeof en> = {
  weekdaysShort: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
  weekdaysMedium: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],
  weekdaysLong: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'],
  monthsShort: [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ],
  monthsLong: [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ],
  yearOffset: '543',
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',
  tomorrow: 'พรุ่งนี้',
  daysAgo_one: '{{count}} วันที่แล้ว',
  daysAgo_other: '{{count}} วันที่แล้ว',
  weeksAgo_one: '{{count}} สัปดาห์ที่แล้ว',
  weeksAgo_other: '{{count}} สัปดาห์ที่แล้ว',
  never: 'ยังไม่เคย',
  durationHm: '{{h}} ชม. {{m}} นาที',
  durationM: '{{m}} นาที',
};

export default date;
