// ฝังไฟล์ drizzle/*.sql เป็นโมดูล TypeScript ให้ Metro/Jest import ได้โดยไม่ต้องตั้งค่า loader ไฟล์ .sql
// ใช้: node scripts/embed-migrations.js (เรียกอัตโนมัติจาก npm run db:generate)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const journal = JSON.parse(fs.readFileSync(path.join(root, 'drizzle/meta/_journal.json'), 'utf8'));
const migrations = journal.entries.map((entry) => {
  const sql = fs.readFileSync(path.join(root, 'drizzle', `${entry.tag}.sql`), 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  return { tag: entry.tag, statements };
});

const out = `// ไฟล์นี้สร้างอัตโนมัติจาก drizzle/*.sql โดย scripts/embed-migrations.js — ห้ามแก้ด้วยมือ
export interface EmbeddedMigration {
  tag: string;
  statements: string[];
}

export const MIGRATIONS: EmbeddedMigration[] = ${JSON.stringify(migrations, null, 2)};
`;
fs.writeFileSync(path.join(root, 'src/db/migrations.generated.ts'), out);
console.log(`embedded ${migrations.length} migration(s)`);
