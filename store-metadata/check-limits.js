#!/usr/bin/env node
/* global __dirname, Buffer */
/**
 * ตรวจจำนวนตัวอักษรของข้อความหน้าร้านทุกช่องใน store-metadata/*.md
 * ใช้: node store-metadata/check-limits.js [--url-len=80] [--release]
 *
 * - อ่านทุกบล็อกที่มี marker `<!-- id:xxx -->` ตามด้วยกรอบ ```text
 * - นับเป็น Unicode code point (รวมช่องว่างและการขึ้นบรรทัด) และนับไบต์ UTF-8 ให้ด้วย
 * - เทียบกับขีดจำกัดของสโตร์ และเทียบกับตัวเลข "นับได้ N" / "count N" ที่เขียนไว้ใกล้บล็อก
 * - --url-len=N  จำลองว่า <TERMS_URL> <PRIVACY_URL> <SUPPORT_URL> ... ถูกแทนด้วย URL ยาว N ตัวอักษร
 *                (ค่าเริ่มต้น 80) เพื่อดูว่าข้อความยังไม่เกินขีดจำกัดหลังใส่ URL จริง
 * - --release    ล้มเหลว (exit 1) ถ้ายังเหลือ <PLACEHOLDER> ในไฟล์ใดๆ
 *
 * ถ้า exit code เป็น 1 แปลว่ามีช่องที่เกินขีดจำกัด ตัวเลขไม่ตรงกับที่เขียน หรือ (โหมด --release) ยังมี placeholder
 * ตัวนับในคอนโซลของสโตร์เป็นตัวตัดสินสุดท้าย — ถ้าไม่ตรงกับสคริปต์นี้ ให้ยึดคอนโซล
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const release = args.includes('--release');
const urlLenArg = args.find((a) => a.startsWith('--url-len='));
const urlLen = urlLenArg ? Number(urlLenArg.split('=')[1]) : 80;

// ขีดจำกัดต่อ id (หน่วยเป็น code point ยกเว้นระบุ bytes)
const LIMITS = {
  name: { limit: 30, label: 'ชื่อแอป (App Store / Play)' },
  name_alt: { limit: 30, label: 'ชื่อแอปแบบมีคำอธิบาย' },
  as_subtitle: { limit: 30, label: 'App Store subtitle' },
  as_promo: { limit: 170, label: 'App Store promotional text' },
  as_desc: { limit: 4000, label: 'App Store description' },
  as_keywords: { limit: 100, label: 'App Store keywords', bytes: true },
  as_keywords_long: {
    limit: 100,
    label: 'App Store keywords ชุดยาว (ใช้ได้เมื่อคอนโซลนับเป็นตัวอักษรเท่านั้น)',
  },
  whats_new: { limit: 4000, label: "App Store What's New / Play release notes (Play จำกัด 500)", also: 500 },
  play_short: { limit: 80, label: 'Play short description' },
  play_desc: { limit: 4000, label: 'Play full description' },
  asc_notes: { limit: 4000, label: 'App Review notes (นับเป็นไบต์ด้วย)', bytes: true },
  play_access: { limit: 500, label: 'Play App access instructions (ตรวจขีดจำกัดจริงในคอนโซล)' },
};
// ชื่อทางเลือกใน app-names.md (n1..n5) จำกัด 30 เหมือนชื่อแอป
for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) LIMITS[id] = { limit: 30, label: `ชื่อตัวอย่าง ${id}` };

const dir = __dirname;
let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`  FAIL ${msg}`);
};

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .sort();
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = text.split('\n');
  const re = /<!-- id:(\w+) -->\n```text\n([\s\S]*?)\n```/g;
  let m;
  let any = false;
  while ((m = re.exec(text))) {
    if (!any) {
      console.log(`\n${file}`);
      any = true;
    }
    const [, id, body] = m;
    const spec = LIMITS[id];
    const cp = Array.from(body).length;
    const bytes = Buffer.byteLength(body, 'utf8');
    // จำลอง URL จริงแทน placeholder ประเภท URL
    const withUrls = body.replace(/<(TERMS|PRIVACY|SUPPORT|MARKETING)_URL>/g, 'x'.repeat(urlLen));
    const cpUrl = Array.from(withUrls).length;
    const bytesUrl = Buffer.byteLength(withUrls, 'utf8');

    // หาตัวเลขที่เขียนไว้ใกล้บล็อก (3 บรรทัดที่ไม่ว่างก่อน marker)
    const startLine = text.slice(0, m.index).split('\n').length - 1;
    const near = [];
    for (let i = startLine - 1; i >= 0 && near.length < 3; i -= 1) {
      if (lines[i].trim()) near.push(lines[i]);
    }
    const stated = [
      ...near.join(' ').matchAll(/(?:count|นับได้)\s+(\d+)(?:\s*ตัวอักษร)?(?:\s*\/\s*(\d+)\s*ไบต์)?/g),
    ];

    const unit = spec && spec.bytes ? 'bytes' : 'chars';
    const measure = spec && spec.bytes ? bytes : cp;
    const measureUrl = spec && spec.bytes ? bytesUrl : cpUrl;
    // keywords: Apple เคยนับเป็นไบต์ จึงรายงานทั้งสองค่า แต่ตัดสินด้วยตัวที่ใหญ่กว่าเฉพาะชุดหลัก
    const desc = `${id}: ${cp} chars / ${bytes} bytes`;
    if (!spec) {
      console.log(`  ?    ${desc} (ไม่มีขีดจำกัดที่รู้จัก)`);
      continue;
    }
    const limit = spec.limit;
    const ok = measure <= limit;
    const okUrl = measureUrl <= limit;
    console.log(
      `  ${ok && okUrl ? 'ok  ' : 'OVER'} ${desc} | limit ${limit} ${unit} | headroom ${limit - measure}` +
        (cpUrl !== cp ? ` | with ${urlLen}-char URLs: ${measureUrl}` : '') +
        ` | ${spec.label}`,
    );
    if (!ok) fail(`${file} ${id} เกินขีดจำกัด (${measure} > ${limit})`);
    else if (!okUrl)
      fail(`${file} ${id} เกินขีดจำกัดเมื่อใส่ URL ยาว ${urlLen} ตัวอักษร (${measureUrl} > ${limit})`);
    if (spec.also && cp > spec.also) fail(`${file} ${id} เกิน ${spec.also} (Play release notes) (${cp})`);

    if (stated.length) {
      const nums = stated
        .flatMap((s) => [Number(s[1]), s[2] ? Number(s[2]) : null])
        .filter((n) => n !== null);
      if (!nums.includes(cp) && !nums.includes(bytes)) {
        fail(
          `${file} ${id} ตัวเลขที่เขียนไว้ (${nums.join(', ')}) ไม่ตรงกับที่นับจริง (${cp} ตัวอักษร / ${bytes} ไบต์)`,
        );
      }
    } else {
      console.log('       (ไม่พบตัวเลขที่เขียนไว้ใกล้บล็อกนี้ให้เทียบ)');
    }
  }
}

// รายการ placeholder ที่ยังเหลือ
console.log('\nPlaceholders ที่ยังไม่ได้แทนค่า (ไม่นับในกรอบอธิบาย):');
const left = new Map();
for (const file of files) {
  if (file === 'README.md') continue;
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  for (const t of text.matchAll(/<([A-Z][A-Z_]{3,})>/g)) {
    if (t[1] === 'PLACEHOLDER') continue;
    const key = t[1];
    left.set(key, (left.get(key) || new Set()).add(file));
  }
}
if (left.size === 0) console.log('  (ไม่มี)');
for (const [k, fset] of [...left.entries()].sort()) console.log(`  <${k}>  ใน ${[...fset].join(', ')}`);
if (release && left.size > 0) fail('--release: ยังมี placeholder เหลือ');

console.log(failures ? `\n${failures} ปัญหา` : '\nผ่านทุกช่อง');
process.exit(failures ? 1 : 0);
