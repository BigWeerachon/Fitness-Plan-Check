import { defineConfig } from 'drizzle-kit';

// สร้าง SQL migration จาก src/db/schema.ts → drizzle/*.sql
// แล้ว scripts/embed-migrations.js ฝังเป็น src/db/migrations.generated.ts ให้แอปและเทสต์ใช้
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
