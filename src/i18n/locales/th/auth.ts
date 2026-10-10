import type { LocaleShape } from '../../types';
import type en from '../en/auth';

const auth: LocaleShape<typeof en> = {
  title: 'ล็อกอิน',
  heading: 'ล็อกอินเพื่อดำเนินการต่อ',
  body: 'บัญชีช่วยเก็บแผนการฝึกและการซื้อของคุณให้ปลอดภัย และซิงก์ข้ามอุปกรณ์ เราใช้เพียงอีเมลจาก Google หรือ Apple',
  google: 'ดำเนินการต่อด้วย Google',
  apple: 'ลงชื่อเข้าใช้ด้วย Apple',
  working: 'กำลังล็อกอิน…',
  failed: 'ล็อกอินไม่สำเร็จ ลองอีกครั้งนะ',
  privateRelay: 'ใช้อีเมลแบบซ่อน (Private Relay) ของ Apple',
  terms: 'เมื่อดำเนินการต่อ ถือว่าคุณยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว',
};

export default auth;
