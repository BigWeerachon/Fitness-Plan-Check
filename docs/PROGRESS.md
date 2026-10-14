# ความคืบหน้า (PROGRESS)

> อัปเดตหลังจบทุกงาน — ถ้าเซสชันขาด: อ่านไฟล์นี้แล้วทำงานที่ "เหลือ" ต่อตาม [TASKS.md](TASKS.md) · ตรวจกับโค้ดและ git log ณ วันที่ 2026-10-11 (หลัง `fc98e06`)

## สถานะล่าสุด
- **เสร็จ:** P1, P2, T01–T18 (โค้ดแอป + Supabase + เทสต์ + ตรวจภาพ + เอกสารสโตร์ + ตรวจย้อนกลับทุกข้อของสเปค) และรอบแก้ตามผลตรวจสเปค 10 รอบ (ตารางด้านล่าง)
- **กำลังทำ:** ไม่มีงานโค้ดค้าง — เอกสารตรวจสุดท้าย [FINAL_CHECK.md](FINAL_CHECK.md) (T18) กำลังถูกเขียนโดยเอเจนต์อีกตัว (ไฟล์อาจยังไม่ปรากฏใน repo ตอนอ่านหน้านี้)
- **เหลือ (ต้องใช้มนุษย์):** ทุกอย่างใน [HUMAN_TASKS.md](HUMAN_TASKS.md) — บัญชี/คีย์จริง, สินค้าและ free trial offer ในสโตร์, ราคา, build จริงด้วย EAS, ทดสอบซื้อบนอุปกรณ์จริงตาม [TEST_PLAN.md](TEST_PLAN.md), กรอก placeholder ของเอกสารกฎหมาย/`store-metadata/` แล้วทำตาม [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) และตัดสิน [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) Q12–Q17 (Apple บน Android, 'แก้ไขการตั้งค่าเริ่มต้น', ทางลัด 'มีบัญชีแล้ว', ช่วงย้อนหลัง 7 วัน, ชื่อ/รูป Google ใน Supabase, ตรวจไอคอนกล้ามเนื้อบนเครื่องจริง)

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
| T07 Sync engine | ✅ | `149417f` — `__tests__/sync/engine.test.ts`, `cursor.test.ts` (ต่อมาเสริมใน `06a677e` — `engineRobustness.test.ts`) |
| D81 ออฟไลน์ล้วน — เฟส 1/5 ชั้นข้อมูล | ✅ | ตัด sync engine/คิว/เคอร์เซอร์/สถานะซิงก์ + migration `0004`/`0005` — `__tests__/db/migrations.test.ts` (อัปเกรดฐานข้อมูลยุคซิงก์), `repos.test.ts` (ไม่มีคิวซิงก์); T07 ถูกแทนที่ |
| D81 ออฟไลน์ล้วน — เฟส 2/5 ไม่มีล็อกอิน | ✅ | ตัด Supabase Auth/Google/Apple/หน้าล็อกอิน/ล็อกเอาต์; RevenueCat นิรนาม ซื้อ/กู้คืนโดยไม่ล็อกอิน; `/delete-data` ลบข้อมูลทั้งหมดในเครื่อง + migration `0006` (D81.2) — `__tests__/flows/account.test.ts`, `offline-access.test.ts`, `app/paywall.test.tsx`, `app/delete-data.test.tsx`, `features/deleteAllData.test.ts`, `features/useRestorePurchases.test.tsx`, `app/onboarding-entitled.test.tsx`, `db/migrations.test.ts`; ยังเหลือ: โฟลเดอร์ `supabase/` + เทสต์ `__tests__/supabase/*`, ข้อความนโยบายความเป็นส่วนตัว/ข้อกำหนด และเอกสาร ARCHITECTURE/HUMAN_TASKS/FINAL_CHECK ที่ยังพูดถึงล็อกอิน (เฟสถัดไปของ D81) |
| D81 ออฟไลน์ล้วน — เฟส 3/5 ตัดฝั่งเซิร์ฟเวอร์ | ✅ | ลบ `supabase/`, Edge Functions, `verify-supabase.sh`, `sync-shared.js` และตัวแปลงเหตุการณ์ webhook ใน state machine (D81.3) — `__tests__/domain/entitlement.test.ts`; `expo export` + `expo prebuild` (android) ผ่าน; T08 ถูกแทนที่ |
| T08 Supabase backend | ✅ | `8d2ae66` — `__tests__/supabase/*`, `npm run supabase:verify` (Postgres 16 จริง), `deno check` |
| T09 ตั้งค่าเริ่มต้น | ✅ | `631ffaa`, `fb8c8f7` — `__tests__/app/onboarding.test.tsx` (+ `onboarding-entitled.test.tsx` จาก `96d13a9`) |
| T10 Paywall/ล็อกอิน/บัญชี/กฎหมาย | ✅ | `3565f00` — `__tests__/app/paywall.test.tsx`, `gate.test.tsx`, `__tests__/flows/account.test.ts` |
| T11 หน้าแรก | ✅ | `766b0e3` — `__tests__/app/today-programs.test.tsx` |
| T12 โปรแกรม/ตาราง/คลังท่า | ✅ | `766b0e3` — `__tests__/app/today-programs.test.tsx` (+ `programs-audit.test.tsx` จาก `2d7a945`) |
| T13 เซสชัน | ✅ | `512c94a` — `__tests__/app/session.test.tsx` |
| T14 สถิติ + ประวัติ | ✅ | `5b2eaac` — `__tests__/app/stats.test.tsx` |
| T15 ตั้งค่า + โปรไฟล์ + CSV | ✅ | `0807783` — `__tests__/app/settings.test.tsx`, `__tests__/domain/csv.test.ts` |
| T16 Accessibility + ตรวจภาพ | ✅ | `dbbda16` — `npm run contrast`, `__tests__/theme/contrast.test.ts`, `docs/screenshots/` |
| T17 เตรียมสโตร์ | ✅ | เอกสารครบ: [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) (เช็กลิสต์ SPEC N1–N6 ทีละข้อ + คำสั่งตรวจ), [TEST_PLAN.md](TEST_PLAN.md) (ทดสอบบนเครื่องจริง P-01…), [HUMAN_TASKS.md](HUMAN_TASKS.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), `store-metadata/` (README, app-names, listing.en/th, privacy-labels, play-declarations, review-notes, screenshots, icon, `check-limits.js`), กฎหมาย → `docs/legal/` + `src/legal/content.ts` + guard `RELEASE=1 npm test` · commits `069acc7`, `2c61f71`, `00b1cf7`, `aca0949`, `213b7d4` (fact-check กับโค้ด), `bb1aacb`, `546f0b8`, `0d88f30`; privacy manifest/guard `06a677e` · `eas.json` + `app.config.ts` (D46, D74) · **สิ่งที่ยังเหลือเป็นงานมนุษย์** (placeholder ผู้พัฒนา/อีเมล/URL, ชื่อแอปจริง, ภาพหน้าจอจาก build จริง) |
| T18 ตรวจสุดท้าย | ✅ | ผลตรวจอัตโนมัติด้านล่าง (check / contrast / supabase:verify / deno check / expo export iOS+Android / prebuild iOS+Android ผ่านทั้งหมด, D21) · รายงานตรวจย้อนกลับทุกข้อของสเปค: [FINAL_CHECK.md](FINAL_CHECK.md) (กำลังเขียนโดยเอเจนต์อีกตัว) |

