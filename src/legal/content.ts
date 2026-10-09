/**
 * เทมเพลตนโยบายความเป็นส่วนตัวและข้อกำหนดการใช้งาน (SPEC N4)
 * ⚠️ เจ้าของโปรเจกต์ต้องแก้ [ชื่อผู้พัฒนา], [อีเมลติดต่อ], [ที่อยู่], [วันที่มีผล], [ประเทศ/กฎหมายที่ใช้บังคับ]
 * และให้ผู้เชี่ยวชาญด้านกฎหมายตรวจทานก่อนเผยแพร่ — สำเนาสำหรับโฮสต์บนเว็บสร้างด้วย `npm run legal:export` (→ docs/legal/)
 */
import type { Language } from '../i18n';

export interface LegalDoc {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
}

export type LegalKey = 'privacy' | 'terms';
export const LEGAL_KEYS: LegalKey[] = ['privacy', 'terms'];

export const PLACEHOLDERS = {
  developer: '[ชื่อผู้พัฒนา / Developer name]',
  contact: '[อีเมลติดต่อ / Contact email]',
  address: '[ที่อยู่ / Address]',
  effective: '[วันที่มีผล / Effective date]',
  law: '[ประเทศ/กฎหมายที่ใช้บังคับ / Governing law]',
};

const P = PLACEHOLDERS;

