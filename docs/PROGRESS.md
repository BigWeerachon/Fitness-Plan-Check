# ความคืบหน้า (PROGRESS)

> อัปเดตหลังจบทุกงาน — ถ้าเซสชันขาด: อ่านไฟล์นี้แล้วทำงานที่ "เหลือ" ต่อตาม [TASKS.md](TASKS.md) · ตรวจกับโค้ดและ git log ณ วันที่ 2026-10-14 (แอปออฟไลน์ล้วน D81 ครบ 5 เฟส — [SPEC_CHANGES.md](SPEC_CHANGES.md) มีผลเหนือ SPEC)

## สถานะล่าสุด
- **เสร็จ:** P1, P2, T01–T18 และรอบแก้ตามผลตรวจสเปค 10 รอบ (ตารางด้านล่าง) แล้วเปลี่ยนเป็นแอปออฟไลน์ล้วนตามการตัดสินของเจ้าของ 2026-10-14 (D81 เฟส 1–5: ชั้นข้อมูล, ไม่มีล็อกอิน, ตัดฝั่งเซิร์ฟเวอร์, สำรอง/กู้คืนเป็นไฟล์, เอกสาร/กฎหมาย/สโตร์) — T07 (sync) และ T08 (Supabase) ถูกแทนที่
- **กำลังทำ:** ไม่มีงานโค้ดค้าง
- **เหลือ (ต้องใช้มนุษย์):** ทุกอย่างใน [HUMAN_TASKS.md](HUMAN_TASKS.md) (ข้อ 1–62 — RevenueCat, สโตร์, ราคา, build จริงด้วย EAS, โฮสต์หน้ากฎหมาย), ทดสอบซื้อ/กู้คืน/สำรอง/ลบข้อมูลบนอุปกรณ์จริงตาม [TEST_PLAN.md](TEST_PLAN.md), กรอก placeholder ของ `store-metadata/` แล้วทำตาม [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) และตัดสิน [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) Q13, Q15, Q17, Q18, Q21–Q25 (โดยเฉพาะ Q21 ป้ายความเป็นส่วนตัวของ RevenueCat ก่อนส่งรีวิว)

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
| T07 Sync engine | ⛔ ถูกแทนที่ (D81) | เดิม `149417f` — `__tests__/sync/engine.test.ts`, `cursor.test.ts` (ต่อมาเสริมใน `06a677e` — `engineRobustness.test.ts`) |
| D81 ออฟไลน์ล้วน — เฟส 1/5 ชั้นข้อมูล | ✅ | ตัด sync engine/คิว/เคอร์เซอร์/สถานะซิงก์ + migration `0004`/`0005` — `__tests__/db/migrations.test.ts` (อัปเกรดฐานข้อมูลยุคซิงก์), `repos.test.ts` (ไม่มีคิวซิงก์); T07 ถูกแทนที่ |
| D81 ออฟไลน์ล้วน — เฟส 2/5 ไม่มีล็อกอิน | ✅ | ตัด Supabase Auth/Google/Apple/หน้าล็อกอิน/ล็อกเอาต์; RevenueCat นิรนาม ซื้อ/กู้คืนโดยไม่ล็อกอิน; `/delete-data` ลบข้อมูลทั้งหมดในเครื่อง + migration `0006` (D81.2) — `__tests__/flows/account.test.ts`, `offline-access.test.ts`, `app/paywall.test.tsx`, `app/delete-data.test.tsx`, `features/deleteAllData.test.ts`, `features/useRestorePurchases.test.tsx`, `app/onboarding-entitled.test.tsx`, `db/migrations.test.ts`; ส่วนที่เหลือตอนจบเฟสนี้ (`supabase/`, นโยบายฯ/ข้อกำหนด, เอกสารที่ยังพูดถึงล็อกอิน) ปิดในเฟส 3 และ 5 แล้ว |
| D81 ออฟไลน์ล้วน — เฟส 3/5 ตัดฝั่งเซิร์ฟเวอร์ | ✅ | ลบ `supabase/`, Edge Functions, `verify-supabase.sh`, `sync-shared.js` และตัวแปลงเหตุการณ์ webhook ใน state machine (D81.3) — `__tests__/domain/entitlement.test.ts`; `expo export` + `expo prebuild` (android) ผ่าน; T08 ถูกแทนที่ |
| D81 ออฟไลน์ล้วน — เฟส 4/5 สำรอง/กู้คืนเป็นไฟล์ | ✅ | ไฟล์สำรอง JSON มีเวอร์ชัน + แชร์ผ่านหน้าแชร์ของระบบ, กู้คืนจากไฟล์ (ตรวจ/สรุป/ยืนยัน/แทนที่ในทรานแซกชันเดียว) ในหน้าตั้งค่าและหน้าบัญชีที่เข้าได้แม้ล็อก + วันที่สำรองล่าสุด (D82) — `__tests__/domain/backup.test.ts`, `db/backup.test.ts` (round-trip กับ SQLite จริง + rollback), `features/useBackup.test.tsx`, `app/backup.test.tsx`; ยังไม่ได้ทดสอบบนเครื่องจริง (หน้าแชร์/ตัวเลือกไฟล์ของ iOS/Android) |
| D81 ออฟไลน์ล้วน — เฟส 5/5 เอกสาร กฎหมาย สโตร์ | ✅ | [SPEC_CHANGES.md](SPEC_CHANGES.md) (ทุกข้อของ SPEC ที่ถูกแทนที่), CLAUDE.md, D83–D84, นโยบายความเป็นส่วนตัว/ข้อกำหนดฉบับออฟไลน์ (`src/legal/content.ts` → `docs/legal/`), privacy manifest เหลือ UserID + PurchaseHistory, `store-metadata/` (ป้ายความเป็นส่วนตัว, Data safety, App Review Notes ไม่มีบัญชีทดสอบ, ข้อความหน้าร้าน), HUMAN_TASKS เขียนใหม่ ข้อ 1–62, ARCHITECTURE/DATA_MODEL/SCREENS/TEST_PLAN/OPEN_QUESTIONS/FINAL_CHECK/RELEASE_CHECKLIST — `__tests__/legal.test.ts`, `appConfig.test.ts`, `node store-metadata/check-limits.js` |
| T08 Supabase backend | ⛔ ถูกแทนที่ (D81.3) | เดิม `8d2ae66` — ลบ `supabase/` และเทสต์ทั้งหมดแล้ว |
| T09 ตั้งค่าเริ่มต้น | ✅ | `631ffaa`, `fb8c8f7` — `__tests__/app/onboarding.test.tsx` (+ `onboarding-entitled.test.tsx` จาก `96d13a9`) |
| T10 Paywall/ล็อกอิน/บัญชี/กฎหมาย | ✅ (ล็อกอินถูกตัดใน D81.2) | `3565f00` — `__tests__/app/paywall.test.tsx`, `gate.test.tsx`, `__tests__/flows/account.test.ts` |
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

