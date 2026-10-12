/**
 * ส่งออก Privacy Policy / Terms จากแหล่งเดียวกับในแอป (src/legal/content.ts) เป็น Markdown สำหรับโฮสต์บนเว็บ (SPEC N4)
 * `npm run legal:export` → docs/legal/{privacy,terms}.{th,en}.md — แก้ข้อความที่ src/legal/content.ts เท่านั้น
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { LEGAL, LEGAL_KEYS, MARKERS, REFERENCES, hasPlaceholders } from '../src/legal/content';

const out = join(__dirname, '..', 'docs', 'legal');
mkdirSync(out, { recursive: true });

// ป้ายเทมเพลตแสดงเฉพาะตอนที่ยังมีค่าตัวแทนเหลือ (กรอกครบแล้วไฟล์ที่ส่งออกต้องสะอาด พร้อมโฮสต์)
const stillTemplate = LEGAL_KEYS.some((k) =>
  (['th', 'en'] as const).some((l) => hasPlaceholders(LEGAL[k][l])),
);
const markers = Object.values(MARKERS).join(', ');
const note = stillTemplate
  ? {
      th: `> เทมเพลต — เจ้าของโปรเจกต์ต้องแทนที่ ${markers} และให้ผู้เชี่ยวชาญกฎหมายตรวจทานก่อนเผยแพร่\n\n`,
      en: `> Template — the owner must replace ${markers} and have it reviewed by a legal professional before publishing.\n\n`,
    }
  : { th: '', en: '' };

for (const key of LEGAL_KEYS) {
  for (const lang of ['th', 'en'] as const) {
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