export const LEGAL: Record<LegalKey, Record<Language, LegalDoc>> = {
  privacy: {
    th: {
      title: 'นโยบายความเป็นส่วนตัว',
      updated: `มีผลตั้งแต่ ${P.effective}`,
      sections: [
        {
          heading: 'สรุปสั้นๆ',
          body: 'Fitnese เก็บข้อมูลเท่าที่จำเป็นต่อการวางแผนและบันทึกการฝึกของคุณ ไม่มีโฆษณา ไม่ติดตามข้ามแอป และไม่ขายข้อมูลของคุณ',
        },
        {
          heading: 'ข้อมูลที่เราเก็บ',
          body: '• บัญชี: รหัสผู้ใช้ และอีเมล (หรืออีเมลแบบซ่อนของ Apple) จาก Google หรือ Apple ที่คุณใช้ล็อกอิน\n• โปรไฟล์ที่คุณกรอกเอง (ไม่บังคับ): เพศ อายุ ส่วนสูง น้ำหนัก ระดับกิจกรรม เป้าหมาย และหน่วยที่ใช้\n• ข้อมูลการฝึก: โปรแกรม routine ท่า เซ็ต น้ำหนัก จำนวนครั้ง เวลาฝึก ความหนัก แคลอรี่ที่คำนวณ\n• บันทึกรายวันที่คุณกรอกเอง: แคลอรี่ที่ใช้/ที่กิน และน้ำหนักตัว\n• สถานะสมาชิก (ทดลอง/รายเดือน/ซื้อขาด และวันหมดอายุ) จาก App Store หรือ Google Play ผ่าน RevenueCat\nเราไม่เก็บรูปภาพ วิดีโอ ตำแหน่ง รายชื่อผู้ติดต่อ หรือข้อมูลบัตรชำระเงิน',
        },
        {
          heading: 'เราใช้ข้อมูลเพื่ออะไร',
          body: 'เพื่อแสดงแผนการฝึกของวันนี้ คำนวณเป้าหมาย (BMR/TDEE/สารอาหาร/แคลอรี่) แสดงสถิติ ซิงก์ข้อมูลระหว่างอุปกรณ์ของคุณ และตรวจสอบสิทธิ์การใช้งานตามการสมัครสมาชิก',
        },
        {
          heading: 'การจัดเก็บและการซิงก์',
          body: 'ข้อมูลถูกบันทึกในเครื่องของคุณก่อนเสมอ และเมื่อคุณมีสิทธิ์ใช้งาน จะซิงก์ไปยังฐานข้อมูลบนคลาวด์ (Supabase) ที่เข้าถึงได้เฉพาะบัญชีของคุณ (Row Level Security) โทเค็นการล็อกอินถูกเก็บในพื้นที่เข้ารหัสของระบบ (Keychain/Keystore)',
        },
        {
          heading: 'ผู้ให้บริการภายนอก',
          body: '• Google / Apple: ยืนยันตัวตนตอนล็อกอิน\n• Supabase: บัญชีผู้ใช้และฐานข้อมูลคลาวด์\n• RevenueCat: ตรวจสอบการซื้อและสถานะสมาชิก โดยใช้รหัสผู้ใช้ของบัญชีคุณ\n• Apple App Store / Google Play: ดำเนินการชำระเงิน การทดลองใช้ฟรี และการยกเลิก\nผู้ให้บริการเหล่านี้ประมวลผลข้อมูลตามนโยบายของแต่ละราย',
        },
        {
          heading: 'ข้อมูลสุขภาพและคำเตือน',
          body: 'ค่าที่แอปคำนวณเป็นเพียงการประมาณและคำแนะนำทั่วไป ไม่ใช่คำแนะนำทางการแพทย์ แอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัยหรือรักษาโรค เราไม่ใช้ข้อมูลของคุณเพื่อโฆษณาและไม่ส่งต่อให้บริษัทประกันหรือนายหน้าข้อมูล',
        },
        {
          heading: 'การเก็บรักษาและการลบข้อมูล',
          body: 'เราเก็บข้อมูลไว้ตราบที่คุณยังมีบัญชี คุณลบบัญชีและข้อมูลทั้งหมดได้เองในแอป (บัญชี → ลบบัญชีและข้อมูล) ซึ่งจะลบข้อมูลบนคลาวด์ เพิกถอนการเชื่อมต่อกับ Apple เมื่อลบจาก iPhone/iPad (ถ้าล็อกอินด้วย Apple บน Android ให้เอาแอปออกเองได้ที่ appleid.apple.com → ลงชื่อเข้าใช้ด้วย Apple) และลบข้อมูลในเครื่อง การลบบัญชีไม่ยกเลิกการสมัครสมาชิกในสโตร์ — ยกเลิกได้ในการตั้งค่าบัญชีสโตร์',
        },
        {
          heading: 'สิทธิ์ของคุณ',
          body: 'คุณขอเข้าถึง แก้ไข ส่งออก (CSV ในแอป) หรือลบข้อมูลของคุณได้ และติดต่อเราได้ตามช่องทางด้านล่าง',
        },
        {
          heading: 'เด็กและผู้เยาว์',
          body: 'แอปไม่ได้มุ่งให้เด็กอายุต่ำกว่า 13 ปีใช้งาน สำหรับผู้ใช้อายุต่ำกว่า 18 ปี แอปจะไม่แสดงเป้าหมายการลดน้ำหนัก',
        },
        {
          heading: 'การเปลี่ยนแปลงนโยบาย',
          body: 'หากมีการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งในแอปหรือหน้าสโตร์ก่อนมีผล',
        },
        { heading: 'ติดต่อ', body: `${P.developer}\n${P.address}\n${P.contact}` },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: `Effective ${P.effective}`,
      sections: [
        {
          heading: 'In short',
          body: 'Fitnese collects only what it needs to plan and log your training. No ads, no cross-app tracking, and we never sell your data.',
        },
        {
          heading: 'What we collect',
          body: '• Account: your user ID and email (or Apple’s private relay email) from the Google or Apple account you sign in with\n• Profile you enter (optional): sex, age, height, weight, activity level, goal and preferred units\n• Training data: programs, routines, exercises, sets, weights, reps, workout times, intensity and calculated calories\n• Daily entries you type in: calories burned/eaten and body weight\n• Membership status (trial/monthly/lifetime and expiry) from the App Store or Google Play via RevenueCat\nWe do not collect photos, videos, location, contacts or payment card details.',
        },
        {
          heading: 'How we use it',
          body: 'To show today’s plan, calculate targets (BMR/TDEE/macros/calories), show your stats, sync between your devices, and check access according to your subscription.',
        },
        {
          heading: 'Storage and sync',
          body: 'Data is always saved on your device first. While you have access, it syncs to a cloud database (Supabase) that only your account can read (Row Level Security). Sign-in tokens are kept in the system’s encrypted storage (Keychain/Keystore).',
        },
        {
          heading: 'Service providers',
          body: '• Google / Apple: sign-in\n• Supabase: accounts and cloud database\n• RevenueCat: purchase validation and membership status, using your account ID\n• Apple App Store / Google Play: payments, free trials and cancellations\nEach provider processes data under its own policy.',
        },
        {
          heading: 'Health information and disclaimer',
          body: 'Values calculated by the app are estimates and general guidance, not medical advice. The app is not a medical device and does not diagnose or treat any condition. We don’t use your data for advertising and don’t share it with insurers or data brokers.',
        },
        {
          heading: 'Retention and deletion',
          body: 'We keep your data while your account exists. You can delete your account and all data in the app (Account → Delete account and data). This removes your cloud data, revokes Sign in with Apple when deleted from an iPhone or iPad (if you used Apple sign-in on Android, you can also remove the app at appleid.apple.com → Sign in with Apple) and clears data on the device. Deleting your account does not cancel a store subscription — cancel it in your store account settings.',
        },
        {
          heading: 'Your rights',
          body: 'You can access, correct, export (CSV in the app) or delete your data, and contact us using the details below.',
        },
        {
          heading: 'Children',
          body: 'The app is not directed to children under 13. For users under 18 the app does not show weight-loss targets.',
        },
        {
          heading: 'Changes',
          body: 'We’ll announce material changes in the app or on the store page before they take effect.',
        },
        { heading: 'Contact', body: `${P.developer}\n${P.address}\n${P.contact}` },
      ],
    },
  },
  terms: {
    th: {
      title: 'ข้อกำหนดการใช้งาน',
      updated: `มีผลตั้งแต่ ${P.effective}`,
      sections: [
        {
          heading: 'การยอมรับข้อกำหนด',
          body: 'เมื่อใช้ Fitnese ถือว่าคุณยอมรับข้อกำหนดนี้และนโยบายความเป็นส่วนตัว',
        },
        {
          heading: 'บัญชี',
          body: 'คุณต้องล็อกอินด้วย Google หรือ Apple ก่อนเริ่มทดลองใช้หรือซื้อ เพื่อให้สิทธิ์ใช้งานผูกกับบัญชีและใช้ได้ข้ามอุปกรณ์ คุณรับผิดชอบการรักษาความปลอดภัยของบัญชีที่ใช้ล็อกอิน',
        },
        {
          heading: 'สมาชิกและการชำระเงิน',
          body: '• รายเดือน: สมาชิกต่ออายุอัตโนมัติ ผู้มีสิทธิ์จะได้ทดลองใช้ฟรี 7 วันก่อน (ตามข้อเสนอของสโตร์) จากนั้นเรียกเก็บตามราคาที่แสดงบนหน้าจอซื้อ\n• ยกเลิกได้ทุกเมื่อในการตั้งค่าบัญชี App Store หรือ Google Play — ยกเลิกระหว่างทดลองใช้ได้จนสิ้นสุดช่วงทดลอง ยกเลิกหลังชำระเงินใช้ได้จนสิ้นรอบบิล\n• ซื้อขาด: ชำระครั้งเดียว ไม่มีช่วงทดลอง\n• การคืนเงินเป็นไปตามนโยบายของ Apple หรือ Google\n• เมื่อสิทธิ์หมด ฟีเจอร์จะถูกล็อก แต่ข้อมูลของคุณยังอยู่ และกลับมาครบเมื่อสมัครใหม่',
        },
        {
          heading: 'ไม่ใช่คำแนะนำทางการแพทย์',
          body: 'เนื้อหา สูตร และค่าที่คำนวณในแอปเป็นข้อมูลทั่วไปเพื่อการออกกำลังกาย ไม่ใช่คำแนะนำทางการแพทย์หรือโภชนาการเฉพาะบุคคล ปรึกษาแพทย์ก่อนเริ่มโปรแกรมออกกำลังกาย โดยเฉพาะหากมีโรคประจำตัวหรือตั้งครรภ์ คุณออกกำลังกายด้วยความระมัดระวังและความรับผิดชอบของตนเอง',
        },
        {
          heading: 'การใช้งานที่เหมาะสม',
          body: 'ห้ามใช้แอปในทางที่ผิดกฎหมาย พยายามเข้าถึงข้อมูลของผู้อื่น หรือรบกวนการทำงานของระบบ',
        },
        {
          heading: 'ทรัพย์สินทางปัญญา',
          body: 'แอป ข้อความอธิบายท่า และเทมเพลตเป็นของผู้พัฒนา ข้อมูลที่คุณบันทึกเป็นของคุณ',
        },
        {
          heading: 'ข้อจำกัดความรับผิด',
          body: 'แอปให้บริการ "ตามสภาพ" ภายใต้ขอบเขตที่กฎหมายอนุญาต ผู้พัฒนาไม่รับผิดต่อการบาดเจ็บหรือความเสียหายที่เกิดจากการใช้ข้อมูลในแอป',
        },
        {
          heading: 'การเปลี่ยนแปลงข้อกำหนด',
          body: 'เราอาจปรับข้อกำหนดนี้ และจะแจ้งการเปลี่ยนแปลงที่สำคัญล่วงหน้า',
        },
        { heading: 'กฎหมายที่ใช้บังคับ', body: P.law },
        { heading: 'ติดต่อ', body: `${P.developer}\n${P.contact}` },
      ],
    },
    en: {
      title: 'Terms of Use',
      updated: `Effective ${P.effective}`,
      sections: [
        { heading: 'Agreement', body: 'By using Fitnese you agree to these Terms and the Privacy Policy.' },
        {
          heading: 'Accounts',
          body: 'You must sign in with Google or Apple before starting a trial or purchase, so your access is tied to your account and works across devices. You are responsible for keeping that account secure.',
        },
        {
          heading: 'Subscriptions and payments',
          body: '• Monthly: auto-renewing subscription. Eligible users get a 7-day free trial first (as offered by the store), then are charged the price shown on the purchase screen.\n• Cancel anytime in your App Store or Google Play account settings — if you cancel during the trial you keep access until it ends; after paying you keep access until the end of the billing period.\n• Lifetime: a one-time purchase with no free trial.\n• Refunds follow Apple’s or Google’s policies.\n• When access ends, features are locked but your data is kept and comes back when you subscribe again.',
        },
        {
          heading: 'Not medical advice',
          body: 'Content, formulas and calculated values are general fitness information, not medical or personalised nutrition advice. Consult a doctor before starting an exercise program, especially if you have a medical condition or are pregnant. You exercise at your own risk and responsibility.',
        },
        {
          heading: 'Acceptable use',
          body: 'Do not use the app unlawfully, try to access other users’ data, or interfere with the service.',
        },
        {
          heading: 'Intellectual property',
          body: 'The app, exercise descriptions and templates belong to the developer. The data you log belongs to you.',
        },
        {
          heading: 'Limitation of liability',
          body: 'The app is provided “as is” to the extent permitted by law. The developer is not liable for injury or loss arising from use of information in the app.',
        },
        { heading: 'Changes', body: 'We may update these Terms and will give notice of material changes.' },
        { heading: 'Governing law', body: P.law },
        { heading: 'Contact', body: `${P.developer}\n${P.contact}` },
      ],
    },
  },
};

/** แหล่งอ้างอิงของสูตรคำนวณ (SPEC H6 — บังคับ สโตร์ตรวจ) */
export const REFERENCES = [
  {
    id: 'mifflin',
    citation:
      'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241–247.',
    url: 'https://doi.org/10.1093/ajcn/51.2.241',
    usedFor: 'bmr',
  },
  {
    id: 'issn-protein',
    citation:
      'Jäger R, Kerksick CM, Campbell BI, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.',
    url: 'https://doi.org/10.1186/s12970-017-0177-8',
    usedFor: 'protein',
  },
  {
    id: 'compendium-2024',
    citation:
      'Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical Activities: A third update of the energy costs of human activities. J Sport Health Sci. 2024;13(1):6–12.',
    url: 'https://doi.org/10.1016/j.jshs.2023.10.010',
    usedFor: 'met',
  },
  {
    id: 'epley',
    citation:
      'Epley B. Poundage Chart. Boyd Epley Workout. Lincoln, NE: Body Enterprises; 1985. (1RM estimate: weight × (1 + reps/30))',
    url: 'https://en.wikipedia.org/wiki/One-repetition_maximum',
    usedFor: 'oneRepMax',
  },
] as const;

export type ReferenceUse = (typeof REFERENCES)[number]['usedFor'];