## ผลตรวจล่าสุด (2026-10-15, หลัง D81 เฟส 5)

| รายการ | ผล |
|---|---|
| `npm run check` (typecheck + lint + jest) | ผ่าน — 60 ชุด / 722 ข้อ: ผ่าน 721 + ข้าม 1 (ข้ามโดยตั้งใจ: guard `RELEASE` ของเอกสารกฎหมายใน `__tests__/legal.test.ts` ทำงานเฉพาะเมื่อ `RELEASE=1`) |
| `node store-metadata/check-limits.js` | ผ่านทุกช่อง (เหลือ placeholder ที่เจ้าของต้องกรอก 10 ชนิด — รายการใน `store-metadata/README.md`) |
| `npm run legal:export` | สร้าง `docs/legal/*.md` ใหม่จาก `src/legal/content.ts` ฉบับออฟไลน์ |
| `npm run contrast` | ผ่านทุกสีหลักทั้งสองโหมด (รอบ 2026-10-11 — เฟส D81 ไม่ได้แก้สี) |
| `expo export` / `expo prebuild` | ผ่านหลังตัดฝั่งเซิร์ฟเวอร์ (D81 เฟส 3) — สภาพแวดล้อมนี้ไม่มี Xcode/Android SDK จึง build จริงไม่ได้ (D21) |
| `npm run supabase:verify`, `deno check` | ไม่มีแล้ว (ตัด Supabase — D81.3) |

## TODO ที่ค้างในโค้ด
(ไม่มี — `grep -rn "TODO\|FIXME" src scripts` ว่าง ตรวจซ้ำเมื่อ 2026-10-14)
