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

/**
 * ข้อความตัวแทนต้นฉบับ — ห้ามแก้ (ใช้ตรวจว่าเอกสารยังเป็นเทมเพลตอยู่หรือไม่)
 * เจ้าของโปรเจกต์แก้ค่าใน PLACEHOLDERS ด้านล่างแทน (ตอนนี้เป็นค่าจริงที่กรอกแล้ว) แล้ว hasPlaceholders() จะเป็น false เองเมื่อกรอกครบ
 */
export const MARKERS = Object.freeze({
  developer: '[ชื่อผู้พัฒนา / Developer name]',
  contact: '[อีเมลติดต่อ / Contact email]',
  address: '[ที่อยู่ / Address]',
});

/** ค่าจริงของเจ้าของโปรเจกต์ที่กรอกแล้ว (แทนที่ MARKERS.xxx แต่ละบรรทัด) — ชื่อ export คงไว้เพราะเอกสารปล่อยแอปอ้างถึง */
export const PLACEHOLDERS: Record<keyof typeof MARKERS, string> = {
  developer: 'Weerachon Kammoon',
  contact: 'weerachon.work@gmail.com',
  address: '79 ซ.4 ม.2 ต.หัวทุ่ง อ.ลอง จ.แพร่ 54150 ประเทศไทย (Thailand)',
};

/** วันที่เอกสารมีผล (เจ้าของกำหนด: 15 ตุลาคม 2569) แยกภาษา — ไทยใช้ พ.ศ. อังกฤษใช้ ค.ศ. */
const EFFECTIVE = {
  th: '15 ตุลาคม 2569',
  en: '15 October 2026',
};

const owner = PLACEHOLDERS;

/** บล็อกช่องทางติดต่อ (ผู้พัฒนา ที่อยู่ อีเมล) ที่ใช้ซ้ำในหัวข้อติดต่อของทุกเอกสาร */
const contactBlock = () => [owner.developer, owner.address, owner.contact].join('\n');

/** ภาษาที่มีเอกสารกฎหมาย (ตรงกับ Language ใน i18n แต่ไม่ import runtime เพื่อให้สคริปต์ Node ใช้ได้) */
export const LEGAL_LANGUAGES = ['th', 'en'] as const satisfies readonly Language[];

/** ข้อความทั้งหมดของเอกสารต่อกันด้วยบรรทัดใหม่ */
export function docText(doc: LegalDoc): string {
  return [doc.title, doc.updated, ...doc.sections.flatMap((s) => [s.heading, s.body])].join('\n');
}

/** เอกสารยังมีค่าตัวแทนต้นฉบับ (MARKERS) ที่เจ้าของโปรเจกต์ยังไม่ได้กรอกหรือไม่ */
export function hasPlaceholders(doc: LegalDoc): boolean {
  const text = docText(doc);
  return Object.values(MARKERS).some((value) => text.includes(value));
}

/** ค่าตัวแทนต้นฉบับที่ยังเหลืออยู่ในเอกสารที่ให้มา (ไม่ซ้ำ ตามลำดับ MARKERS) */
export function unfilledMarkers(docs: LegalDoc[]): string[] {
  const allText = docs.map(docText).join('\n');
  return Object.values(MARKERS).filter((marker) => allText.includes(marker));
}

