/**
 * ส่งออก Privacy Policy / Terms จากแหล่งเดียวกับในแอป (src/legal/content.ts) เป็น Markdown สำหรับโฮสต์บนเว็บ (SPEC N4)
 * `npm run legal:export` → docs/legal/{privacy,terms}.{th,en}.md — แก้ข้อความที่ src/legal/content.ts เท่านั้น
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  LEGAL,
  LEGAL_KEYS,
  LEGAL_LANGUAGES,
  REFERENCES,
  hasPlaceholders,
  unfilledMarkers,
} from '../src/legal/content';

const out = join(__dirname, '..', 'docs', 'legal');
mkdirSync(out, { recursive: true });

const allDocs = LEGAL_KEYS.flatMap((key) => LEGAL_LANGUAGES.map((lang) => LEGAL[key][lang]));
// ป้ายเทมเพลตแสดงเฉพาะตอนที่ยังมีค่าตัวแทนเหลือ (กรอกครบแล้วไฟล์ที่ส่งออกต้องสะอาด พร้อมโฮสต์)
const isStillTemplate = allDocs.some(hasPlaceholders);
// แสดงเฉพาะค่าตัวแทนที่ยังไม่ได้กรอก
const unfilled = unfilledMarkers(allDocs).join(', ');
const note = isStillTemplate
  ? {
      th: `> เทมเพลต — เจ้าของโปรเจกต์ต้องแทนที่ ${unfilled} และให้ผู้เชี่ยวชาญกฎหมายตรวจทานก่อนเผยแพร่\n\n`,
      en: `> Template — the owner must replace ${unfilled} and have it reviewed by a legal professional before publishing.\n\n`,
    }
  : { th: '', en: '' };

for (const key of LEGAL_KEYS) {
  for (const lang of LEGAL_LANGUAGES) {
    const doc = LEGAL[key][lang];
    const body = doc.sections.map((s) => `## ${s.heading}\n\n${s.body.replace(/\n/g, '  \n')}`).join('\n\n');
    const file = join(out, `${key}.${lang}.md`);
    writeFileSync(file, `# ${doc.title}\n\n${note[lang]}_${doc.updated}_\n\n${body}\n`);
    console.log('wrote', file);
  }
}

const refs = REFERENCES.map((r) => `- ${r.citation} <${r.url}>`).join('\n');
writeFileSync(join(out, 'references.md'), `# แหล่งอ้างอิง / References\n\n${refs}\n`);
console.log('wrote', join(out, 'references.md'));
