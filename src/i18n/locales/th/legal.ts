import type { LocaleShape } from '../../types';
import type en from '../en/legal';

const legal: LocaleShape<typeof en> = {
  title: 'ข้อกำหนด',
  referencesTitle: 'แหล่งอ้างอิง',
  referencesIntro:
    'ค่าประมาณใน Fitnese อ้างอิงจากงานวิจัยและเอกสารเหล่านี้ เป็นคำแนะนำทั่วไป ไม่ใช่คำแนะนำทางการแพทย์',
  usedFor: {
    bmr: 'ใช้คำนวณ: BMR (สูตร Mifflin–St Jeor)',
    protein: 'ใช้คำนวณ: เป้าโปรตีนต่อวัน (1.6–2.2 ก./กก.)',
    met: 'ใช้คำนวณ: แคลอรี่จากการออกกำลังกาย (MET × กก. × ชั่วโมง)',
    oneRepMax: 'ใช้คำนวณ: 1RM โดยประมาณ (สูตร Epley)',
  },
  openLink: 'เปิดแหล่งอ้างอิง',
  openWeb: 'เปิดฉบับเว็บ',
  templateNotice: 'เทมเพลต — ผู้พัฒนาต้องตรวจและกรอกข้อมูลให้ครบก่อนเผยแพร่',
};

export default legal;
