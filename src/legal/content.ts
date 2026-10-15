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
          body: 'Fitnese ทำงานแบบออฟไลน์ ทุกอย่างที่คุณกรอกหรือบันทึกในแอป (โปรไฟล์ ข้อมูลร่างกาย การฝึก และบันทึกรายวัน) เก็บอยู่ในเครื่องของคุณเท่านั้น แอปไม่มีบัญชีผู้ใช้หรือการล็อกอิน เราไม่มีเซิร์ฟเวอร์หรือฐานข้อมูลคลาวด์ของเราเอง และเราไม่สามารถเห็นหรือเข้าถึงข้อมูลเหล่านี้ได้ แอปไม่มีโฆษณา ไม่มี SDK วิเคราะห์การใช้งานหรือรายงานข้อขัดข้อง ไม่ติดตามข้ามแอป และเราไม่ขายข้อมูล ข้อมูลที่ออกจากเครื่องมีเฉพาะข้อมูลการซื้อ ซึ่ง Apple หรือ Google และ RevenueCat ประมวลผลตามที่อธิบายด้านล่าง',
        },
        {
          heading: 'ข้อมูลที่อยู่ในเครื่องของคุณเท่านั้น',
          body: 'ข้อมูลต่อไปนี้ถูกบันทึกในพื้นที่ส่วนตัวของแอปบนเครื่องของคุณ และไม่ถูกส่งมาให้เราหรือผู้อื่น:\n• โปรไฟล์และการตั้งค่าที่คุณกรอกเอง (ไม่บังคับ): เพศ อายุ ส่วนสูง น้ำหนัก ระดับกิจกรรม เป้าหมาย หน่วยที่ใช้ และการตั้งค่า เช่น ตัวจับเวลาพัก\n• ข้อมูลการฝึก: โปรแกรม ตารางรายสัปดาห์ routine ท่า (รวมท่าที่คุณสร้างเองและบันทึกที่คุณพิมพ์) เซ็ต น้ำหนัก จำนวนครั้ง น้ำหนักตัวตอนฝึก เวลาฝึก ความหนัก และแคลอรี่ที่คำนวณ\n• บันทึกรายวันที่คุณกรอกเอง: แคลอรี่ที่ใช้/ที่กิน และน้ำหนักตัว\n• คำตอบขั้นตั้งค่าเริ่มต้น และสำเนาสถานะการสมัครสมาชิกล่าสุด (เพื่อให้ใช้งานได้ขณะออฟไลน์)\nเราไม่มีสำเนาของข้อมูลเหล่านี้ จึงไม่สามารถดู กู้คืน แก้ไข หรือลบข้อมูลให้คุณจากระยะไกลได้ ข้อมูลในเครื่องได้รับการปกป้องตามการตั้งค่าความปลอดภัยของอุปกรณ์คุณ (เช่น รหัสล็อกหน้าจอ) และอาจรวมอยู่ในการสำรองข้อมูลของระบบปฏิบัติการตามที่คุณตั้งค่าไว้ ซึ่งเป็นไปตามนโยบายของ Apple หรือ Google โปรดอย่าใส่ข้อมูลอ่อนไหวในชื่อหรือบันทึกที่คุณพิมพ์เอง',
        },
        {
          heading: 'ข้อมูลที่ออกจากเครื่อง: การซื้อ',
          body: 'การซื้อและช่วงทดลองใช้ฟรีทำผ่าน App Store หรือ Google Play และแอปตรวจสถานะการซื้อผ่าน RevenueCat เมื่อเปิดแอป ซื้อ หรือกู้คืนการซื้อ ข้อมูลที่เกี่ยวข้องมีดังนี้\n• รหัสนิรนาม: SDK ของ RevenueCat สร้างรหัสแบบสุ่มในเครื่องของคุณ ไม่ผูกกับชื่อ อีเมล หรือบัญชีใดของเรา\n• ประวัติการซื้อ: สินค้าที่ซื้อ วันที่ซื้อ สถานะทดลอง/รายเดือน/ซื้อขาด วันหมดอายุ การต่ออายุ การคืนเงิน และข้อมูลธุรกรรมหรือใบเสร็จที่สโตร์ให้มา (รวมประเทศและสกุลเงินของสโตร์)\n• ข้อมูลทางเทคนิคที่จำเป็นต่อการเชื่อมต่อ: ที่อยู่ IP ประเภทอุปกรณ์และระบบปฏิบัติการ และเวอร์ชันแอป ใช้เพื่อตรวจสอบการซื้อและป้องกันการฉ้อโกง ไม่ใช้ระบุตำแหน่งหรือโฆษณา\nเราเห็นข้อมูลการซื้อในระบบของ RevenueCat ได้เฉพาะคู่กับรหัสนิรนามเท่านั้น ไม่เห็นชื่อ อีเมล หรือข้อมูลการฝึกและสุขภาพของคุณ การชำระเงินดำเนินการโดย Apple หรือ Google ตามนโยบายของแต่ละราย เราไม่เห็นและไม่เก็บข้อมูลบัตรชำระเงิน การส่งข้อมูลกับ RevenueCat เข้ารหัสด้วย HTTPS/TLS\nเมื่อคุณเปิดลิงก์ในแอป (เช่น หน้าเว็บนโยบาย แหล่งอ้างอิง หรือหน้าจัดการสมาชิกของสโตร์) เว็บไซต์นั้นเป็นไปตามนโยบายของผู้ให้บริการเว็บไซต์ เราไม่เก็บรูปภาพ วิดีโอ ตำแหน่ง หรือรายชื่อผู้ติดต่อ',
        },
        {
          heading: 'ไฟล์สำรองข้อมูลและไฟล์ส่งออก',
          body: '“สำรองข้อมูล” สร้างไฟล์ (fitnese-backup-….json) ที่มีข้อมูลทั้งหมดของคุณในแอป รวมถึงข้อมูลร่างกายและสุขภาพ ส่วน “ส่งออก CSV” สร้างไฟล์ตารางของการฝึกและบันทึกรายวัน ไฟล์ถูกสร้างในเครื่องแล้วเปิดหน้าแชร์ของระบบ คุณเป็นผู้เลือกว่าจะบันทึกหรือส่งไฟล์ไปที่ใด (เช่น Google Drive, Files, LINE หรืออีเมล) และบริการปลายทางนั้นเป็นไปตามนโยบายของผู้ให้บริการนั้น เราไม่ได้รับสำเนาไฟล์ ไฟล์ไม่ได้เข้ารหัส ผู้ที่ได้ไฟล์ไปจะอ่านข้อมูลได้ โปรดเก็บไว้ในที่ปลอดภัย “กู้คืนจากไฟล์” อ่านไฟล์ที่คุณเลือกในเครื่องและแทนที่ข้อมูลในเครื่องนี้ โดยไม่ส่งไฟล์ไปที่ใด',
        },
        {
          heading: 'ฐานทางกฎหมาย',
          body: '• ข้อมูลที่อยู่ในเครื่อง: แอปประมวลผลบนเครื่องของคุณภายใต้การควบคุมของคุณ เราไม่ได้รับ เก็บ หรือเข้าถึงข้อมูลเหล่านี้ ข้อมูลร่างกายและสุขภาพเป็นทางเลือก คุณไม่ต้องกรอกเลยก็ได้ และลบได้ทุกเมื่อ\n• ข้อมูลการซื้อ: การปฏิบัติตามสัญญา (ให้สิทธิ์ใช้งานตามที่คุณซื้อ และกู้คืนการซื้อ) ประโยชน์โดยชอบด้วยกฎหมาย (ตรวจสอบความถูกต้องของการซื้อ ป้องกันการฉ้อโกง และรักษาความปลอดภัยของบริการ) และการปฏิบัติตามกฎหมาย เมื่อกฎหมายกำหนด',
        },
        {
          heading: 'เราใช้ข้อมูลเพื่ออะไร',
          body: 'แอปใช้ข้อมูลในเครื่องเพื่อแสดงแผนการฝึกของวันนี้ คำนวณเป้าหมาย (BMR/TDEE/สารอาหาร/แคลอรี่) และแสดงสถิติ โดยคำนวณทั้งหมดบนเครื่อง ข้อมูลการซื้อใช้เพื่อตรวจสอบสิทธิ์ใช้งาน กู้คืนการซื้อ แสดงวันสิ้นสุดทดลองหรือวันต่ออายุ และตอบคำถามของคุณเกี่ยวกับการซื้อ หากไม่ให้ข้อมูลการซื้อ (เช่น ไม่ซื้อ) จะใช้ฟีเจอร์ที่ต้องเป็นสมาชิกไม่ได้ ส่วนข้อมูลโปรไฟล์และบันทึกรายวันเป็นทางเลือก หากไม่กรอก ฟีเจอร์คำนวณเป้าหมายอาจแสดงผลไม่ได้ เราไม่ใช้การตัดสินใจอัตโนมัติที่มีผลทางกฎหมายหรือกระทบคุณอย่างมีนัยสำคัญ ค่าที่แอปคำนวณเป็นเพียงการประมาณ และสิทธิ์ใช้งานฟีเจอร์ขึ้นอยู่กับสถานะการซื้อที่สโตร์รายงานเท่านั้น',
        },
        {
          heading: 'ผู้ให้บริการภายนอก',
          body: '• RevenueCat: ตรวจสอบการซื้อและสถานะการสมัครสมาชิกด้วยรหัสนิรนาม\n• Apple App Store / Google Play: ดำเนินการชำระเงิน การทดลองใช้ฟรี การต่ออายุ การยกเลิก และการคืนเงิน\nRevenueCat ประมวลผลข้อมูลแทนเราเพื่อให้บริการแอปเท่านั้น และต้องให้การคุ้มครองข้อมูลในระดับเท่ากับที่ระบุในนโยบายนี้ตามสัญญา ส่วน Apple และ Google เป็นผู้ควบคุมข้อมูลของบัญชีสโตร์และการชำระเงินของตนเองตามนโยบายของแต่ละราย เราไม่ขายข้อมูลส่วนบุคคล ไม่แบ่งปันเพื่อการโฆษณาตามพฤติกรรมข้ามบริการ และไม่เปิดเผยข้อมูลแก่ผู้อื่นนอกจากผู้ให้บริการข้างต้น หรือเมื่อกฎหมายหรือคำสั่งของหน่วยงานรัฐที่มีอำนาจกำหนด',
        },
        {
          heading: 'การโอนข้อมูลไปต่างประเทศ',
          body: 'RevenueCat, Apple และ Google อาจจัดเก็บและประมวลผลข้อมูลการซื้อบนเซิร์ฟเวอร์นอกประเทศไทยและนอกประเทศที่คุณอยู่ เช่น สหรัฐอเมริกา เมื่อมีการโอนข้อมูลออกนอกประเทศ เราจะดำเนินการให้ปลายทางมีมาตรการคุ้มครองข้อมูลที่เหมาะสมตามกฎหมาย เช่น ข้อสัญญามาตรฐาน (standard contractual clauses) ข้อมูลการฝึกและสุขภาพไม่ถูกโอนไปที่ใด เว้นแต่คุณส่งไฟล์สำรองหรือไฟล์ส่งออกไปเอง',
        },
        {
          heading: 'ข้อมูลสุขภาพและคำเตือน',
          body: 'ค่าที่แอปคำนวณเป็นเพียงการประมาณและคำแนะนำทั่วไป ไม่ใช่คำแนะนำทางการแพทย์ แอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัยหรือรักษาโรค ข้อมูลสุขภาพของคุณอยู่ในเครื่องของคุณ ไม่ถูกใช้เพื่อโฆษณาและไม่ถูกส่งต่อให้บริษัทประกันหรือนายหน้าข้อมูล',
        },
        {
          heading: 'การเก็บรักษาและการลบข้อมูล',
          body: '• ข้อมูลในเครื่องอยู่จนกว่าคุณจะลบ ข้อมูลไม่ถูกลบเมื่อสิทธิ์ใช้งานหมด\n• ลบทั้งหมด: ตั้งค่า → ข้อมูลของคุณ → ลบข้อมูลทั้งหมดในเครื่องนี้ (เข้าได้เสมอ แม้ไม่มีสิทธิ์ใช้งาน ผ่านปุ่ม “การตั้งค่า” บนหน้าสมาชิก) จะลบข้อมูลการฝึก โปรไฟล์ บันทึกรายวัน คำตอบขั้นตั้งค่าเริ่มต้น สำเนาสถานะการสมัครสมาชิก วันที่สำรองข้อมูลล่าสุด และสำเนาชั่วคราวของไฟล์สำรอง ไฟล์ CSV และไฟล์ที่เลือกกู้คืนซึ่งแอปเก็บไว้ในแคช ส่วนค่าของเครื่อง เช่น ภาษา ธีม และสีหลัก ยังคงอยู่ การถอนการติดตั้งแอปก็ลบข้อมูลในแอปทั้งหมดเช่นกัน\n• รายการที่คุณลบทีละรายการ (เช่น เซสชันหรือโปรแกรม) จะถูกซ่อนทันที และอาจยังอยู่ในฐานข้อมูลของแอปในเครื่องจนกว่าคุณจะลบข้อมูลทั้งหมด กู้คืนจากไฟล์ หรือถอนการติดตั้ง รายการเหล่านี้ไม่ถูกใส่ในไฟล์สำรอง\n• ไฟล์สำรองหรือไฟล์ส่งออกที่คุณบันทึกไว้ที่อื่นไม่ถูกลบโดยแอป ให้ลบเองในที่ที่คุณเก็บไว้\n• การลบข้อมูลไม่ยกเลิกการสมัครสมาชิกในสโตร์ ยกเลิกได้ในการตั้งค่าบัญชีสโตร์\n• ข้อมูลการซื้อที่ RevenueCat ถูกเก็บไว้เท่าที่จำเป็นต่อการให้สิทธิ์ใช้งานและการกู้คืนการซื้อ และตามระยะเวลาที่กฎหมายกำหนด หากต้องการให้ลบ ติดต่อเราตามช่องทางด้านล่าง เนื่องจากรหัสเป็นแบบนิรนาม เราอาจขอข้อมูลที่ช่วยค้นหาระเบียน เช่น หมายเลขคำสั่งซื้อจากใบเสร็จของสโตร์ ประวัติการซื้อที่ Apple หรือ Google เก็บไว้เป็นไปตามนโยบายของสโตร์นั้น',
        },
        {
          heading: 'สิทธิ์ของคุณ',
          body: 'คุณมีสิทธิ์ขอเข้าถึงและขอรับสำเนาข้อมูล แก้ไขให้ถูกต้อง ลบหรือทำลาย ระงับการใช้ คัดค้านการประมวลผล ขอรับข้อมูลในรูปแบบที่อ่านด้วยเครื่องได้ และถอนความยินยอม (ถ้ามี) ได้ทุกเมื่อ\n• ข้อมูลในเครื่อง: เราไม่มีข้อมูลนี้ คุณจึงใช้สิทธิ์ได้เองโดยตรงในแอป: ดูและแก้ไขได้เกือบทั้งหมด รับสำเนาทั้งหมดในรูปแบบที่อ่านด้วยเครื่องได้ด้วย ตั้งค่า → ข้อมูลของคุณ → สำรองข้อมูล (ทำได้เสมอ แม้ไม่มีสิทธิ์ใช้งาน) หรือส่งออก CSV (ขณะที่สิทธิ์ใช้งานยังไม่หมด) และลบทั้งหมดด้วย “ลบข้อมูลทั้งหมดในเครื่องนี้”\n• ข้อมูลการซื้อ: ส่งคำขอถึงช่องทางติดต่อด้านล่าง เราจะดำเนินการกับ RevenueCat ให้ ส่วนข้อมูลที่ Apple หรือ Google เก็บ ให้ใช้สิทธิ์กับสโตร์นั้นโดยตรง\nเราจะตอบภายใน 30 วันนับแต่ได้รับคำขอ โดยไม่เสียค่าใช้จ่าย หากเห็นว่าเราไม่ปฏิบัติตามกฎหมายคุ้มครองข้อมูล คุณมีสิทธิ์ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ของประเทศไทย หรือหน่วยงานกำกับดูแลในประเทศที่คุณอยู่',
        },
        {
          heading: 'เด็กและผู้เยาว์',
          body: 'แอปไม่ได้มุ่งให้เด็กอายุต่ำกว่า 13 ปีใช้งาน และเราไม่เก็บข้อมูลของเด็กอายุต่ำกว่า 13 ปีโดยเจตนา หากพบว่ามีข้อมูลการซื้อของเด็กดังกล่าว เราจะดำเนินการลบ ผู้ใช้ที่ยังไม่บรรลุนิติภาวะ หรืออายุต่ำกว่าเกณฑ์ที่กฎหมายที่ใช้กับคุณกำหนดให้ให้ความยินยอมเองได้ ต้องได้รับความยินยอมจากผู้ปกครองก่อนใช้แอป ผู้ปกครองลบข้อมูลในเครื่องได้ด้วย “ลบข้อมูลทั้งหมดในเครื่องนี้” หรือติดต่อเราตามช่องทางด้านล่าง สำหรับผู้ใช้อายุต่ำกว่า 18 ปีที่กรอกอายุ แอปจะไม่แสดงเป้าหมายการลดน้ำหนัก',
        },
        {
          heading: 'ผู้อยู่อาศัยในรัฐแคลิฟอร์เนีย',
          body: 'ข้อมูลส่วนบุคคลที่ถูกเก็บผ่าน RevenueCat มีเพียงตัวระบุ (รหัสนิรนาม) ข้อมูลทางพาณิชย์ (ประวัติการซื้อ) และข้อมูลทางเทคนิคของการเชื่อมต่อ ตามวัตถุประสงค์ที่ระบุข้างต้น ข้อมูลสุขภาพที่คุณกรอกอยู่ในเครื่องของคุณเท่านั้นและเราไม่ได้รับ เราไม่ขายหรือแบ่งปันข้อมูลส่วนบุคคลเพื่อการโฆษณาตามพฤติกรรมข้ามบริการ คุณมีสิทธิ์ขอทราบ ลบ และแก้ไขข้อมูล และจะไม่ถูกเลือกปฏิบัติเมื่อใช้สิทธิ์ ส่งคำขอทางอีเมลตามช่องทางติดต่อ ผู้แทนที่ได้รับอนุญาตส่งคำขอแทนได้',
        },
        {
          heading: 'การเปลี่ยนแปลงนโยบาย',
          body: 'หากมีการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งในแอปหรือหน้าสโตร์ก่อนมีผล หากเราเปลี่ยนวัตถุประสงค์ในการใช้ข้อมูลหรือเริ่มส่งข้อมูลประเภทใหม่ออกจากเครื่อง เราจะแจ้งให้ทราบก่อน และขอความยินยอมเมื่อกฎหมายกำหนด',
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
          body: 'Fitnese works offline. Everything you enter or log in the app (your profile, body measurements, workouts and daily log) stays on your device only. There are no user accounts and no sign-in, we run no servers or cloud database of our own, and we cannot see or access this data. No ads, no analytics or crash-reporting SDKs, no cross-app tracking, and we never sell data. The only data that leaves your device is purchase data, handled by Apple or Google and RevenueCat as described below.',
        },
        {
          heading: 'Data that stays on your device',
          body: 'The following is saved in the app’s private storage on your device and is never sent to us or anyone else:\n• Profile and settings you enter (optional): sex, age, height, weight, activity level, goal, preferred units and settings such as the rest timer\n• Training data: programs, weekly plan, routines, exercises (including custom exercises and notes you type), sets, weights, reps, body weight at workout time, workout times, intensity and calculated calories\n• Daily entries you type in: calories burned/eaten and body weight\n• Your setup answers and a cached copy of your latest subscription status (so the app works offline)\nWe have no copy of this data, so we cannot view, recover, correct or delete it for you remotely. Data on your device is protected by your device’s own security settings (such as your screen lock) and may be included in the operating system’s device backups if you have turned them on, under Apple’s or Google’s policies. Please do not put sensitive information in names or notes you type yourself.',
        },
        {
          heading: 'Data that leaves your device: purchases',
          body: 'Purchases and free trials go through the App Store or Google Play, and the app checks your purchase status with RevenueCat when it opens and when you buy or restore. This involves:\n• An anonymous ID: a random identifier that RevenueCat’s SDK creates on your device. It is not linked to your name, email or any account of ours.\n• Purchase history: what you bought, purchase dates, trial/monthly/lifetime status, expiry, renewal and refund status, and the transaction or receipt information the store provides (including the store country and currency)\n• Technical data needed for the connection: IP address, device and operating-system type and app version, used to validate purchases and prevent fraud, not to locate you or for advertising\nIn RevenueCat we can see purchase information only next to the anonymous ID; we never see your name, email, workouts or health data. Payments are processed by Apple or Google under their own policies, and we never see or store your card details. Data sent to RevenueCat is encrypted with HTTPS/TLS.\nWhen you open a link from the app (for example the web version of a policy, a reference, or the store’s subscription page), that website’s own policy applies. We do not collect photos, videos, location or contacts.',
        },
        {
          heading: 'Backup and export files',
          body: '“Back up data” creates a file (fitnese-backup-….json) containing all of your data in the app, including body and health information, and “Export CSV” creates spreadsheet files of your workouts and daily log. The file is created on your device and handed to the system share sheet; you choose where to save or send it (for example Google Drive, Files, LINE or email), and that service’s own policy applies. We never receive a copy. The file is not encrypted, so anyone who gets it can read it; keep it somewhere safe. “Restore from file” reads the file you choose on your device and replaces the data on this device without sending the file anywhere.',
        },
        {
          heading: 'Legal bases',
          body: '• Data on your device: the app processes it on your device, under your control. We do not receive, store or access it. Body and health information is optional; you do not have to enter any, and you can delete it at any time.\n• Purchase data: contract (to give you the access you bought and to restore purchases), legitimate interests (validating purchases, preventing fraud and keeping the service secure), and legal obligation where the law requires it.',
        },
        {
          heading: 'How we use it',
          body: 'The app uses the data on your device to show today’s plan, calculate targets (BMR/TDEE/macros/calories) and show your stats, all calculated on the device. Purchase data is used to check your access, restore purchases, show when your trial ends or your plan renews, and answer your questions about purchases. Without purchase data (for example if you do not buy) the membership features cannot be used. Profile and daily-log data is optional, and without it the target calculators may not show results. We do not use automated decisions that have legal or similarly significant effects on you. Values the app calculates are estimates only, and access to features depends only on the purchase status reported by the store.',
        },
        {
          heading: 'Service providers',
          body: '• RevenueCat: purchase validation and subscription status, using the anonymous ID\n• Apple App Store / Google Play: payments, free trials, renewals, cancellations and refunds\nRevenueCat processes data on our behalf only to run the app and is contractually required to give it the same level of protection described in this policy. Apple and Google act as independent controllers for their own store accounts and payment services under their own policies. We do not sell personal data, do not share it for cross-context behavioural advertising, and do not disclose it to anyone other than the providers above, except where the law or a competent authority requires.',
        },
        {
          heading: 'International transfers',
          body: 'RevenueCat, Apple and Google may store and process purchase data on servers outside Thailand and outside your country, such as the United States. When data is transferred abroad, we make sure the recipient applies appropriate safeguards as required by law, such as standard contractual clauses. Your training and health data is not transferred anywhere unless you send a backup or export file yourself.',
        },
        {
          heading: 'Health information and disclaimer',
          body: 'Values calculated by the app are estimates and general guidance, not medical advice. The app is not a medical device and does not diagnose or treat any condition. Your health information stays on your device; it is never used for advertising and never shared with insurers or data brokers.',
        },
        {
          heading: 'Retention and deletion',
          body: '• Data on your device stays until you delete it. It is not deleted when your access ends.\n• Delete everything: Settings → Your data → Delete all data on this device (always available, even without access, through the “Settings” button on the membership screen). This erases your workouts, profile, daily log, setup answers, cached subscription status, last-backup date, and the temporary copies of backup, CSV and picked restore files the app keeps in its cache. Device preferences such as language, theme and accent color are kept. Uninstalling the app also removes all of its data.\n• Items you delete one by one (for example a session or program) are hidden immediately and may remain in the app’s database on your device until you delete all data, restore from a file or uninstall. They are never included in backup files.\n• Backup or export files you saved elsewhere are not deleted by the app; delete them yourself wherever you keep them.\n• Deleting your data does not cancel a store subscription; cancel it in your store account settings.\n• Purchase data at RevenueCat is kept as long as needed to provide your access and restore purchases, and for any period the law requires. To ask for its deletion, contact us below. Because the ID is anonymous, we may ask for something that helps us find the record, such as the order number on your store receipt. Purchase records held by Apple or Google follow that store’s policy.',
        },
        {
          heading: 'Your rights',
          body: 'You have the right to access and receive a copy of your data, correct it, delete it, restrict its use, object to processing, receive it in a machine-readable format, and withdraw any consent at any time.\n• Data on your device: we do not hold it, so you exercise these rights directly in the app. You can view and edit almost everything, get a complete machine-readable copy with Settings → Your data → Back up data (always available, even without access) or Export CSV (while your access is active), and erase everything with “Delete all data on this device”.\n• Purchase data: send a request to the contact below and we will handle it with RevenueCat. For data held by Apple or Google, use your rights with that store directly.\nWe reply within 30 days of receiving the request, free of charge. If you believe we do not comply with data protection law, you have the right to complain to the Personal Data Protection Committee (PDPC) of Thailand or to the supervisory authority in your country.',
        },
        {
          heading: 'Children and minors',
          body: 'The app is not directed to children under 13, and we do not knowingly collect data from children under 13; if we learn that we hold purchase data of such a child, we will delete it. Users who are minors, or below the age at which the law that applies to them lets them consent on their own, need a parent or guardian’s consent to use the app. Parents can erase the data on the device with “Delete all data on this device” or contact us below. For users under 18 who enter their age, the app does not show weight-loss targets.',
        },
        {
          heading: 'California residents',
          body: 'The only personal information collected, through RevenueCat, is an identifier (the anonymous ID), commercial information (purchase history) and technical connection data, for the purposes above. Health information you enter stays on your device and is never received by us. We do not sell or share personal information for cross-context behavioural advertising. You have the right to know, delete and correct your information, and will not be discriminated against for using these rights. Send requests by email to the contact below. An authorised agent may submit a request for you.',
        },
        {
          heading: 'Changes',
          body: 'We’ll announce material changes in the app or on the store page before they take effect. If we change the purposes for which we use data or start sending a new kind of data off your device, we will tell you first and ask for your consent where the law requires.',
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
          body: 'เมื่อใช้ Fitnese ถือว่าคุณยอมรับข้อกำหนดนี้ และรับทราบนโยบายความเป็นส่วนตัว',
        },
        {
          heading: 'ผู้ใช้และข้อมูลของคุณ',
          body: 'แอปไม่มีบัญชีผู้ใช้หรือการล็อกอิน ข้อมูลที่คุณบันทึกเก็บอยู่ในเครื่องของคุณเท่านั้น ผู้พัฒนาไม่มีสำเนาและไม่สามารถกู้คืนข้อมูลให้คุณได้\nคุณเป็นผู้รับผิดชอบการสำรองข้อมูลของตนเอง: สำรองข้อมูลเป็นประจำที่ ตั้งค่า → ข้อมูลของคุณ → สำรองข้อมูล และเก็บไฟล์ไว้ในที่ปลอดภัย หากเครื่องหาย เสีย หรือถูกล้างเครื่อง หากคุณถอนการติดตั้งแอปหรือใช้ “ลบข้อมูลทั้งหมดในเครื่องนี้” หรือหากคุณกู้คืนจากไฟล์ (ซึ่งแทนที่ข้อมูลเดิมทั้งหมด) ข้อมูลที่ไม่ได้สำรองไว้จะหายและไม่สามารถกู้คืนได้\nคุณต้องมีอายุอย่างน้อย 13 ปีจึงจะใช้แอปได้ และต้องมีอายุตามที่กฎหมายที่ใช้กับคุณกำหนดจึงจะทำสัญญาซื้อการสมัครสมาชิกได้ หากคุณอายุต่ำกว่านั้น ต้องได้รับความยินยอมและการชำระเงินจากผู้ปกครองหรือผู้ดูแลที่เป็นเจ้าของบัญชีสโตร์ สำหรับผู้ใช้อายุต่ำกว่า 18 ปีที่กรอกอายุ แอปจะไม่แสดงเป้าหมายการลดน้ำหนัก',
        },
        {
          heading: 'สมาชิกและการชำระเงิน',
          body: '• การชำระเงินทั้งหมดดำเนินการและเรียกเก็บโดย Apple หรือ Google ผ่านบัญชีสโตร์ของคุณ เมื่อคุณยืนยันการซื้อหรือเมื่อสิ้นสุดช่วงทดลอง เราไม่เห็นหรือเก็บข้อมูลบัตรของคุณ ราคาเป็นราคาที่สโตร์แสดงก่อนซื้อ อาจต่างกันตามประเทศและอาจรวมภาษี\n• รายเดือน: ต่ออายุอัตโนมัติทุกเดือนจนกว่าคุณจะยกเลิก และเรียกเก็บค่าต่ออายุก่อนสิ้นสุดรอบบิลปัจจุบันไม่นาน ผู้มีสิทธิ์จะได้ทดลองใช้ฟรีก่อน (ปัจจุบัน 7 วัน ตามข้อเสนอของสโตร์ โดยทั่วไปครั้งเดียวต่อบัญชีสโตร์) จากนั้นเรียกเก็บตามราคาที่แสดงบนหน้าจอซื้อ หากมีการเปลี่ยนราคา สโตร์จะแจ้งและขอความยินยอมตามกฎของสโตร์\n• ยกเลิกได้ทุกเมื่อในการตั้งค่าบัญชี App Store หรือ Google Play หากไม่ต้องการให้ต่ออายุหรือไม่ต้องการถูกเรียกเก็บเงินหลังช่วงทดลอง ต้องยกเลิกอย่างน้อย 24 ชั่วโมงก่อนสิ้นสุดช่วงทดลองหรือรอบบิลปัจจุบัน หลังยกเลิกคุณยังใช้งานได้จนสิ้นสุดช่วงทดลองหรือรอบบิลที่ชำระแล้ว\n• ซื้อขาด: ชำระครั้งเดียว ไม่มีช่วงทดลอง ปลดล็อกทุกฟีเจอร์ตราบที่ผู้พัฒนายังให้บริการแอป (ไม่ใช่ตลอดชีวิตของคุณ) โอนให้ผู้อื่นไม่ได้ หากผู้พัฒนาจะยุติการให้บริการแอป จะแจ้งล่วงหน้าตามสมควร การซื้อขาดไม่ยกเลิกการสมัครรายเดือนหรือช่วงทดลองที่มีอยู่ โปรดยกเลิกเองเพื่อไม่ให้ถูกเรียกเก็บเงิน\n• การซื้อผูกกับบัญชี App Store หรือ Google Play ที่ใช้ซื้อ ไม่ใช่กับเครื่อง บนเครื่องใหม่หรือหลังติดตั้งใหม่ ให้ลงชื่อเข้าใช้บัญชีสโตร์เดิมแล้วแตะ “กู้คืนการซื้อ” การซื้อจาก App Store กู้คืนบน Google Play ไม่ได้ และกลับกัน เนื่องจากแอปไม่มีบัญชีผู้ใช้ สิทธิ์ใช้งานจะอยู่กับเครื่องที่แตะ “กู้คืนการซื้อ” ล่าสุด การกู้คืนบนอีกเครื่องอาจทำให้เครื่องที่ใช้ก่อนหน้าถูกล็อก หากเกิดขึ้น ให้แตะ “กู้คืนการซื้อ” อีกครั้งบนเครื่องที่ต้องการใช้ การกู้คืนการซื้อไม่ได้กู้คืนข้อมูลการฝึก ซึ่งต้องกู้คืนจากไฟล์สำรองของคุณ\n• หากการชำระเงินไม่สำเร็จ สโตร์อาจให้ช่วงผ่อนผันก่อนที่สิทธิ์จะถูกพัก คุณแก้ไขได้ที่วิธีชำระเงินในบัญชีสโตร์\n• Apple หรือ Google เป็นผู้ขายและผู้ดำเนินการชำระเงิน ผู้พัฒนาไม่สามารถคืนเงิน ยกเลิกการเรียกเก็บ หรือเข้าถึงข้อมูลบัตรของคุณได้โดยตรง การขอคืนเงินให้ดำเนินการกับ Apple (reportaproblem.apple.com) หรือ Google Play ตามนโยบายของสโตร์นั้น ทั้งนี้ไม่กระทบสิทธิของผู้บริโภคตามกฎหมาย\n• เมื่อสิทธิ์หมด ฟีเจอร์ของแอปจะถูกล็อก แต่ข้อมูลของคุณยังอยู่ในเครื่องและกลับมาครบเมื่อคุณสมัครใหม่หรือกู้คืนการซื้อ ระหว่างที่ถูกล็อก คุณยังสำรองข้อมูล กู้คืนจากไฟล์ และลบข้อมูลทั้งหมดในเครื่องได้เสมอ',
        },
        {
          heading: 'ไม่ใช่คำแนะนำทางการแพทย์',
          body: 'เนื้อหา สูตร และค่าที่คำนวณในแอป (เช่น BMR, TDEE, แคลอรี่, สารอาหาร, 1RM) เป็นค่าประมาณและข้อมูลทั่วไปเพื่อการออกกำลังกาย ซึ่งอาจไม่ตรงกับร่างกายของคุณ ไม่ใช่คำแนะนำทางการแพทย์หรือโภชนาการเฉพาะบุคคล แอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัย รักษา หรือป้องกันโรค ปรึกษาแพทย์ก่อนเริ่มโปรแกรมออกกำลังกายหรือเปลี่ยนอาหาร โดยเฉพาะหากมีโรคประจำตัว ตั้งครรภ์ หรืออายุต่ำกว่า 18 ปี (สำหรับผู้ใช้อายุต่ำกว่า 18 ปีที่กรอกอายุ แอปจะไม่แสดงเป้าหมายลดน้ำหนัก) หยุดออกกำลังกายและขอความช่วยเหลือทางการแพทย์หากเจ็บ เวียนศีรษะ หรือไม่สบาย แอปไม่เหมาะกับการใช้ในภาวะฉุกเฉิน คุณออกกำลังกายด้วยความระมัดระวังและความรับผิดชอบของตนเอง',
        },
        {
          heading: 'การใช้งานที่เหมาะสม',
          body: 'ห้ามใช้แอปในทางที่ผิดกฎหมาย หลีกเลี่ยงหรือแก้ไขการตรวจสิทธิ์การใช้งานหรือการชำระเงิน ดัดแปลงไฟล์สำรองเพื่อหลีกเลี่ยงการตรวจสิทธิ์ หรือรบกวนการทำงานของแอปหรือบริการของผู้ให้บริการที่แอปใช้',
        },
        {
          heading: 'การเลิกใช้งานและการลบข้อมูล',
          body: 'คุณเลิกใช้แอปได้ทุกเมื่อ หากต้องการลบข้อมูล ใช้ ตั้งค่า → ข้อมูลของคุณ → ลบข้อมูลทั้งหมดในเครื่องนี้ หรือถอนการติดตั้งแอป การลบข้อมูลหรือการถอนการติดตั้งไม่ยกเลิกการสมัครสมาชิกในสโตร์และไม่ทำให้ได้เงินคืนอัตโนมัติ คุณต้องยกเลิกเองในการตั้งค่าบัญชี App Store หรือ Google Play ผู้พัฒนาอาจระงับสิทธิ์ใช้งานที่ได้มาโดยละเมิดข้อกำหนดนี้ (เช่น หลีกเลี่ยงการตรวจสิทธิ์) ข้อกำหนดเรื่องทรัพย์สินทางปัญญา ข้อจำกัดความรับผิด และกฎหมายที่ใช้บังคับยังคงมีผลหลังการเลิกใช้งาน',
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
          body: 'แอปให้บริการ “ตามสภาพ” และ “ตามที่มี” ผู้พัฒนาไม่รับประกันว่าแอปจะทำงานต่อเนื่องหรือไม่มีข้อผิดพลาด หรือว่าค่าที่คำนวณถูกต้องสำหรับคุณ ไม่มีการสำรองข้อมูลอัตโนมัติไปที่ใด ไฟล์สำรองที่ถูกแก้ไขหรือเสียหายอาจกู้คืนไม่ได้ และแอปรุ่นเก่าอาจเปิดไฟล์สำรองที่สร้างจากแอปรุ่นใหม่กว่าไม่ได้',
        },
        {
          heading: 'ข้อจำกัดความรับผิด',
          body: 'ภายใต้ขอบเขตที่กฎหมายอนุญาต ผู้พัฒนาไม่รับผิดต่อความเสียหายทางอ้อมหรือต่อเนื่อง หรือการสูญเสียข้อมูล (รวมถึงข้อมูลที่ไม่ได้สำรองไว้) ที่เกิดจากการใช้แอปหรือข้อมูลในแอป ข้อกำหนดนี้ไม่ตัดหรือจำกัดความรับผิดที่กฎหมายไม่อนุญาตให้ตัดหรือจำกัด รวมถึงความรับผิดต่อความตายหรือการบาดเจ็บทางร่างกายที่เกิดจากความจงใจหรือประมาทเลินเล่อของผู้พัฒนา หรือสิทธิของผู้บริโภคตามกฎหมาย',
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
          body: `${contactBlock()}\nปัญหาการใช้งาน ติดต่อเราทางอีเมลข้างต้น ส่วนการชำระเงินและการคืนเงินให้ติดต่อ Apple หรือ Google`,
        },
      ],
    },
    en: {
      title: 'Terms of Use',
      updated: `Effective ${EFFECTIVE.en}`,
      sections: [
        {
          heading: 'Agreement',
          body: 'By using Fitnese you accept these Terms and acknowledge the Privacy Policy.',
        },
        {
          heading: 'Using the app and your data',
          body: 'The app has no user accounts and no sign-in. The data you log is stored only on your device; the developer keeps no copy and cannot recover it for you.\nYou are responsible for backing up your data: back up regularly with Settings → Your data → Back up data and keep the file somewhere safe. If your device is lost, broken or reset, if you uninstall the app or use “Delete all data on this device”, or if you restore from a file (which replaces all existing data), any data you have not backed up is lost and cannot be recovered.\nYou must be at least 13 to use the app, and old enough under the law that applies to you to enter into a subscription contract. If you are younger, a parent or guardian who owns the store account must consent to and pay for your use. For users under 18 who enter their age, the app does not show weight-loss targets.',
        },
        {
          heading: 'Subscriptions and payments',
          body: '• All payments are processed and charged by Apple or Google to your store account when you confirm the purchase or when the free trial ends. We never see or store your card details. Prices shown are the store’s prices, may differ by country and may include taxes.\n• Monthly: renews automatically every month until you cancel, and the renewal is charged shortly before the current billing period ends. Eligible users get a free trial first (currently 7 days, as offered by the store, generally once per store account), then are charged the price shown on the purchase screen. If the price changes, the store will notify you and ask for consent as its rules require.\n• Cancel anytime in your App Store or Google Play account settings. To avoid renewal, or to avoid being charged when the free trial ends, cancel at least 24 hours before the end of the trial or current billing period. After you cancel, you keep access until the end of the trial or the billing period you have already paid for.\n• Lifetime: a one-time payment with no free trial. It unlocks all features for as long as the developer offers the app (not for your own lifetime) and cannot be transferred. If the developer decides to discontinue the app, reasonable notice will be given. Buying Lifetime does not cancel an existing monthly subscription or trial; cancel it yourself so you are not charged.\n• Purchases belong to the App Store or Google Play account used to buy them, not to the device. On a new device or after reinstalling, sign in to the same store account and tap “Restore purchases”. A purchase made on the App Store cannot be restored on Google Play, or the other way round. Because the app has no user accounts, access stays with the device where “Restore purchases” was last used: restoring on another device may lock a device you used before. If that happens, tap “Restore purchases” again on the device you want to use. Restoring purchases does not restore your training data; restore that from your backup file.\n• If a payment fails, the store may give a grace period before access is paused; fix it in your store payment settings.\n• Apple or Google is the seller and merchant of record. The developer cannot issue refunds, stop charges or see your card details directly. Request refunds from Apple (reportaproblem.apple.com) or Google Play under that store’s policy. This does not affect your statutory consumer rights.\n• When access ends, the app’s features are locked, but your data stays on your device and returns in full when you subscribe again or restore your purchase. While locked you can always back up your data, restore from a file and delete all data on the device.',
        },
        {
          heading: 'Not medical advice',
          body: 'Content, formulas and calculated values (such as BMR, TDEE, calories, macros and 1RM) are estimates and general fitness information, and may not match your body. They are not medical or personalised nutrition advice. The app is not a medical device and does not diagnose, treat or prevent any condition. Consult a doctor before starting an exercise program or changing your diet, especially if you have a medical condition, are pregnant or are under 18 (for users under 18 who enter their age, the app does not show weight-loss targets). Stop exercising and seek medical help if you feel pain, dizziness or unwell. The app is not for emergencies. You exercise at your own risk and responsibility.',
        },
        {
          heading: 'Acceptable use',
          body: 'Do not use the app unlawfully; bypass or tamper with access or payment checks; modify backup files to get around access checks; or interfere with the app or the services of the providers it uses.',
        },
        {
          heading: 'Ending your use and deleting your data',
          body: 'You can stop using the app at any time. To erase your data, use Settings → Your data → Delete all data on this device, or uninstall the app. Deleting your data or uninstalling does not cancel your store subscription and does not trigger an automatic refund; you must cancel it yourself in your App Store or Google Play account settings. The developer may suspend access obtained in breach of these Terms (for example by bypassing access checks). The sections on intellectual property, limitation of liability and governing law survive the end of your use.',
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
          body: 'The app is provided “as is” and “as available”. The developer does not warrant that it will be uninterrupted or error-free, or that calculated values are accurate for you. Nothing is backed up automatically anywhere; a backup file that has been modified or damaged may not restore, and an older version of the app may not open a backup made by a newer version.',
        },
        {
          heading: 'Limitation of liability',
          body: 'To the extent permitted by law, the developer is not liable for indirect or consequential loss or for loss of data (including data you did not back up) arising from use of the app or its information. Nothing in these Terms excludes or limits liability that cannot be excluded or limited by law, including liability for death or personal injury caused by the developer’s intent or negligence, or your statutory consumer rights.',
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
          body: `${contactBlock()}\nFor problems using the app, email us above. For billing and refunds, contact Apple or Google.`,
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