## รอบแก้ตามผลตรวจสเปค (audit-fix)

หลัง T16 มีการตรวจย้อนกลับกับ SPEC เป็นรอบๆ แต่ละรอบแก้บนสาขา `audit-fix/*` แล้วรวมกลับ — เหตุผลและความเสี่ยงของแต่ละการตัดสินใจอยู่ใน [DECISIONS.md](DECISIONS.md)

| รอบ | commit | เนื้อหา | DECISIONS |
|---|---|---|---|
| 0 Accessibility/ภาพ (T16) | `dbbda16`, `069acc7` | transaction ซ้อนได้, พรีวิวเว็บ, สี AA, ราคา Paywall ไม่ถูกตัด, ลดสิทธิ์ native | D42–D46 |
| 1 สิทธิ์และลบบัญชี | `855b81c` | mock ใน release, เปิดแอปออฟไลน์ตอนโทเค็นหมดอายุ, ความสดของ RevenueCat, ตรวจสิทธิ์ตอนหมดอายุขณะเปิดแอป, ปุ่มล็อกอินเด่นเท่ากัน, ข้อมูลที่ลบตอนลบบัญชี | D47–D52 |
| 2 เซสชัน/progression | `49dab13` | บันทึกเป้าครั้งหน้าตอนจบ (`workout_session.progression`), สลับท่าเก็บเซ็ตที่ทำแล้ว, เป้า custom ตามสัปดาห์จริง, เซสชันที่จบแล้วเปิดไปหน้าสรุป | D53–D56 (+ แก้ D30) |
| 3 UI | `d434ddd` | ปุ่ม ≥ 48, ข้อความรองบนแสงเรือง, override หลายแถว/routine ที่ถูกลบ | D57–D59 |
| 4 Paywall + สิทธิ์ | `d3f6c65`, `e3c5e5d`, merge `8e8f293`/`c7f2171` | ยอดเรียกเก็บเด่น, อัปเกรดซื้อขาด, แก้การชำระเงิน, ผูกบัญชีแล้วพบสิทธิ์, ซื้อขาดที่คืนเงิน, webhook TRANSFER, ป้ายวันต่ออายุ, เตือนรายเดือนซ้อนซื้อขาด | D60–D66 |
| 5 เซสชัน (ต่อ) | `be3ae3d` | บันทึกย้อนหลังเลือก routine, ลบเซ็ต, ตั้งค่าท่าในเซสชัน, คำอธิบาย RIR/RPE, ปรับเป้าไม่ทับค่าที่พิมพ์ | D70 |
| 6 โปรแกรม/ท่า | `2d7a945`, merge `88bce89` | ไอคอนกล้ามเนื้อ, แก้ท่าที่สร้างเอง, ตัวเลือกขั้นสูงหลัง 'เพิ่มเติม', RIR/RPE | D71 |
| 7 ตั้งค่าเริ่มต้น | `96d13a9`, merge `3cb4c4f` | ข้ามขั้นโปรไฟล์ล้างข้อมูล, ไม่ย้ายร่างกลางทาง, กลับเข้าขั้นตั้งค่าสำหรับผู้มีสิทธิ์, 'แก้ไขการตั้งค่าเริ่มต้น' | D67–D69 |
| 8 Sync | `06a677e`, merge `a28f6e6` | outbox version, ส่งทีละแถว, รวมแถวซ้ำ, privacy manifest, guard เอกสารกฎหมาย, ล้าง `revenuecat_events` 90 วัน, Stepper a11y | D73, D74 |
| 9 สถิติ/โปรไฟล์ | `5dcc15a`, merge `395d319` | 'เพิ่มเติม' ในโปรไฟล์, คำเตือน + แหล่งอ้างอิงทุกหน้าผลคำนวณ, ส่งต่อตัวกรองกรุ๊ป/ช่วงเวลาไปความแข็งแรงและประวัติ, สีกราฟ 12 สี | D72 |
| รวมสุดท้าย | `b683352`, `fc98e06` | แก้เทสต์/lint หลังรวม; บันทึก D60–D74 | — |

