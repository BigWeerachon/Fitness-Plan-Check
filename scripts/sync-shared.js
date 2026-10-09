// คัดลอกโมดูลล้วนที่ทั้งแอปและ Edge Function ใช้ร่วมกัน (state machine สิทธิ์) ไปไว้ใน supabase/functions/_shared
// มีเทสต์ (__tests__/shared.test.ts) ตรวจว่าสำเนาตรงกับต้นฉบับทุกตัวอักษร
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const FILES = [['src/domain/entitlement/machine.ts', 'supabase/functions/_shared/entitlement-machine.ts']];

for (const [from, to] of FILES) {
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(root, to));
  console.log(`copied ${from} → ${to}`);
}
