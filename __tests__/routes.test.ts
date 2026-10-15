import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ALWAYS_ACCESSIBLE_ROUTES } from '@/features/access/AccessGate';

/**
 * SPEC B3: ทุกฟีเจอร์ถูกล็อกเมื่อไม่มีสิทธิ์ ยกเว้นรายการที่กำหนด
 * ทุกหน้าที่อยู่นอกกลุ่ม (app) (ซึ่งมี AccessGate ครอบ) ต้องอยู่ในรายการ ALWAYS_ACCESSIBLE_ROUTES เท่านั้น
 */
describe('route lock coverage (SPEC B3)', () => {
  const appDir = path.join(__dirname, '..', 'src', 'app');
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.tsx') && !f.startsWith('_layout') && !f.startsWith('+')) {
        routes.push(
          path
            .relative(appDir, p)
            .replace(/\.tsx$/, '')
            .split(path.sep)
            .join('/'),
        );
      }
    }
  };
  walk(appDir);

  it('every route outside the gated (app) group is explicitly allowed by B3', () => {
    const unlocked = routes.filter((r) => !r.startsWith('(app)/'));
    expect(unlocked.sort()).toEqual([...ALWAYS_ACCESSIBLE_ROUTES].sort());
  });

  it('the gated group layout uses the shared AccessGate', () => {
    const layout = fs.readFileSync(path.join(appDir, '(app)', '_layout.tsx'), 'utf8');
    expect(layout).toMatch(/<AccessGate>/);
  });

  it('feature screens live inside the gated group', () => {
    for (const r of [
      '(app)/(tabs)/index',
      '(app)/(tabs)/programs',
      '(app)/(tabs)/stats',
      '(app)/(tabs)/settings',
      '(app)/session/[id]',
    ]) {
      expect(routes).toContain(r);
    }
  });
});