## ผลตรวจล่าสุด (2026-10-11)

| รายการ | ผล |
|---|---|
| `npm run check` (typecheck + lint + jest) | ผ่าน — 55 ชุดเทสต์, 682 ข้อผ่าน + 1 ข้ามโดยตั้งใจ (guard `RELEASE` ของเอกสารกฎหมายใน `__tests__/legal.test.ts` ทำงานเฉพาะเมื่อ `RELEASE=1`) |
| `npm run contrast` | ผ่านทุกสีหลักทั้งสองโหมด (ตรวจซ้ำตอนปรับเอกสารนี้: "ALL CONTRAST CHECKS PASSED") |
| `npm run supabase:verify` | ผ่าน — migration ทั้ง 3 ไฟล์ + `supabase/tests/rls_test.sql` บน Postgres จริง |
| `deno check` (Edge Functions) | ผ่าน |
| `expo export` iOS / Android | ผ่านทั้งสองแพลตฟอร์ม |
| `expo prebuild` iOS / Android | ผ่านทั้งสองแพลตฟอร์ม (สภาพแวดล้อมนี้ไม่มี Xcode/Android SDK จึง build จริงไม่ได้ — D21) |

หมายเหตุ: ตัวเลขเทสต์/ผล `check`, `supabase:verify`, `deno check`, export และ prebuild มาจากการรันของเจ้าของงานในรอบปิดงาน (เอกสารนี้ไม่ได้รันชุดเทสต์ทั้งหมดซ้ำ) จำนวนชุดเทสต์ 55 ตรวจกับ `__tests__/` แล้ว

## TODO ที่ค้างในโค้ด
(ไม่มี — `grep -rn "TODO\|FIXME" src supabase scripts` ว่าง ตรวจซ้ำเมื่อ 2026-10-11)
