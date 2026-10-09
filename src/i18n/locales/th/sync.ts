import type { LocaleShape } from '../../types';
import type en from '../en/sync';

const sync: LocaleShape<typeof en> = {
  title: 'ซิงก์',
  status: {
    idle: 'ข้อมูลเป็นปัจจุบัน',
    syncing: 'กำลังซิงก์…',
    offline: 'ออฟไลน์ — บันทึกไว้ในเครื่องแล้ว',
    error: 'ซิงก์มีปัญหา — จะลองใหม่อัตโนมัติ',
    waiting: 'รอยืนยันสถานะสมาชิก',
    disabled: 'ปิดซิงก์อยู่ — ข้อมูลยังอยู่ในเครื่องครบ',
  },
  lastSynced: 'ซิงก์ล่าสุด {{when}}',
  never: 'ยังไม่เคยซิงก์',
  pending_one: 'รออัปโหลด {{count}} รายการ',
  pending_other: 'รออัปโหลด {{count}} รายการ',
  syncNow: 'ซิงก์ตอนนี้',
};

export default sync;
