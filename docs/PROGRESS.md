# ความคืบหน้า (PROGRESS)

> อัปเดตหลังจบทุกงาน — ถ้าเซสชันขาด: อ่านไฟล์นี้แล้วทำงานที่ "กำลังทำ/เหลือ" ต่อตาม [TASKS.md](TASKS.md)

## สถานะล่าสุด
- **เสร็จ:** P1, P2, T01–T16 (โค้ดแอป + Supabase + เทสต์ + ตรวจภาพ)
- **กำลังทำ:** ตรวจย้อนกลับทุกข้อของ SPEC (T18 `docs/FINAL_CHECK.md`) และเอกสารสโตร์ (T17)
- **เหลือ (ต้องใช้มนุษย์):** ทุกอย่างใน [HUMAN_TASKS.md](HUMAN_TASKS.md) — บัญชี/คีย์จริง, สินค้าและ free trial offer ในสโตร์, ราคา, build จริงด้วย EAS, ทดสอบซื้อบนอุปกรณ์จริง

| งาน | สถานะ | หลักฐาน (commit / เทสต์) |
|---|---|---|
| P1 โครงโปรเจกต์ + core | ✅ | `edfa457` — theme, i18n, DB + migration runner, state machine สิทธิ์ + เทสต์ |
| P2 เอกสารเฟส 1 | ✅ | `fed6659`, `8b8d043` — ARCHITECTURE, TASKS, DECISIONS, OPEN_QUESTIONS, DATA_MODEL, SCREENS |
| T01 สูตรโปรไฟล์/โภชนาการ | ✅ | `a2524e4` — `__tests__/domain/nutrition.test.ts`, `units.test.ts`, `profileInput.test.ts` |
| T02 Progressive overload | ✅ | `a2524e4` — `__tests__/domain/progression.test.ts` |
| T03 ตาราง/วัน | ✅ | `a2524e4`, `d858f97` — `__tests__/domain/schedule.test.ts`, `dates.test.ts` |
| T04 สถิติ | ✅ | `b6d232a`, `642fda6` — `__tests__/domain/stats.test.ts`, `periods.test.ts` |
| T05 คลังท่า + เทมเพลต | ✅ | `fb8c8f7` — `__tests__/data/exercises.test.ts`, `templates.test.ts` |
| T06 Repository | ✅ | `e26f21c` — `__tests__/db/repos.test.ts`, `migrations.test.ts` |
| T07 Sync engine | ✅ | `149417f` — `__tests__/sync/engine.test.ts`, `cursor.test.ts` |
| T08 Supabase backend | ✅ | `8d2ae66` — `__tests__/supabase/*`, `npm run supabase:verify` (Postgres 16 จริง), `deno check` |
| T09 ตั้งค่าเริ่มต้น | ✅ | `631ffaa`, `fb8c8f7` — `__tests__/app/onboarding.test.tsx` |
| T10 Paywall/ล็อกอิน/บัญชี/กฎหมาย | ✅ | `3565f00` — `__tests__/app/paywall.test.tsx`, `gate.test.tsx`, `__tests__/flows/account.test.ts` |
| T11 หน้าแรก | ✅ | `766b0e3` — `__tests__/app/today-programs.test.tsx` |
| T12 โปรแกรม/ตาราง/คลังท่า | ✅ | `766b0e3` — `__tests__/app/today-programs.test.tsx` |
| T13 เซสชัน | ✅ | `512c94a` — `__tests__/app/session.test.tsx` |
| T14 สถิติ + ประวัติ | ✅ | `5b2eaac` — `__tests__/app/stats.test.tsx` |
| T15 ตั้งค่า + โปรไฟล์ + CSV | ✅ | `0807783` — `__tests__/app/settings.test.tsx`, `__tests__/domain/csv.test.ts` |
| T16 Accessibility + ตรวจภาพ | ✅ | `dbbda16` — `npm run contrast`, `__tests__/theme/contrast.test.ts`, `docs/screenshots/` |
| T17 เตรียมสโตร์ | 🔄 | `069acc7` (กฎหมาย → `docs/legal/`), store-metadata กำลังเขียน |
| T18 ตรวจสุดท้าย | 🔄 | `expo export` iOS/Android ผ่าน, `expo prebuild` ทั้งสองแพลตฟอร์มผ่าน (D21) |

ผลตรวจล่าสุด: `npm run check` ผ่าน (34 ชุดเทสต์ / 487 ข้อ), `npm run contrast` ผ่านทุกสีหลักทั้งสองโหมด, `npm run supabase:verify` ผ่าน

## TODO ที่ค้างในโค้ด
(ไม่มี — `grep -rn "TODO\|FIXME" src supabase scripts` ว่าง)
