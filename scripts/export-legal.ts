/**
 * ส่งออก Privacy Policy / Terms จากแหล่งเดียวกับในแอป (src/legal/content.ts) เป็น Markdown สำหรับโฮสต์บนเว็บ (SPEC N4)
 * `npm run legal:export` → docs/legal/{privacy,terms}.{th,en}.md — แก้ข้อความที่ src/legal/content.ts เท่านั้น
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { LEGAL, LEGAL_KEYS, PLACEHOLDERS, REFERENCES } from '../src/legal/content';

const out = join(__dirname, '..', 'docs', 'legal');
mkdirSync(out, { recursive: true });

const note = {
  th: `> เทมเพลต — เจ้าของโปรเจกต์ต้องแทนที่ ${Object.values(PLACEHOLDERS).join(', ')} และให้ผู้เชี่ยวชาญกฎหมายตรวจทานก่อนเผยแพร่`,
  en: `> Template — the owner must replace ${Object.values(PLACEHOLDERS).join(', ')} and have it reviewed by a legal professional before publishing.`,
};

for (const key of LEGAL_KEYS) {
  for (const lang of ['th', 'en'] as const) {
    const doc = LEGAL[key][lang];
    const body = doc.sections.map((s) => `## ${s.heading}\n\n${s.body.replace(/\n/g, '  \n')}`).join('\n\n');
    const file = join(out, `${key}.${lang}.md`);
    writeFileSync(file, `# ${doc.title}\n\n${note[lang]}\n\n_${doc.updated}_\n\n${body}\n`);
    console.log('wrote', file);
  }
}

const refs = REFERENCES.map((r) => `- ${r.citation} <${r.url}>`).join('\n');
writeFileSync(join(out, 'references.md'), `# แหล่งอ้างอิง / References (SPEC H6)\n\n${refs}\n`);
console.log('wrote', join(out, 'references.md'));
