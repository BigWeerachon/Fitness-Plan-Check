/**
 * รายงาน contrast ของทุกสีหลัก × ทั้งสองโหมด (SPEC DS, N5) — `npm run contrast`
 * พิมพ์ตาราง Markdown (ใช้ใน docs/DESIGN_SYSTEM.md) และจบด้วย exit code 1 ถ้ามีค่าใดไม่ผ่าน WCAG AA
 */
import { contrastRatio } from '../src/theme/color';
import {
  AA_GRAPHIC,
  AA_TEXT,
  ACCENT_PRESETS,
  BRAND,
  buildPalette,
  contrastReport,
  passesAA,
  type ThemeMode,
} from '../src/theme/tokens';

const MODES: ThemeMode[] = ['dark', 'light'];
const f = (n: number) => n.toFixed(2);
let failed = false;

console.log(
  '| สีหลัก | โหมด | accent (ข้อความ) | บนพื้น | บนการ์ด | หัวข้อบนแสงเรือง | ข้อความบนปุ่ม | ปุ่ม/กราฟบนการ์ด | ข้อความรองบนการ์ด/sheet | สีหลักบน chip/แท็บที่เลือก | ผล |',
);
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const a of ACCENT_PRESETS) {
  for (const mode of MODES) {
    const p = buildPalette(mode, a.id);
    const r = contrastReport(p);
    const ok = passesAA(r);
    failed ||= !ok;
    console.log(
      `| ${a.id} \`${a.base}\` | ${mode} | \`${p.accent}\` / ปุ่ม \`${p.accentFill}\` | ${f(r.accentOnBackground)} | ${f(r.accentOnCard)} | ${f(r.heroOnGlow)} | ${f(r.onAccentOnFill)} | ${f(r.fillOnCard)} | ${f(r.secondaryOnCard)} / ${f(r.secondaryOnElevated)} | ${f(r.accentOnSoft)} | ${ok ? 'ผ่าน' : '**ไม่ผ่าน**'} |`,
    );
  }
}

// สีกราฟ (องค์ประกอบกราฟิก ≥ 3:1 บนการ์ด)
for (const mode of MODES) {
  for (const a of ACCENT_PRESETS) {
    const p = buildPalette(mode, a.id);
    const worst = Math.min(...p.chart.map((c) => contrastRatio(c, p.card)));
    if (worst < AA_GRAPHIC) {
      failed = true;
      console.log(`chart colors for ${a.id}/${mode} fail: ${f(worst)}`);
    }
  }
}

// ปุ่มแบรนด์ล็อกอิน (ห้ามเปลี่ยนตามสีหลัก)
for (const [name, b] of Object.entries(BRAND)) {
  for (const mode of MODES) {
    const scheme = b[mode];
    const ratio = contrastRatio(scheme.text, scheme.background);
    failed ||= ratio < AA_TEXT;
    console.log(`\n${name} button (${mode}): text ${f(ratio)}:1`);
  }
}

console.log(`\nเกณฑ์: ข้อความ ≥ ${AA_TEXT}:1, องค์ประกอบกราฟิก ≥ ${AA_GRAPHIC}:1`);
if (failed) {
  console.error('CONTRAST CHECK FAILED');
  process.exit(1);
}
console.log('ALL CONTRAST CHECKS PASSED');
