import type { LocaleShape } from '../../types';
import type en from '../en/appearance';

const appearance: LocaleShape<typeof en> = {
  language: 'ภาษา',
  theme: 'ธีม',
  accent: 'สีหลัก',
  themes: { dark: 'มืด', light: 'สว่าง', system: 'ตามระบบ' },
  languages: { th: 'ไทย', en: 'English' },
  accents: {
    pink: 'ชมพูม่วง',
    lavender: 'ลาเวนเดอร์',
    sky: 'ฟ้า',
    mint: 'มินต์',
    lime: 'ไลม์',
    gold: 'ทอง',
    peach: 'พีช',
    coral: 'คอรัล',
    custom: 'เลือกสีเอง',
  },
  customTitle: 'เลือกสีของคุณ',
  customHex: 'รหัสสี (Hex)',
  customHexPlaceholder: '#E5A9DC',
  customInvalid: 'กรอกรหัสสี เช่น #E5A9DC',
  customAdjusted: 'ปรับความสว่างเล็กน้อยเพื่อให้ตัวอักษรยังอ่านง่าย',
  apply: 'ใช้สีนี้',
  preview: 'ตัวอย่าง',
  previewTitle: 'วันนี้: Push Day',
  previewSub: 'พฤ. 9 ต.ค. · 6 ท่า · ~55 นาที',
  previewRow: 'Push A',
  hue: 'สีที่ {{index}}',
};

export default appearance;