export const LEGAL: Record<LegalKey, Record<Language, LegalDoc>> = {
  privacy: {
    th: {
      title: 'นโยบายความเป็นส่วนตัว',
      updated: `มีผลตั้งแต่ ${EFFECTIVE.th}`,
      sections: [
        {
          heading: 'สรุปสั้นๆ',
          body: 'Fitnese เก็บข้อมูลเท่าที่จำเป็นต่อการวางแผนและบันทึกการฝึกของคุณ ไม่มีโฆษณา ไม่มี SDK วิเคราะห์การใช้งานหรือรายงานข้อขัดข้อง ไม่ติดตามข้ามแอป และไม่ขายข้อมูลของคุณ',
        },
        {
          heading: 'ข้อมูลที่เราเก็บ',
          body: '• บัญชี: รหัสผู้ใช้ และอีเมล (หรืออีเมลแบบซ่อนของ Apple) จาก Google หรือ Apple ที่คุณใช้ล็อกอิน รวมถึงชื่อและรูปโปรไฟล์ที่ผู้ให้บริการล็อกอินอาจส่งมาให้ ซึ่งผู้ให้บริการยืนยันตัวตนของเรา (Supabase) อาจเก็บไว้กับบัญชี แต่แอปไม่ใช้และไม่แสดง\n• โปรไฟล์และการตั้งค่าที่คุณกรอกเอง (ไม่บังคับ): เพศ อายุ ส่วนสูง น้ำหนัก ระดับกิจกรรม เป้าหมาย หน่วยที่ใช้ และการตั้งค่า เช่น ตัวจับเวลาพัก\n• ข้อมูลการฝึก: โปรแกรม ตารางรายสัปดาห์ routine ท่า (รวมท่าที่คุณสร้างเองและบันทึกที่คุณพิมพ์) เซ็ต น้ำหนัก จำนวนครั้ง น้ำหนักตัวตอนฝึก เวลาฝึก ความหนัก และแคลอรี่ที่คำนวณ\n• บันทึกรายวันที่คุณกรอกเอง: แคลอรี่ที่ใช้/ที่กิน และน้ำหนักตัว\n• สถานะการสมัครสมาชิก (ทดลอง/รายเดือน/ซื้อขาด และวันหมดอายุ) จาก App Store หรือ Google Play ผ่าน RevenueCat\n• ข้อมูลทางเทคนิค: ที่อยู่ IP ประเภทอุปกรณ์และระบบปฏิบัติการ เวอร์ชันแอป และรหัสนิรนามที่ RevenueCat สร้างขึ้นเมื่อเปิดแอป (แม้ยังไม่ได้ล็อกอิน) รวมทั้งบันทึกการเข้าสู่ระบบของผู้ให้บริการยืนยันตัวตน ใช้เพื่อความปลอดภัย การป้องกันการฉ้อโกง และตรวจสอบการซื้อ ไม่ใช้เพื่อระบุตำแหน่งหรือโฆษณา\nเราไม่เก็บรูปภาพ วิดีโอ ตำแหน่ง รายชื่อผู้ติดต่อ หรือข้อมูลบัตรชำระเงิน',
        },
        {
          heading: 'ฐานทางกฎหมายและความยินยอม',
          body: 'เราประมวลผลข้อมูลของคุณตามฐานทางกฎหมายดังนี้\n• การปฏิบัติตามสัญญา: สร้างและดูแลบัญชี ตรวจสอบสิทธิ์การสมัครสมาชิก และซิงก์ข้อมูลข้ามอุปกรณ์ของคุณ\n• ความยินยอมโดยชัดแจ้ง: ข้อมูลที่เกี่ยวกับสุขภาพและร่างกายซึ่งคุณเลือกกรอกเอง (เพศ อายุ ส่วนสูง น้ำหนัก แคลอรี่ ผลและประวัติการฝึก) ซึ่งอาจเป็นข้อมูลอ่อนไหวตามกฎหมาย คุณให้ความยินยอมนี้เมื่อกด “ดำเนินการต่อ” ในหน้าล็อกอิน (ข้อความหน้าล็อกอินระบุไว้ชัดเจน) และเราประมวลผลและซิงก์ข้อมูลเหล่านี้ขึ้นคลาวด์โดยอาศัยความยินยอมนั้น คุณไม่ต้องกรอกข้อมูลสุขภาพและร่างกายเลยก็ได้ คุณถอนความยินยอมได้ทุกเมื่อโดยลบบัญชีและข้อมูลในแอป หรือขอทางอีเมลตามช่องทางติดต่อด้านล่าง การถอนความยินยอมไม่กระทบการประมวลผลที่ทำไปก่อนถอน\n• ประโยชน์โดยชอบด้วยกฎหมาย: รักษาความปลอดภัยของบริการและป้องกันการประมวลผลเหตุการณ์การสมัครสมาชิกซ้ำ\n• การปฏิบัติตามกฎหมาย: เมื่อกฎหมายกำหนด',
        },
        {
          heading: 'เราใช้ข้อมูลเพื่ออะไร',
          body: 'เพื่อแสดงแผนการฝึกของวันนี้ คำนวณเป้าหมาย (BMR/TDEE/สารอาหาร/แคลอรี่) แสดงสถิติ ซิงก์ข้อมูลระหว่างอุปกรณ์ของคุณ และตรวจสอบสิทธิ์การใช้งานตามการสมัครสมาชิก\nการให้อีเมล (ผ่านบัญชี Google หรือ Apple) จำเป็นต่อการสร้างบัญชีและการซื้อ หากไม่ให้ เราจะให้บริการแบบมีบัญชีไม่ได้ ส่วนข้อมูลโปรไฟล์และบันทึกรายวันเป็นทางเลือก หากไม่กรอก ฟีเจอร์คำนวณเป้าหมายอาจแสดงผลไม่ได้ เราไม่ใช้การตัดสินใจอัตโนมัติที่มีผลทางกฎหมายหรือกระทบคุณอย่างมีนัยสำคัญ ค่าที่แอปคำนวณเป็นเพียงการประมาณ และสิทธิ์ใช้งานฟีเจอร์ขึ้นอยู่กับสถานะการสมัครสมาชิกที่สโตร์รายงานเท่านั้น',
        },
        {
          heading: 'การจัดเก็บและการซิงก์',
          body: 'ข้อมูลถูกบันทึกในเครื่องของคุณก่อนเสมอ และเมื่อคุณมีสิทธิ์ใช้งาน จะซิงก์ไปยังฐานข้อมูลบนคลาวด์ (Supabase) ซึ่งตั้งสิทธิ์ระดับแถว (Row Level Security) ให้ผู้ใช้อ่านและแก้ไขได้เฉพาะข้อมูลของบัญชีตนเอง การส่งข้อมูลระหว่างแอปกับเซิร์ฟเวอร์เข้ารหัสด้วย HTTPS/TLS และเราเข้าถึงข้อมูลของคุณเท่าที่จำเป็นต่อการให้บริการและแก้ปัญหาเท่านั้น โทเค็นการล็อกอินถูกเก็บในพื้นที่เข้ารหัสของระบบ (Keychain/Keystore) ไม่มีระบบใดปลอดภัยโดยสมบูรณ์ และข้อมูลที่อยู่ในเครื่องของคุณได้รับการปกป้องตามการตั้งค่าความปลอดภัยของอุปกรณ์คุณ\nการออกจากระบบไม่ลบข้อมูลในเครื่อง การลบบัญชีหรือถอนการติดตั้งแอปจะลบข้อมูลในเครื่องนั้น หากล็อกอินด้วย Google คุณถอนสิทธิ์ของแอปได้ในการตั้งค่าความปลอดภัยของบัญชี Google โปรดอย่าใส่ข้อมูลอ่อนไหวในชื่อหรือบันทึกที่คุณพิมพ์เอง',
        },
        {
          heading: 'ผู้ให้บริการภายนอก',
          body: '• Google / Apple: ยืนยันตัวตนตอนล็อกอิน\n• Supabase: บัญชีผู้ใช้และฐานข้อมูลคลาวด์\n• RevenueCat: ตรวจสอบการซื้อและสถานะการสมัครสมาชิก โดยใช้รหัสนิรนามก่อนล็อกอินและรหัสผู้ใช้ของบัญชีคุณหลังล็อกอิน\n• Apple App Store / Google Play: ดำเนินการชำระเงิน การทดลองใช้ฟรี และการยกเลิก\nSupabase และ RevenueCat ประมวลผลข้อมูลแทนเราเพื่อให้บริการแอปเท่านั้น และต้องให้การคุ้มครองข้อมูลในระดับเท่ากับที่ระบุในนโยบายนี้ตามสัญญา ส่วน Google และ Apple เป็นผู้ควบคุมข้อมูลของบัญชีและการชำระเงินของตนเองตามนโยบายของแต่ละราย เราไม่ขายข้อมูลส่วนบุคคลของคุณ ไม่แบ่งปันเพื่อการโฆษณาตามพฤติกรรมข้ามบริการ และไม่เปิดเผยข้อมูลของคุณแก่ผู้อื่นนอกจากผู้ให้บริการข้างต้น หรือเมื่อกฎหมายหรือคำสั่งของหน่วยงานรัฐที่มีอำนาจกำหนด',
        },
        {
          heading: 'การโอนข้อมูลไปต่างประเทศ',
          body: 'ผู้ให้บริการของเรา (Supabase, RevenueCat, Apple, Google) อาจจัดเก็บและประมวลผลข้อมูลของคุณบนเซิร์ฟเวอร์นอกประเทศไทยและนอกประเทศที่คุณอยู่ เช่น สหรัฐอเมริกาและภูมิภาคที่เราเลือกใช้สำหรับ Supabase เมื่อมีการโอนข้อมูลออกนอกประเทศ เราจะดำเนินการให้ปลายทางมีมาตรการคุ้มครองข้อมูลที่เหมาะสมตามกฎหมาย เช่น ข้อสัญญามาตรฐาน (standard contractual clauses) หรือความยินยอมของคุณ',
        },
        {
          heading: 'ข้อมูลสุขภาพและคำเตือน',
          body: 'ค่าที่แอปคำนวณเป็นเพียงการประมาณและคำแนะนำทั่วไป ไม่ใช่คำแนะนำทางการแพทย์ แอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัยหรือรักษาโรค เราไม่ใช้ข้อมูลของคุณเพื่อโฆษณาและไม่ส่งต่อให้บริษัทประกันหรือนายหน้าข้อมูล',
        },
        {
          heading: 'การเก็บรักษาและการลบข้อมูล',
          body: 'เราเก็บข้อมูลไว้ตราบที่คุณยังมีบัญชี คุณลบบัญชีและข้อมูลทั้งหมดได้เองในแอป (บัญชี → ลบบัญชีและข้อมูล) เมื่อลบบัญชี:\n• ข้อมูลบนคลาวด์ถูกลบ รวมถึงบันทึกเหตุการณ์การสมัครสมาชิกของคุณและเราขอให้ RevenueCat ลบระเบียนลูกค้าของคุณ (หากไม่สำเร็จ ขอให้ติดต่อเราเพื่อดำเนินการให้)\n• ข้อมูลบนเครื่องที่คุณลบบัญชีถูกลบ เครื่องอื่นที่เคยล็อกอินอาจยังมีสำเนาข้อมูลในเครื่องจนกว่าคุณจะลบแอปบนเครื่องนั้น\n• ถ้าล็อกอินด้วย Apple บน iPhone/iPad เราจะขอให้ Apple เพิกถอนการเชื่อมต่อให้ หากคุณล็อกอินด้วย Apple แล้วการเพิกถอนไม่สำเร็จ หรือคุณใช้ Android ให้ถอนสิทธิ์ของ Fitnese เองในการตั้งค่า Apple ID (ลงชื่อเข้าใช้ด้วย Apple) ที่ appleid.apple.com\n• การลบบัญชีไม่ยกเลิกการสมัครสมาชิกในสโตร์ ยกเลิกได้ในการตั้งค่าบัญชีสโตร์\nข้อมูลที่คุณลบทีละรายการในแอป (เช่น เซสชันหรือโปรแกรม) จะถูกทำเครื่องหมายว่าลบและไม่แสดงอีก แต่อาจยังอยู่ในระบบของเราจนกว่าคุณจะลบบัญชีทั้งหมด ถ้าสิทธิ์ใช้งานหมดอายุ ข้อมูลบนคลาวด์จะยังอยู่แต่ซิงก์ไม่ได้จนกว่าจะสมัครใหม่ สำเนาสำรองของผู้ให้บริการอาจเก็บข้อมูลที่ลบแล้วไว้อีกช่วงหนึ่งตามนโยบายของผู้ให้บริการนั้น และบันทึกการซื้อที่ Apple หรือ Google เก็บไว้เป็นไปตามนโยบายของสโตร์นั้น\nบันทึกเหตุการณ์การสมัครสมาชิกที่ใช้ป้องกันการประมวลผลซ้ำ (มีรหัสผู้ใช้ ประเภทเหตุการณ์ และเวลา ไม่มีรายละเอียดการชำระเงิน) ถูกลบอัตโนมัติเมื่อเก่ากว่า 90 วัน (การลบทำเมื่อระบบประมวลผลเหตุการณ์สมัครสมาชิกครั้งถัดไป โดยปกติไม่นานหลังครบ 90 วัน)\nหากคุณไม่สามารถเปิดแอปได้หรือถอนการติดตั้งแล้ว ขอให้ลบบัญชีและข้อมูลได้โดยส่งอีเมลถึงช่องทางติดต่อด้านล่างจากอีเมลที่ใช้ล็อกอิน (หัวข้ออีเมล: ลบบัญชี) เราจะยืนยันตัวตนและดำเนินการลบให้ภายใน 30 วัน',
        },
        {
          heading: 'สิทธิ์ของคุณ',
          body: 'คุณมีสิทธิ์ขอเข้าถึงและขอรับสำเนาข้อมูล แก้ไขให้ถูกต้อง ลบหรือทำลาย ระงับการใช้ คัดค้านการประมวลผล และขอรับข้อมูลในรูปแบบที่อ่านด้วยเครื่องได้ รวมทั้งถอนความยินยอมได้ทุกเมื่อ (เช่น โดยลบบัญชีและข้อมูลในแอป) การถอนความยินยอมไม่กระทบการประมวลผลที่ทำไปก่อนหน้า\n• ทำเองในแอป: แก้ไขข้อมูลส่วนใหญ่ได้เอง ส่งออกประวัติการฝึกและบันทึกรายวันเป็นไฟล์ CSV ได้ที่ ตั้งค่า → ส่งออก CSV (ขณะที่สิทธิ์ใช้งานยังไม่หมด) และลบบัญชีกับข้อมูลได้เสมอที่ บัญชี → ลบบัญชีและข้อมูล\n• ทางอีเมล: ส่งคำขอถึงช่องทางติดต่อด้านล่างจากอีเมลที่ใช้ล็อกอิน เพื่อขอสำเนาข้อมูลอื่นทั้งหมด เช่น โปรไฟล์และโปรแกรม หรือใช้สิทธิ์อื่นข้างต้น ซึ่งใช้ได้แม้คุณถอนการติดตั้งแอปแล้ว\nเราจะตอบภายใน 30 วันนับแต่ได้รับคำขอ โดยไม่เสียค่าใช้จ่าย หากเห็นว่าเราไม่ปฏิบัติตามกฎหมายคุ้มครองข้อมูล คุณมีสิทธิ์ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ของประเทศไทย หรือหน่วยงานกำกับดูแลในประเทศที่คุณอยู่',
        },
        {
          heading: 'เด็กและผู้เยาว์',
          body: 'แอปไม่ได้มุ่งให้เด็กอายุต่ำกว่า 13 ปีใช้งาน เราไม่เก็บข้อมูลของเด็กอายุต่ำกว่า 13 ปีโดยเจตนา หากพบว่ามี เราจะลบข้อมูลนั้น ผู้ใช้ที่ยังไม่บรรลุนิติภาวะ หรืออายุต่ำกว่าเกณฑ์ที่กฎหมายที่ใช้กับคุณกำหนดให้ให้ความยินยอมเองได้ ต้องได้รับความยินยอมจากผู้ปกครองก่อนใช้แอป ผู้ปกครองขอให้ลบข้อมูลของบุตรหลานได้ทางช่องทางติดต่อด้านล่าง สำหรับผู้ใช้อายุต่ำกว่า 18 ปีที่กรอกอายุ แอปจะไม่แสดงเป้าหมายการลดน้ำหนัก',
        },
        {
          heading: 'ผู้อยู่อาศัยในรัฐแคลิฟอร์เนีย',
          body: 'เราเก็บข้อมูลประเภทตัวระบุ (รหัสผู้ใช้ อีเมล) ข้อมูลทางพาณิชย์ (สถานะการสมัครสมาชิก) และข้อมูลส่วนบุคคลที่อ่อนไหวเกี่ยวกับสุขภาพที่คุณกรอกเอง ตามวัตถุประสงค์ที่ระบุข้างต้น เราไม่ขายหรือแบ่งปันข้อมูลส่วนบุคคลเพื่อการโฆษณาตามพฤติกรรมข้ามบริการ และใช้ข้อมูลที่อ่อนไหวเพื่อให้บริการที่คุณร้องขอเท่านั้น คุณมีสิทธิ์ขอทราบ ลบ และแก้ไขข้อมูล และจะไม่ถูกเลือกปฏิบัติเมื่อใช้สิทธิ์ ส่งคำขอทางอีเมลตามช่องทางติดต่อ ผู้แทนที่ได้รับอนุญาตส่งคำขอแทนได้',
        },
        {
          heading: 'การเปลี่ยนแปลงนโยบาย',
          body: 'หากมีการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งในแอปหรือหน้าสโตร์ก่อนมีผล หากเราเปลี่ยนวัตถุประสงค์ในการใช้ข้อมูล เราจะขอความยินยอมใหม่เมื่อกฎหมายกำหนด',
        },
        {
          heading: 'ติดต่อ',
          body: `ติดต่อเรื่องข้อมูลส่วนบุคคลและการใช้สิทธิ์ของเจ้าของข้อมูล:\n${contactBlock()}\nหากเรามีเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลหรือตัวแทนในสหภาพยุโรป/สหราชอาณาจักร จะระบุไว้ที่นี่`,
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: `Effective ${EFFECTIVE.en}`,
      sections: [
        {
          heading: 'In short',
          body: 'Fitnese collects only what it needs to plan and log your training. No ads, no analytics or crash-reporting SDKs, no cross-app tracking, and we never sell your data.',
        },
        {
          heading: 'What we collect',
          body: '• Account: your user ID and email (or Apple’s private relay email) from the Google or Apple account you sign in with, plus the name and profile picture your sign-in provider may send, which our authentication provider (Supabase) may store with your account but the app does not use or display\n• Profile and settings you enter (optional): sex, age, height, weight, activity level, goal, preferred units and settings such as the rest timer\n• Training data: programs, weekly plan, routines, exercises (including custom exercises and notes you type), sets, weights, reps, body weight at workout time, workout times, intensity and calculated calories\n• Daily entries you type in: calories burned/eaten and body weight\n• Subscription status (trial/monthly/lifetime and expiry) from the App Store or Google Play via RevenueCat\n• Technical data: IP address, device and operating-system type, app version, and an anonymous ID that RevenueCat creates when the app opens (even before you sign in), plus sign-in logs kept by our authentication provider, used for security, fraud prevention and purchase validation, not to locate you or for advertising\nWe do not collect photos, videos, location, contacts or payment card details.',
        },
        {
          heading: 'Legal bases and consent',
          body: 'We process your data on these legal bases:\n• Contract: to create and run your account, check your subscription access and sync your data between your devices.\n• Explicit consent: health and body-related information you choose to enter (sex, age, height, weight, calories, workout results and history), which may be sensitive data under the law. You give this consent by choosing “Continue” on the sign-in screen (the sign-in screen says so), and we process and sync this data to the cloud based on that consent. You do not have to enter any health or body information at all. You can withdraw consent at any time by deleting your account and data in the app, or by asking us by email at the contact below. Withdrawing consent does not affect processing done before withdrawal.\n• Legitimate interests: keeping the service secure and avoiding duplicate processing of subscription events.\n• Legal obligation: where the law requires it.',
        },
        {
          heading: 'How we use it',
          body: 'To show today’s plan, calculate targets (BMR/TDEE/macros/calories), show your stats, sync between your devices, and check access according to your subscription.\nProviding an email (through your Google or Apple account) is necessary to create an account and buy; without it we cannot offer an account-based service. Profile and daily-log data is optional, and without it the target calculators may not show results. We do not use automated decisions that have legal or similarly significant effects on you. Values the app calculates are estimates only, and access to features depends only on the subscription status reported by the store.',
        },
        {
          heading: 'Storage and sync',
          body: 'Data is always saved on your device first. While you have access, it syncs to a cloud database (Supabase) configured with Row Level Security so users can read and change only their own account’s data. Data between the app and our servers is encrypted with HTTPS/TLS, and we access your data only as needed to run the service and fix problems. Sign-in tokens are kept in the system’s encrypted storage (Keychain/Keystore). No system is perfectly secure, and data on your device is protected by your device’s own security settings.\nSigning out does not delete data on your device. Deleting your account or uninstalling the app removes the local data on that device. If you signed in with Google you can remove the app’s access in your Google Account security settings. Please do not put sensitive information in names or notes you type yourself.',
        },
        {
          heading: 'Service providers',
          body: '• Google / Apple: sign-in\n• Supabase: accounts and cloud database\n• RevenueCat: purchase validation and subscription status, using an anonymous ID before sign-in and your account ID after sign-in\n• Apple App Store / Google Play: payments, free trials and cancellations\nSupabase and RevenueCat process data on our behalf only to run the app and are contractually required to give your data the same level of protection described in this policy. Google and Apple act as independent controllers for their own sign-in, account and payment services under their own policies. We do not sell your personal data, do not share it for cross-context behavioural advertising, and do not disclose it to anyone other than the providers above, except where the law or a competent authority requires.',
        },
        {
          heading: 'International transfers',
          body: 'Our providers (Supabase, RevenueCat, Apple and Google) may store and process your data on servers outside Thailand and outside your country, such as the United States and the region we select for Supabase. When data is transferred abroad, we make sure the recipient applies appropriate safeguards as required by law, such as standard contractual clauses, or we rely on your consent.',
        },
        {
          heading: 'Health information and disclaimer',
          body: 'Values calculated by the app are estimates and general guidance, not medical advice. The app is not a medical device and does not diagnose or treat any condition. We don’t use your data for advertising and don’t share it with insurers or data brokers.',
        },
        {
          heading: 'Retention and deletion',
          body: 'We keep your data while your account exists. You can delete your account and all data in the app (Account → Delete account and data). When you do:\n• Cloud data is deleted, including your subscription event records and we ask RevenueCat to delete your customer record (if that fails, contact us and we will follow up)\n• Data on the device where you delete is cleared. Other devices you signed in on may keep a local copy until you remove the app on that device\n• If you signed in with Apple on an iPhone or iPad, we ask Apple to revoke the Sign in with Apple connection for you. If you signed in with Apple and the revocation fails, or you are on Android, revoke Fitnese’s access yourself in your Apple ID settings (Sign in with Apple) at appleid.apple.com\n• Deleting your account does not cancel a store subscription; cancel it in your store account settings\nItems you delete one by one in the app (for example a session or program) are marked deleted and no longer shown, but may remain in our systems until you delete your whole account. If your access expires, your cloud data stays but cannot sync until you subscribe again. Our providers’ backups may keep deleted data for a limited period under their own policies, and purchase records held by Apple or Google follow that store’s policy.\nSubscription event records, which are used only to ignore duplicate notifications (they hold your user ID, event type and time, and no payment details), are deleted automatically once they are older than 90 days (removal happens the next time subscription events are processed, normally soon after 90 days).\nIf you can no longer open the app or have uninstalled it, you can ask us to delete your account and data by emailing the contact below from the address you sign in with (subject: Delete account). We will verify your identity and complete the deletion within 30 days.',
        },
        {
          heading: 'Your rights',
          body: 'You have the right to access and receive a copy of your data, correct it, delete it, restrict its use, object to processing, and receive it in a machine-readable format, and you may withdraw consent at any time (for example by deleting your account and data in the app). Withdrawing consent does not affect processing done before.\n• In the app: you can edit most of your data yourself, export your workouts and daily log as CSV files (Settings → Export CSV, while your access is active), and always delete your account and data (Account → Delete account and data).\n• By email: send a request to the contact below from the address you sign in with to get a copy of everything else, such as your profile and programs, or to use the other rights above. This also works if you have uninstalled the app.\nWe reply within 30 days of receiving the request, free of charge. If you believe we do not comply with data protection law, you have the right to complain to the Personal Data Protection Committee (PDPC) of Thailand or to the supervisory authority in your country.',
        },
        {
          heading: 'Children and minors',
          body: 'The app is not directed to children under 13. We do not knowingly collect data from children under 13 and will delete it if we learn we have. Users who are minors, or below the age at which the law that applies to them lets them consent on their own, need a parent or guardian’s consent to use the app. Parents may ask us to delete a child’s data through the contact below. For users under 18 who enter their age, the app does not show weight-loss targets.',
        },
        {
          heading: 'California residents',
          body: 'We collect identifiers (user ID, email), commercial information (subscription status) and sensitive personal information about health that you enter yourself, for the purposes above. We do not sell or share personal information for cross-context behavioural advertising, and we use sensitive information only to provide the service you request. You have the right to know, delete and correct your information, and will not be discriminated against for using these rights. Send requests by email to the contact below. An authorised agent may submit a request for you.',
        },
        {
          heading: 'Changes',
          body: 'We’ll announce material changes in the app or on the store page before they take effect. If we change the purposes for which we use your data, we will ask for your consent again where the law requires.',
        },
        {
          heading: 'Contact',
          body: `Contact for personal data matters and exercising your rights:\n${contactBlock()}\nIf we appoint a data protection officer or an EU/UK representative, they will be listed here.`,
        },
      ],
    },
  },
  terms: {
    th: {
      title: 'ข้อกำหนดการใช้งาน',
      updated: `มีผลตั้งแต่ ${EFFECTIVE.th}`,
      sections: [
        {
          heading: 'การยอมรับข้อกำหนด',
          body: 'เมื่อใช้ Fitnese ถือว่าคุณยอมรับข้อกำหนดนี้ และยินยอมตามนโยบายความเป็นส่วนตัว',
        },
        {
          heading: 'บัญชี',
          body: 'คุณต้องล็อกอินด้วย Google หรือ Apple ก่อนเริ่มทดลองใช้หรือซื้อ เพื่อให้สิทธิ์ใช้งานผูกกับบัญชีและใช้ได้ข้ามอุปกรณ์ คุณรับผิดชอบการรักษาความปลอดภัยของบัญชีที่ใช้ล็อกอิน\nคุณต้องมีอายุอย่างน้อย 13 ปีจึงจะใช้แอปได้ และต้องมีอายุตามที่กฎหมายที่ใช้กับคุณกำหนดจึงจะทำสัญญาซื้อการสมัครสมาชิกได้ หากคุณอายุต่ำกว่านั้น ต้องได้รับความยินยอมและการชำระเงินจากผู้ปกครองหรือผู้ดูแลที่เป็นเจ้าของบัญชีสโตร์ สำหรับผู้ใช้อายุต่ำกว่า 18 ปีที่กรอกอายุ แอปจะไม่แสดงเป้าหมายการลดน้ำหนัก',
        },
        {
          heading: 'สมาชิกและการชำระเงิน',
          body: '• การชำระเงินทั้งหมดดำเนินการและเรียกเก็บโดย Apple หรือ Google ผ่านบัญชีสโตร์ของคุณ เมื่อคุณยืนยันการซื้อหรือเมื่อสิ้นสุดช่วงทดลอง เราไม่เห็นหรือเก็บข้อมูลบัตรของคุณ ราคาเป็นราคาที่สโตร์แสดงก่อนซื้อ อาจต่างกันตามประเทศและอาจรวมภาษี\n• รายเดือน: ต่ออายุอัตโนมัติทุกเดือนจนกว่าคุณจะยกเลิก และเรียกเก็บค่าต่ออายุก่อนสิ้นสุดรอบบิลปัจจุบันไม่นาน ผู้มีสิทธิ์จะได้ทดลองใช้ฟรีก่อน (ปัจจุบัน 7 วัน ตามข้อเสนอของสโตร์ โดยทั่วไปครั้งเดียวต่อบัญชีสโตร์) จากนั้นเรียกเก็บตามราคาที่แสดงบนหน้าจอซื้อ หากมีการเปลี่ยนราคา สโตร์จะแจ้งและขอความยินยอมตามกฎของสโตร์\n• ยกเลิกได้ทุกเมื่อในการตั้งค่าบัญชี App Store หรือ Google Play หากไม่ต้องการให้ต่ออายุหรือไม่ต้องการถูกเรียกเก็บเงินหลังช่วงทดลอง ต้องยกเลิกอย่างน้อย 24 ชั่วโมงก่อนสิ้นสุดช่วงทดลองหรือรอบบิลปัจจุบัน หลังยกเลิกคุณยังใช้งานได้จนสิ้นสุดช่วงทดลองหรือรอบบิลที่ชำระแล้ว\n• ซื้อขาด: ชำระครั้งเดียว ไม่มีช่วงทดลอง ปลดล็อกทุกฟีเจอร์ตราบที่ผู้พัฒนายังให้บริการแอป (ไม่ใช่ตลอดชีวิตของคุณ) ผูกกับบัญชีที่ล็อกอินและกู้คืนได้ด้วย “กู้คืนการซื้อ” โอนให้ผู้อื่นไม่ได้ หากผู้พัฒนาจะยุติการให้บริการแอป จะแจ้งล่วงหน้าตามสมควร การซื้อขาดไม่ยกเลิกการสมัครรายเดือนหรือช่วงทดลองที่มีอยู่ โปรดยกเลิกเองเพื่อไม่ให้ถูกเรียกเก็บเงิน\n• หากการชำระเงินไม่สำเร็จ สโตร์อาจให้ช่วงผ่อนผันก่อนที่สิทธิ์จะถูกพัก คุณแก้ไขได้ที่วิธีชำระเงินในบัญชีสโตร์\n• Apple หรือ Google เป็นผู้ขายและผู้ดำเนินการชำระเงิน ผู้พัฒนาไม่สามารถคืนเงิน ยกเลิกการเรียกเก็บ หรือเข้าถึงข้อมูลบัตรของคุณได้โดยตรง การขอคืนเงินให้ดำเนินการกับ Apple (reportaproblem.apple.com) หรือ Google Play ตามนโยบายของสโตร์นั้น ทั้งนี้ไม่กระทบสิทธิของผู้บริโภคตามกฎหมาย\n• เมื่อสิทธิ์หมด ฟีเจอร์ทั้งหมดรวมถึงการดูและส่งออกข้อมูลจะถูกล็อก แต่ข้อมูลของคุณยังถูกเก็บไว้ในเครื่องและบัญชีของคุณ และกลับมาครบเมื่อคุณสมัครใหม่ คุณยังลบบัญชีและข้อมูลได้เสมอ การซิงก์ข้ามอุปกรณ์ทำงานเฉพาะเมื่อมีสิทธิ์ใช้งาน แนะนำให้ส่งออก CSV ก่อนสิทธิ์หมด',
        },
        {
          heading: 'ไม่ใช่คำแนะนำทางการแพทย์',
          body: 'เนื้อหา สูตร และค่าที่คำนวณในแอป (เช่น BMR, TDEE, แคลอรี่, สารอาหาร, 1RM) เป็นค่าประมาณและข้อมูลทั่วไปเพื่อการออกกำลังกาย ซึ่งอาจไม่ตรงกับร่างกายของคุณ ไม่ใช่คำแนะนำทางการแพทย์หรือโภชนาการเฉพาะบุคคล แอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัย รักษา หรือป้องกันโรค ปรึกษาแพทย์ก่อนเริ่มโปรแกรมออกกำลังกายหรือเปลี่ยนอาหาร โดยเฉพาะหากมีโรคประจำตัว ตั้งครรภ์ หรืออายุต่ำกว่า 18 ปี (สำหรับผู้ใช้อายุต่ำกว่า 18 ปีที่กรอกอายุ แอปจะไม่แสดงเป้าหมายลดน้ำหนัก) หยุดออกกำลังกายและขอความช่วยเหลือทางการแพทย์หากเจ็บ เวียนศีรษะ หรือไม่สบาย แอปไม่เหมาะกับการใช้ในภาวะฉุกเฉิน คุณออกกำลังกายด้วยความระมัดระวังและความรับผิดชอบของตนเอง',
        },
        {
          heading: 'การใช้งานที่เหมาะสม',
          body: 'ห้ามใช้แอปในทางที่ผิดกฎหมาย พยายามเข้าถึงข้อมูลหรือบัญชีของผู้อื่น หลีกเลี่ยงหรือแก้ไขการตรวจสิทธิ์การใช้งานหรือการชำระเงิน ใช้ระบบอัตโนมัติหรือสคริปต์เข้าถึงบริการ ขายต่อหรือแบ่งปันบัญชี หรือรบกวนการทำงานของระบบ',
        },
        {
          heading: 'การยุติการใช้งานและการลบบัญชี',
          body: 'คุณลบบัญชีและข้อมูลได้เองในแอป (บัญชี → ลบบัญชีและข้อมูล) การลบบัญชีหรือการถอนการติดตั้งแอปไม่ยกเลิกการสมัครสมาชิกในสโตร์และไม่ทำให้ได้เงินคืนอัตโนมัติ คุณต้องยกเลิกเองในการตั้งค่าบัญชี App Store หรือ Google Play ก่อน ผู้พัฒนาอาจระงับหรือยุติบัญชีที่ละเมิดข้อกำหนดนี้ (เช่น ใช้งานในทางที่ผิดหรือพยายามหลีกเลี่ยงการตรวจสิทธิ์) โดยแจ้งตามสมควรเมื่อทำได้ ข้อกำหนดเรื่องทรัพย์สินทางปัญญา ข้อจำกัดความรับผิด และกฎหมายที่ใช้บังคับยังคงมีผลหลังการยุติ',
        },
        {
          heading: 'สิทธิ์การใช้แอปและข้อกำหนดของสโตร์',
          body: 'ผู้พัฒนาให้สิทธิ์คุณใช้แอปแบบจำกัด ไม่เฉพาะเจาะจง โอนไม่ได้ และเพิกถอนได้ เพื่อใช้ส่วนตัวบนอุปกรณ์ที่คุณเป็นเจ้าของหรือควบคุม ห้ามคัดลอก ดัดแปลง ถอดรหัสหรือวิศวกรรมย้อนกลับ ขาย ให้เช่า หรือแจกจ่ายต่อ ข้อกำหนดนี้เป็นข้อตกลงระหว่างคุณกับผู้พัฒนาเท่านั้น ไม่ใช่กับ Apple หรือ Google ผู้พัฒนารับผิดชอบแอป เนื้อหา การสนับสนุน และการรับประกันตามที่กฎหมายกำหนด Apple และ Google ไม่มีหน้าที่ให้การสนับสนุนหรือบำรุงรักษาแอป และไม่รับผิดต่อข้อเรียกร้องเกี่ยวกับแอป แต่ Apple และบริษัทย่อยของ Apple เป็นผู้รับประโยชน์บุคคลที่สามของข้อกำหนดนี้ และอาจบังคับใช้กับคุณได้ ข้อตกลงมาตรฐานของ Apple (Licensed Application End User License Agreement) และข้อกำหนดของ Google Play ยังใช้บังคับควบคู่กัน หากขัดแย้งกัน ให้ใช้ข้อกำหนดที่คุ้มครองผู้บริโภคมากกว่า คุณยืนยันว่าไม่อยู่ในประเทศที่ถูกคว่ำบาตรหรือห้ามส่งออก และไม่ได้อยู่ในรายชื่อบุคคลต้องห้าม',
        },
        {
          heading: 'ทรัพย์สินทางปัญญา',
          body: 'แอป ข้อความอธิบายท่า และเทมเพลตเป็นของผู้พัฒนา ข้อมูลที่คุณบันทึกเป็นของคุณ',
        },
        {
          heading: 'การไม่รับประกัน',
          body: 'แอปให้บริการ “ตามสภาพ” และ “ตามที่มี” ผู้พัฒนาไม่รับประกันว่าแอปจะทำงานต่อเนื่องหรือไม่มีข้อผิดพลาด หรือว่าค่าที่คำนวณถูกต้องสำหรับคุณ การซิงก์ต้องใช้อินเทอร์เน็ตและเป็นฟีเจอร์ที่ต้องมีสิทธิ์ใช้งาน ขณะที่สิทธิ์ใช้งานยังมีผล คุณส่งออกการฝึกและบันทึกรายวันเป็น CSV ได้ แต่ไม่ใช่การสำรองข้อมูลทั้งหมด',
        },
        {
          heading: 'ข้อจำกัดความรับผิด',
          body: 'ภายใต้ขอบเขตที่กฎหมายอนุญาต ผู้พัฒนาไม่รับผิดต่อความเสียหายทางอ้อมหรือต่อเนื่อง หรือการสูญเสียข้อมูล ที่เกิดจากการใช้แอปหรือข้อมูลในแอป ข้อกำหนดนี้ไม่ตัดหรือจำกัดความรับผิดที่กฎหมายไม่อนุญาตให้ตัดหรือจำกัด รวมถึงความรับผิดต่อความตายหรือการบาดเจ็บทางร่างกายที่เกิดจากความจงใจหรือประมาทเลินเล่อของผู้พัฒนา หรือสิทธิของผู้บริโภคตามกฎหมาย',
        },
        {
          heading: 'การเปลี่ยนแปลงข้อกำหนด',
          body: 'เราอาจปรับข้อกำหนดนี้ หากเป็นการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งในแอปหรือหน้าสโตร์ล่วงหน้าก่อนมีผล การใช้แอปต่อหลังวันที่มีผลถือว่ายอมรับข้อกำหนดที่แก้ไข หากไม่ยอมรับ ให้หยุดใช้และยกเลิกการสมัครสมาชิกในสโตร์ การเปลี่ยนราคาเป็นไปตามกระบวนการแจ้งและขอความยินยอมของสโตร์',
        },
        {
          heading: 'กฎหมายที่ใช้บังคับ',
          body: `ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทที่เกี่ยวข้องให้อยู่ในเขตอำนาจของศาลที่มีเขตอำนาจในกรุงเทพมหานคร โดยไม่กระทบสิทธิของผู้บริโภคตามกฎหมายคุ้มครองผู้บริโภคที่บังคับใช้ในประเทศที่คุณอาศัยอยู่ (รวมถึงสิทธิฟ้องคดีต่อศาลในภูมิลำเนาของคุณ หากกฎหมายนั้นกำหนด) ข้อพิพาทให้พยายามเจรจาโดยติดต่อเราก่อน`,
        },
        {
          heading: 'ติดต่อ',
          body: `${contactBlock()}\nปัญหาการใช้งานหรือบัญชี ติดต่อเราทางอีเมลข้างต้น ส่วนการชำระเงินและการคืนเงินให้ติดต่อ Apple หรือ Google`,
        },
      ],
    },
    en: {
      title: 'Terms of Use',
      updated: `Effective ${EFFECTIVE.en}`,
      sections: [
        {
          heading: 'Agreement',
          body: 'By using Fitnese you accept these Terms and agree to the Privacy Policy.',
        },
        {
          heading: 'Accounts',
          body: 'You must sign in with Google or Apple before starting a trial or purchase, so your access is tied to your account and works across devices. You are responsible for keeping that account secure.\nYou must be at least 13 to use the app, and old enough under the law that applies to you to enter into a subscription contract. If you are younger, a parent or guardian who owns the store account must consent to and pay for your use. For users under 18 who enter their age, the app does not show weight-loss targets.',
        },
        {
          heading: 'Subscriptions and payments',
          body: '• All payments are processed and charged by Apple or Google to your store account when you confirm the purchase or when the free trial ends. We never see or store your card details. Prices shown are the store’s prices, may differ by country and may include taxes.\n• Monthly: renews automatically every month until you cancel, and the renewal is charged shortly before the current billing period ends. Eligible users get a free trial first (currently 7 days, as offered by the store, generally once per store account), then are charged the price shown on the purchase screen. If the price changes, the store will notify you and ask for consent as its rules require.\n• Cancel anytime in your App Store or Google Play account settings. To avoid renewal, or to avoid being charged when the free trial ends, cancel at least 24 hours before the end of the trial or current billing period. After you cancel, you keep access until the end of the trial or the billing period you have already paid for.\n• Lifetime: a one-time payment with no free trial. It unlocks all features for as long as the developer offers the app (not for your own lifetime). It is tied to the account you signed in with, can be restored with “Restore purchases”, and cannot be transferred. If the developer decides to discontinue the app, reasonable notice will be given. Buying Lifetime does not cancel an existing monthly subscription or trial; cancel it yourself so you are not charged.\n• If a payment fails, the store may give a grace period before access is paused; fix it in your store payment settings.\n• Apple or Google is the seller and merchant of record. The developer cannot issue refunds, stop charges or see your card details directly. Request refunds from Apple (reportaproblem.apple.com) or Google Play under that store’s policy. This does not affect your statutory consumer rights.\n• When access ends, all features, including viewing and exporting data, are locked, but your data stays on your device and in your account and returns in full when you subscribe again. You can always delete your account and data. Cross-device sync works only while you have access. We recommend exporting a CSV before your access ends.',
        },
        {
          heading: 'Not medical advice',
          body: 'Content, formulas and calculated values (such as BMR, TDEE, calories, macros and 1RM) are estimates and general fitness information, and may not match your body. They are not medical or personalised nutrition advice. The app is not a medical device and does not diagnose, treat or prevent any condition. Consult a doctor before starting an exercise program or changing your diet, especially if you have a medical condition, are pregnant or are under 18 (for users under 18 who enter their age, the app does not show weight-loss targets). Stop exercising and seek medical help if you feel pain, dizziness or unwell. The app is not for emergencies. You exercise at your own risk and responsibility.',
        },
        {
          heading: 'Acceptable use',
          body: 'Do not use the app unlawfully; try to access other users’ data or accounts; bypass or tamper with access or payment checks; use bots or scripts against the service; resell or share your account; or interfere with the service.',
        },
        {
          heading: 'Ending your use and deleting your account',
          body: 'You can delete your account and data yourself in the app (Account → Delete account and data). Deleting your account or uninstalling the app does not cancel your store subscription and does not trigger an automatic refund; you must cancel it first in your App Store or Google Play account settings. The developer may suspend or terminate an account that breaches these Terms (for example misuse, or attempts to bypass access checks), giving reasonable notice where practical. The sections on intellectual property, limitation of liability and governing law survive termination.',
        },
        {
          heading: 'Licence and store terms',
          body: 'The developer grants you a limited, non-exclusive, non-transferable, revocable licence to use the app for personal use on devices you own or control. You may not copy, modify, decompile or reverse engineer, sell, rent or redistribute it. These Terms are between you and the developer only, not Apple or Google. The developer is responsible for the app, its content, support and any warranty required by law. Apple and Google have no obligation to provide support or maintenance and are not liable for claims relating to the app, but Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you. Apple’s standard Licensed Application End User License Agreement and Google Play’s terms also apply; if they conflict, the terms more protective of the consumer apply. You confirm you are not located in an embargoed country or on a prohibited-party list.',
        },
        {
          heading: 'Intellectual property',
          body: 'The app, exercise descriptions and templates belong to the developer. The data you log belongs to you.',
        },
        {
          heading: 'No warranty',
          body: 'The app is provided “as is” and “as available”. The developer does not warrant that it will be uninterrupted or error-free, or that calculated values are accurate for you. Sync needs an internet connection and is a feature available only with active access. While your access is active you can export your workouts and daily log as CSV; this is not a full backup.',
        },
        {
          heading: 'Limitation of liability',
          body: 'To the extent permitted by law, the developer is not liable for indirect or consequential loss or for loss of data arising from use of the app or its information. Nothing in these Terms excludes or limits liability that cannot be excluded or limited by law, including liability for death or personal injury caused by the developer’s intent or negligence, or your statutory consumer rights.',
        },
        {
          heading: 'Changes',
          body: 'We may update these Terms. For material changes we will give advance notice in the app or on the store page before they take effect. Continuing to use the app after the effective date means you accept the updated Terms; if you do not, stop using the app and cancel your subscription in the store. Price changes follow the store’s notice and consent process.',
        },
        {
          heading: 'Governing law',
          body: `These Terms are governed by the laws of Thailand, and any related dispute falls under the jurisdiction of the competent courts in Bangkok, without affecting any mandatory consumer-protection rights in the country where you live (including any right to bring a claim in the courts of your home country where the law gives you one). Please contact us first to try to resolve any dispute.`,
        },
        {
          heading: 'Contact',
          body: `${contactBlock()}\nFor app or account problems, email us above. For billing and refunds, contact Apple or Google.`,
        },
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
