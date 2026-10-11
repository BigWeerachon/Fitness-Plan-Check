# TEST_PLAN — แผนทดสอบ Fitnese

> เอกสารนี้ตอบ SPEC **N3** (ทดสอบการซื้อและช่วงทดลองทุกสถานะด้วย Apple sandbox / TestFlight และ Google license testers), **N5** (accessibility) และ **N8** (คุณภาพ/เทสต์อัตโนมัติ) และเป็นคู่มือที่ `docs/HUMAN_TASKS.md` ส่วน Q (ข้อ 68–71) อ้างถึง
>
> **ป้ายในเอกสาร** เขียนเป็น `"ข้อความอังกฤษ" / "ข้อความไทย"` ตามไฟล์ `src/i18n/locales/en|th/*.ts` และ `testID` เขียนในเครื่องหมาย `` ` `` (เช่น `paywall-cta`) ส่วนเส้นทางเขียนแบบ Expo Router (เช่น `/paywall`, `/legal/[doc]`)
>
> **ป้ายที่มาพร้อมรุ่นนี้** (แถว "Get lifetime", ข้อความ "fix payment", "Edit setup", ลิงก์ "Sources", ปุ่ม "More") มาจากโค้ดที่กำลัง merge พร้อมกัน ตอนทดสอบให้ใช้ข้อความจริงที่แอปแสดง (คีย์ใหม่ใน `src/i18n/locales/en|th`) ถ้าพฤติกรรมไม่ตรงกับที่เขียนไว้ ให้บันทึกเป็น "ไม่ผ่าน" และแจ้งผู้พัฒนา

## สารบัญ

0. [เตรียมก่อนทดสอบ](#0-เตรียมก่อนทดสอบ)
1. [ตรวจอัตโนมัติ (N8)](#1-ตรวจอัตโนมัติ-n8)
2. [ทดสอบบนอุปกรณ์จริง: สมาชิก สิทธิ์ บัญชี ซิงก์ (N3)](#2-ทดสอบบนอุปกรณ์จริง-สมาชิก-สิทธิ์-บัญชี-ซิงก์-n3)
3. [Accessibility (N5)](#3-accessibility-n5)
4. [ภาษา ธีม และขนาดจอ](#4-ภาษา-ธีม-และขนาดจอ)
5. [เช็กลิสต์ regression ก่อนทุก release](#5-เช็กลิสต์-regression-ก่อนทุก-release)
6. [แบบฟอร์มบันทึกผล](#6-แบบฟอร์มบันทึกผล)

---

## 0. เตรียมก่อนทดสอบ

### 0.1 build ที่ใช้

| ใช้ทดสอบ | build | ทำตาม |
|---|---|---|
| ระหว่างพัฒนา + ซื้อด้วยบัญชี sandbox | development build (`eas build --profile development`) + `npm start` + `.env` คีย์จริง `EXPO_PUBLIC_USE_MOCKS=0` | HUMAN_TASKS ข้อ 39–40 |
| พฤติกรรมเหมือน release | `preview` (Android APK / iOS internal) | ข้อ 65 |
| ก่อนส่งรีวิว | TestFlight (iOS) / Internal testing ของ Play (Android) จาก build `production` | ข้อ 66–67 |

**ห้ามทดสอบส่วนที่ 2 ในโหมด mock** วิธีดูว่าไม่ใช่ mock: กด `"Continue with Google"` แล้วต้องเห็นหน้าเลือกบัญชี Google จริง (ถ้าล็อกอินผ่านทันทีโดยไม่มีหน้าใด = ยังเป็น mock) และ Paywall ไม่ควรแสดงราคา `฿19.00 / ฿99.00` ของสโตร์จำลอง (D20) เว้นแต่ราคาที่ตั้งจริงบังเอิญเท่ากัน — release build บนมือถือไม่ใช้ mock เด็ดขาด (D47, `__tests__/services/config.test.ts`)

### 0.2 บัญชีและเครื่องที่ต้องมี

- **iOS:** บัญชี sandbox หลายบัญชี (ข้อ 68) — ใช้บัญชีใหม่ทุกครั้งที่ต้องการ "ลูกค้าใหม่ที่มีสิทธิ์ทดลอง" ล็อกอิน sandbox ที่ iPhone: Settings → App Store → Sandbox Account (iOS รุ่นใหม่อาจอยู่ที่ Settings → Developer → Sandbox Apple Account) · TestFlight ใช้ Apple ID จริงของผู้ทดสอบแต่ซื้อในสภาพแวดล้อม sandbox (ไม่เสียเงิน)
- **Android:** บัญชี Gmail ที่เป็น License tester และอยู่ในรายชื่อ Internal testing (ข้อ 69) ต้องเป็นบัญชีหลักของ Play Store ในเครื่อง
- **บัญชีล็อกอินแอป:** บัญชี Google อย่างน้อย 2 บัญชี และ Apple ID อย่างน้อย 1 บัญชี (บัญชีล็อกอินแอปแยกจากบัญชีสโตร์ได้)
- **เครื่อง:** iPhone 1 เครื่อง + Android 1 เครื่องเป็นขั้นต่ำ (ใช้ทดสอบ "เปลี่ยนเครื่อง" และ "ซิงก์ 2 เครื่อง" ข้ามแพลตฟอร์มได้) ถ้ามีเครื่องที่สองของแพลตฟอร์มเดียวกันจะทดสอบ restore ได้ครบกว่า

### 0.3 ที่ดูผลระหว่างทดสอบ

| ที่ | ดูอะไร |
|---|---|
| แอป → แท็บ Settings (`tab-settings`) → ส่วน `"Membership"` / `"สมาชิก"` → แถว `settings-membership` | ชื่อสถานะ + วันที่ (B7) |
| แอป → แท็บ Settings → ส่วน `"Your data"` / `"ข้อมูลของคุณ"` → แถว `settings-sync` | สถานะซิงก์ (ตาราง 0.5) + `"Last synced …"` + `"N changes waiting to upload"` / `"รออัปโหลด N รายการ"` |
| แอป → `/account` (ไอคอนเฟือง `"Account & settings"` / `"บัญชีและการตั้งค่า"` บน Paywall) | เข้าได้เสมอแม้ถูกล็อก: สถานะสมาชิก, `"Restore purchases"` (`account-restore`), `"Manage subscription"`, ล็อกอิน/ล็อกเอาต์, ลบบัญชี |
| แอป → แท็บ Today (`today`) | ป้ายเล็กใต้หัวข้อ (B7) |
| RevenueCat → Customers → ค้นหาด้วย id ผู้ใช้ Supabase (UUID จาก Supabase → Authentication → Users) | entitlement `pro`, period type (trial/normal), วันหมดอายุ, ประวัติเหตุการณ์, Integrations → Webhooks (ผลการส่ง) |
| Supabase → Table Editor → `user_entitlements` | `state`, `expiration_at`, `will_renew`, `billing_issue_at`, `last_event_id` ที่ webhook เขียน (ใช้ตัดสินสิทธิ์ซิงก์คลาวด์ `has_sync_access`) |
| Supabase → Table Editor → `revenuecat_events` | `type` ของเหตุการณ์ที่ได้รับ (กันซ้ำด้วย id) |
| Supabase → Edge Functions → `revenuecat-webhook` / `delete-account` → Logs | error ของ webhook / การลบบัญชี |

แอปตัดสินสิทธิ์จาก RevenueCat SDK โดยตรง (`src/domain/entitlement/machine.ts`) ส่วน `user_entitlements` บน Supabase ใช้จำกัดการซิงก์คลาวด์ (J6) — **ทุกเคสในส่วนที่ 2 ต้องตรวจทั้งสองฝั่ง** แอปตรวจสิทธิ์ใหม่ทุกครั้งที่กลับเข้าแอป (foreground) และเมื่อกลับมาออนไลน์ จึงให้สลับแอปออกแล้วกลับเข้ามาหลังเปลี่ยนสถานะในสโตร์

### 0.4 สถานะสิทธิ์ (B8) → สิ่งที่ผู้ใช้ต้องเห็น

| สถานะ | แถว Membership (`settings-membership` / `/account`) | ป้ายบน Today | เข้าแอปได้ | ซิงก์คลาวด์ได้ |
|---|---|---|---|---|
| `NO_ENTITLEMENT` | `"No active plan"` / `"ยังไม่มีแพ็กเกจ"` | — | ไม่ → `/paywall` | ไม่ |
| `TRIALING` | `"Free trial"` / `"ทดลองใช้ฟรี"` + `"Trial ends {date}, then renews monthly"` / `"ช่วงทดลองสิ้นสุด {date} จากนั้นต่ออายุรายเดือน"` (ถ้ายกเลิกแล้ว: `"Trial ends {date}"` / `"ช่วงทดลองสิ้นสุด {date}"`) | `"Trial ends {date}"` / `"ทดลองถึง {date}"` | ได้ | ได้ |
| `SUBSCRIBED_MONTHLY` | `"Monthly"` / `"รายเดือน"` + `"Renews {date}"` / `"ต่ออายุ {date}"` (ถ้ายกเลิกแล้ว: `"Access until {date}"` / `"ใช้ได้ถึง {date}"`) | เฉพาะเมื่อยกเลิกแล้ว: `"Access until {date}"` / `"ใช้ได้ถึง {date}"` | ได้ | ได้ |
| `LIFETIME` | `"Lifetime"` / `"ซื้อขาด"` + `"Unlocked forever"` / `"ปลดล็อกถาวร"` | — | ได้ | ได้ |
| `BILLING_GRACE` | `"Payment issue"` / `"มีปัญหาการชำระเงิน"` + `"Update your payment by {date} to keep access"` / `"อัปเดตการชำระเงินภายใน {date} เพื่อใช้งานต่อ"` | `"Payment issue"` / `"มีปัญหาการชำระเงิน"` (โทนเตือน) | ได้ | ได้ |
| `EXPIRED` | `"Expired"` / `"หมดอายุแล้ว"` + `"Ended {date}"` / `"สิ้นสุดเมื่อ {date}"` | — | ไม่ → `/paywall` หัวข้อ `"Welcome back — pick up where you left off"` / `"ยินดีต้อนรับกลับ — ฝึกต่อจากเดิมได้เลย"` (ถ้าหมดเพราะปัญหาการชำระเงิน มีข้อความชวน "fix payment" เพิ่ม) | ไม่ (ข้อมูลบนคลาวด์ยังอยู่) |

วันที่ภาษาไทยแสดงเป็น พ.ศ. (เช่น `16 ต.ค. 2569`) ภาษาอังกฤษเป็น `Oct 16, 2026` (`src/i18n/format.ts`)

### 0.5 สถานะซิงก์ (แถว `settings-sync`)

| สถานะ | อังกฤษ / ไทย | ความหมาย |
|---|---|---|
| idle | `"Up to date"` / `"ข้อมูลเป็นปัจจุบัน"` | ส่งและดึงครบ |
| syncing | `"Syncing…"` / `"กำลังซิงก์…"` | กำลังทำงาน |
| offline | `"Offline — changes are saved on this device"` / `"ออฟไลน์ — บันทึกไว้ในเครื่องแล้ว"` | ไม่มีเน็ต คิวยังอยู่ ลองใหม่อัตโนมัติ |
| waiting | `"Waiting for your membership to be confirmed"` / `"รอยืนยันสถานะสมาชิก"` | เซิร์ฟเวอร์ยังไม่ยืนยันสิทธิ์ (webhook ยังไม่มา/ล้ม) — ข้อมูลยังอยู่ในเครื่อง ลองใหม่อัตโนมัติ |
| error | `"Sync problem — we’ll retry automatically"` / `"ซิงก์มีปัญหา — จะลองใหม่อัตโนมัติ"` | error อื่นของเซิร์ฟเวอร์ |
| disabled | `"Sync is off — data is kept on this device"` / `"ปิดซิงก์อยู่ — ข้อมูลยังอยู่ในเครื่องครบ"` | ไม่ได้ล็อกอินหรือไม่มีสิทธิ์ |

ลองใหม่อัตโนมัติด้วยระยะรอ 5 วินาที → 15 วินาที → 1 นาที → 5 นาที → 10 นาที (`BACKOFF_MS` ใน `src/features/sync/engine.ts`) หรือกด `"Sync now"` / `"ซิงก์ตอนนี้"` (`settings-sync-now`)

### 0.6 เวลาเร่งของ sandbox (ต้องตรวจเอกสารปัจจุบันก่อนทดสอบ)

Apple และ Google ย่อเวลาต่ออายุในสภาพแวดล้อมทดสอบ ตัวเลขด้านล่างเป็น **ค่าที่เคยประกาศไว้ อาจเปลี่ยนแล้ว** — ก่อนทดสอบให้เปิดเอกสาร "Testing in-app purchases with sandbox" / "Testing in-app purchases with TestFlight" ของ Apple และ "Test Google Play Billing (license testers)" ของ Google แล้วจดค่าจริงลงบันทึกผล

| ระยะเวลาจริง | Apple sandbox (ค่าเดิมที่ทราบ) | Google license tester (ค่าเดิมที่ทราบ) |
|---|---|---|
| ทดลองฟรี 1 สัปดาห์ / 7 วัน | ~3 นาที | ~3 นาที |
| รอบบิล 1 เดือน | ~5 นาที | ~5 นาที |
| ต่ออายุอัตโนมัติได้กี่รอบก่อนหยุดเอง | ~12 รอบ (หน้าผู้ทดสอบ sandbox ใน App Store Connect หรือในเครื่องอาจปรับอัตราต่ออายุได้) | ~6 รอบ |
| grace period / account hold | ใช้ตามที่ตั้งในข้อ 45 (ต้องเลือก Server Environments = Sandbox and Production) | ย่อเหลือหลักนาที |
| TestFlight | ใช้อัตราต่ออายุของ TestFlight เอง (ต่างจาก sandbox) — ตรวจเอกสาร | — |

### 0.7 ข้อมูลที่ควรสร้างไว้ก่อน (เพื่อดูว่าข้อมูลไม่หาย)

หลังได้สิทธิ์ครั้งแรกในแต่ละบัญชี ให้สร้าง "ชุดข้อมูลตรวจ" นี้ แล้วใช้ตรวจหลังทุกเคสที่สิทธิ์หมด/เปลี่ยนเครื่อง/ติดตั้งใหม่:

1. แท็บ Programs (`tab-programs`) → `"Start from a template"` / `"เริ่มจากเทมเพลต"` → เลือก PPL → `"Use this template"` / `"ใช้เทมเพลตนี้"` (`use-template-ppl3`)
2. Today → การ์ด routine ของวันนี้ → ปุ่มวงกลม `"Start"` / `"เริ่ม"` (`start-<id>`) → ติ๊ก 2 เซ็ต (`tick-<exerciseId>-0`, `-1`) → `"Finish workout"` / `"จบเซสชัน"` (`session-finish`) → เลือกความหนัก → `"Save workout"` / `"บันทึกเซสชัน"` (`session-save`)
3. Stats → `"Log today’s weight"` / `"บันทึกน้ำหนักวันนี้"` (`stats-log-weight`) ใส่ค่า
4. จดชื่อโปรแกรม, จำนวนเซสชันใน History (`/history`) และน้ำหนักล่าสุด (`stats-latest-weight`)

---

## 1. ตรวจอัตโนมัติ (N8)

### 1.1 คำสั่ง

| คำสั่ง | ทำอะไร | พิสูจน์อะไร | ต้องมี |
|---|---|---|---|
| `npm run check` | `npm run typecheck && npm run lint && npm run test -- --ci` | ผ่านทั้งสามอย่าง = พร้อม commit (กฎใน `CLAUDE.md`) | Node 22, `npm ci` |
| `npm run typecheck` | `tsc --noEmit` (strict) | ชนิดถูกทั้งโปรเจกต์ รวมเส้นทางแบบ typed routes ของ Expo Router | — |
| `npm run lint` | `expo lint --max-warnings 0` | ไม่มี warning, รูปแบบ prettier, ไม่มีข้อความฮาร์ดโค้ดใน JSX หรือ prop `accessibilityLabel/placeholder/title/label` (ข้อความทั้งหมดมาจาก i18n) | — |
| `npm test` | jest — SQLite จริงผ่าน better-sqlite3, service (auth/สโตร์/ซิงก์) จำลอง | รายการชุดเทสต์ในข้อ 1.2 | — |
| `RELEASE=1 npm test` | เปิดตัวกันพลาดก่อนส่งสโตร์ (มากับรุ่นนี้) | **ล้มเหลวถ้ายังมีค่า placeholder** ใน `PLACEHOLDERS` ของ `src/legal/content.ts` (`[ชื่อผู้พัฒนา / Developer name]` ฯลฯ) — ผ่านเมื่อกรอกครบตามข้อ 12 | — |
| `npm run contrast` | `tsx scripts/contrast-report.ts` | พิมพ์ตาราง contrast ของสีหลักทั้ง 8 สี × โหมดมืด/สว่าง (ข้อความบนพื้น/การ์ด/แสงเรือง/ปุ่ม/chip ที่เลือก ≥ 4.5:1, กราฟบนการ์ด ≥ 3:1) และปุ่มล็อกอิน Google/Apple — **จบด้วย exit code 1 ถ้ามีค่าใดไม่ผ่าน WCAG AA** | — |
| `npm run supabase:verify` | `scripts/verify-supabase.sh`: เปิด Postgres ชั่วคราว → `supabase/tests/supabase_stubs.sql` → `supabase/migrations/*.sql` → `supabase/tests/rls_test.sql` | บน Postgres จริง: (1) ไม่มีสิทธิ์ = เขียนไม่ได้ (2) ช่วงทดลองอ่าน/เขียนของตัวเองได้ เขียนแทนคนอื่นไม่ได้ (3) last-write-wins: ฉบับเก่าถูกข้าม ลบจริงไม่ได้ เปลี่ยนเจ้าของไม่ได้ (4) อีกบัญชีมองไม่เห็นข้อมูล ผู้ใช้แก้สิทธิ์ตัวเองไม่ได้ (5) สิทธิ์หมด = คลาวด์ล็อกแต่ข้อมูลยังอยู่ ทดลองที่เลยวันหมดอายุถือว่าไม่มีสิทธิ์ (6) anon เข้าไม่ได้ (7) ลบบัญชี = ลบข้อมูลตาม (cascade) | PostgreSQL 15+ (`PGBIN=/opt/homebrew/opt/postgresql@16/bin` บน macOS) ไม่ต้องมีบัญชี Supabase |
| `deno check supabase/functions/revenuecat-webhook/index.ts supabase/functions/delete-account/index.ts` | ตรวจชนิดของ Edge Functions ด้วย runtime Deno | โค้ดฝั่งเซิร์ฟเวอร์คอมไพล์ได้จริง (เทสต์ jest ตรวจเฉพาะ `logic.ts`) | Deno |
| `node scripts/sync-shared.js` | คัดลอก `src/domain/entitlement/machine.ts` → `supabase/functions/_shared/entitlement-machine.ts` | ใช้หลังแก้ state machine — `__tests__/shared.test.ts` ล้มเหลวถ้าสำเนาไม่ตรง | — |
| `npm run doctor` | `npx expo-doctor` | เวอร์ชันแพ็กเกจตรงกับ Expo SDK 57 | เครือข่าย |
| `npx expo export --platform ios --output-dir <โฟลเดอร์ชั่วคราว>` และ `--platform android` | bundle JS ของทั้งสองแพลตฟอร์ม (D21) | Metro หา import ครบ bundle ได้ — **ไม่ได้พิสูจน์ว่า native build ผ่าน** | — |
| `npx expo prebuild --clean --no-install` | สร้าง `ios/` และ `android/` จาก `app.config.ts` + config plugins (ทั้งสองโฟลเดอร์อยู่ใน `.gitignore` — ลบทิ้งหลังตรวจ) | plugin ทั้งหมดทำงาน: Sign in with Apple, URL scheme ของ Google, `blockedPermissions`, privacy manifest (`ios/*/PrivacyInfo.xcprivacy`) | — |
| `npx expo config --type introspect` | พิมพ์ config สุดท้าย | ตรวจ `ios.privacyManifests` และสิทธิ์ Android ตามเช็กลิสต์ข้อ 5.1 | — |
| `npm run preview:web` แล้ว `node scripts/web-screenshots.js <โฟลเดอร์> [en\|th] [dark\|light] [สีหลัก]` | พรีวิวเว็บในโหมด mock + ถ่ายภาพทุกหน้า (Playwright) | ตรวจภาพเร็วๆ เท่านั้น (D43) เว็บไม่ใช่แพลตฟอร์มที่ส่งสโตร์ ฟอนต์/สัดส่วนต่างจากเครื่องจริง | Playwright |
| `npm run legal:export` | เขียน `docs/legal/*.md` ใหม่จาก `src/legal/content.ts` | สำเนาเว็บตรงกับในแอป | — |

ไม่มีชุดเทสต์ E2E บนเครื่องจริง (Detox/Maestro) — ส่วนที่ 2–4 ต้องทดสอบด้วยมือ

### 1.2 ชุดเทสต์ใน `__tests__/`

นับ ณ วันที่ 2026-10-11 (ปลายเฟส 2) ได้ **55 ไฟล์** (jest รายงาน 682 ผ่าน + 1 ข้ามโดยตั้งใจ = guard ของเทมเพลตกฎหมายที่รันเฉพาะ `RELEASE=1`) ตัวเลขต่อไฟล์ด้านล่างเป็น snapshot ก่อนเพิ่มชุดเทสต์ของรอบแก้ท้าย ให้ดูบรรทัดสุดท้ายของ `npm run check` เป็นตัวเลขจริง และนับบล็อกด้วยคำสั่ง ด้วยคำสั่ง

```bash
for f in $(find __tests__ -name "*.test.ts*" | sort); do echo "$(grep -cE "(^|[^A-Za-z0-9_.])(it|test)(\.each)?[<(]" $f) $f"; done
```

(`grep -c "it("` เฉยๆ นับเกินเพราะไปเจอคำอย่าง `split(`) จำนวนที่ jest รายงานจะ **มากกว่านี้** เพราะ `it.each` แตกเป็นหลายเคส (ตัวเลข "34 ชุด / 487 ข้อ" ใน HUMAN_TASKS เป็นผลรันรอบก่อน) โค้ดที่ merge พร้อมรุ่นนี้เพิ่มเทสต์อีก — ใช้ผลบรรทัดสุดท้ายของ `npm run check` เป็นตัวเลขจริง

**หน้าจอ (React Native Testing Library + service จำลอง)**

| ไฟล์ | บล็อก | ตรวจอะไร |
|---|---|---|
| `app/gate.test.tsx` | 2 | เปิดครั้งแรกไป onboarding; ตั้งค่าเสร็จแต่ไม่มีสิทธิ์ไป Paywall (B3/B4) |
| `app/onboarding.test.tsx` | 4 | 3 ขั้นพร้อม preview สด → Paywall; ข้ามขั้น 2 ได้; ย้ายข้อมูลตั้งค่าเริ่มต้นเข้าบัญชีแบบ idempotent และไม่ทับข้อมูลที่มาจากคลาวด์ (B11) |
| `app/paywall.test.tsx` | 4 | ราคาจากสโตร์ + ข้อความเปิดเผยครบ; ล็อกอินก่อนซื้อแล้วกลับมาพร้อมแพ็กเกจเดิม; ไม่โฆษณาทดลองฟรีกับผู้เคยใช้แล้ว (B6); บัญชี/restore/กฎหมาย/แหล่งอ้างอิงเข้าได้โดยไม่มีแพ็กเกจ (B3) |
| `app/session.test.tsx` | 3 | แป้นตัวเลข ติ๊กเซ็ต (haptic) ตัวจับเวลาพัก จบพร้อมแคลอรี่และเป้าครั้งหน้า; ออกจากหน้าแล้วกลับมาต่อได้; เซสชันย้อนหลังถามระยะเวลา |
| `app/settings.test.tsx` | 5 | หน่วย/ตัวจับเวลาพัก/วันเริ่มสัปดาห์/ก้าวน้ำหนัก + สถานะสมาชิกและซิงก์; ตัวเลือกหน้าตาและสีเอง; ส่งออก CSV; ลิงก์โปรไฟล์/แหล่งอ้างอิง/ลบบัญชี + ยืนยันล็อกเอาต์; โปรไฟล์คำนวณ BMR/TDEE/เป้าแบบสด |
| `app/stats.test.tsx` | 3 | สัดส่วนรวม 100% จาก snapshot + ตัวกรองกรุ๊ป + ประวัติ + ลบ; เลื่อนช่วงเวลา สถานะว่าง พลังงานเทียบ TDEE บันทึกน้ำหนัก; มีกรุ๊ปเดียวใช้อัตโนมัติ |
| `app/today-programs.test.tsx` | 11 | Today (การ์ดวันนี้ + ปุ่มเริ่ม, เปลี่ยนใจเฉพาะวันนี้, override ชี้ routine ที่ถูกลบ, พหูพจน์, เช็กลิสต์กล้ามเนื้อ, กรอกแคลอรี่เอง, ยังไม่มีโปรแกรม) + Programs (สร้างจากเทมเพลต, ตารางสัปดาห์, คัดลอกวัน, สลับโปรแกรมทั้งสัปดาห์, แก้ routine) |
| `app/delete-account.test.tsx` | 1 | เตือนเรื่องสมาชิกในสโตร์ ต้องยืนยัน แล้วลบทั้งคลาวด์และในเครื่อง (B12) |

**ข้อมูลตั้งต้น**

| ไฟล์ | บล็อก | ตรวจอะไร |
|---|---|---|
| `data/exercises.test.ts` | 7 | คลังท่า 120–150 ท่า id ไม่ซ้ำ กล้ามเนื้อหลัก 1 กลุ่ม ชื่อ/คำอธิบายไทย-อังกฤษ ครบ 11 กลุ่ม มีชุดบอดี้เวท ค้นหา 2 ภาษา กรอง (F7–F9) |
| `data/templates.test.ts` | 4 | เทมเพลต PPL 3/6, Upper/Lower, Full Body 3, Bro Split, 5x5 ถูกต้อง แท็กประเภท routine อัตโนมัติ (F4–F5) |

**ฐานข้อมูลในเครื่อง**

| ไฟล์ | บล็อก | ตรวจอะไร |
|---|---|---|
| `db/migrations.test.ts` | 3 | รัน migration ครั้งเดียว, rollback เมื่อพัง, ไม่ยอมเปิดฐานข้อมูลที่ใหม่กว่าแอป |
| `db/repos.test.ts` | 15 | repository ทุกตัว: คัดลอก/ย้าย routine, soft delete ที่เก็บประวัติ, ตารางสัปดาห์และ override (รวมกรณี 2 เครื่องออฟไลน์), snapshot ชื่อ, แก้ระหว่างเซสชัน/ย้อนหลัง, จำกัดตามเจ้าของ, ทุกการเขียนเข้าคิวซิงก์ |
| `db/transaction.test.ts` | 4 | transaction ซ้อน (BEGIN + SAVEPOINT) commit/rollback ถูกชั้น |

**สูตรและตรรกะล้วน (`src/domain/`)**

| ไฟล์ | บล็อก | ตรวจอะไร |
|---|---|---|
| `domain/nutrition.test.ts` | 41 | BMR Mifflin-St Jeor, TDEE, แคลอรี่เป้าหมาย (อายุ < 18, เพดาน 1,200/1,500), macro, MET, แคลอรี่ที่กรอกเอง (H2–H3) |
| `domain/progression.test.ts` | 53 | double progression, linear + deload ~10%, กำหนดเองรายสัปดาห์, ปิด, เปลี่ยนโหมด, ยอมรับ/ข้าม, "ใช้เฉพาะวันนี้"/"ใช้ต่อไป" (G2) |
| `domain/stats.test.ts` | 45 | เปอร์เซ็นต์ largest remainder รวม 100 เสมอ (รวมเทสต์สุ่ม), 3 มุมมอง × 3 ตัวชี้วัด, ประวัติ, พลังงาน, น้ำหนักตัว, 1RM Epley, snapshot ไม่เปลี่ยนเมื่อแก้/ลบ routine (I1–I5) |
| `domain/periods.test.ts` | 25 | ช่วงวัน/สัปดาห์/เดือน/ปี, วันเริ่มสัปดาห์, เลื่อนช่วง, แท่งกราฟ |
| `domain/schedule.test.ts` | 28 | ตารางสัปดาห์, override ชนะตาราง, override หลายแถว, คัดลอก/สลับวัน, ประมาณเวลาเซสชัน (D, E) |
| `domain/entitlement.test.ts` | 22 | สิทธิ์ของทั้ง 6 สถานะ, แปลง customerInfo → สถานะ, ตารางเปลี่ยนสถานะจากเหตุการณ์ webhook, แคชออฟไลน์ + ผ่อนผัน 48 ชม. (B8–B9, J5) |
| `domain/paywall.test.ts` | 11 | ทดลองฟรีเฉพาะผู้มีสิทธิ์ (ไม่รู้ผล = ไม่แสดง), หัวข้อ winback/billing, สโตร์ไม่มีสินค้า, ต้องล็อกอินก่อนซื้อ, อ่านทดลองฟรีของ iOS/Google, ราคาจากสโตร์ไม่ถูกแก้ (B4–B6, J2) |
| `domain/units.test.ts` | 15 | ปัดเศษ, kg↔lb, cm↔ft/in, ปัดตามก้าวน้ำหนัก |
| `domain/profileInput.test.ts` | 8 | แปลง/ตรวจค่าฟอร์มโปรไฟล์, สลับหน่วยในฟอร์ม |
| `domain/csv.test.ts` | 8 | CSV RFC 4180, กันสูตร spreadsheet, BOM/CRLF, ไฟล์การฝึกและบันทึกรายวัน |
| `domain/dates.test.ts` | 3 | วันที่ท้องถิ่น `YYYY-MM-DD`, บวกวัน, วันในสัปดาห์ |
| `domain/sessionSummary.test.ts` | 4 | สรุปเซสชัน ความคืบหน้า กล้ามเนื้อที่เหลือ เวลาพัก |

**ลำดับงานรวม (SQLite จริง + service จำลอง)**

| ไฟล์ | บล็อก | ตรวจอะไร |
|---|---|---|
| `flows/account.test.ts` | 9 | ไม่ซื้อก่อนล็อกอิน; ล็อกอิน → logIn → ทดลอง → ได้สิทธิ์; ใช้แคชตอนออฟไลน์แล้วล็อกเมื่อหมด; ข้อมูลอยู่ครบเมื่อหมดสิทธิ์และกลับมาเมื่อสมัครใหม่; restore ต้องล็อกอิน; "เครื่องใหม่" ได้สิทธิ์คืน; ยกเลิกล็อกอินไม่ใช่ error; ลบบัญชี (B4, B9, B11, B12) |
| `flows/offline-access.test.ts` | 5 | ข้อมูลแคชของ RevenueCat ถือว่าเก่า, ผ่อนผัน 48 ชม. ยังทำงาน, ถามสโตร์ใหม่เมื่อถึงวันหมดอายุขณะเปิดแอป, รับการเปลี่ยนเซสชันจากเซิร์ฟเวอร์ (D49–D50) |
| `flows/progression.test.ts` | 3 | linear นับการพลาดแม้ไม่กดอะไร, ยอมรับแล้วไม่คำนวณซ้ำ, รอบสัปดาห์เริ่มถูกต้อง |

**บริการ เซิร์ฟเวอร์ ซิงก์ และอื่นๆ**

| ไฟล์ | บล็อก | ตรวจอะไร |
|---|---|---|
| `services/config.test.ts` | 3 | release build บนมือถือไม่ใช้ mock เด็ดขาด (D47) |
| `services/supabaseAuth.test.ts` | 3 | จำผู้ใช้, โทเค็นหมดอายุตอนออฟไลน์ยังล็อกอินอยู่, ล็อกเอาต์จริงล้างผู้ใช้ (D48) |
| `supabase/webhook.test.ts` | 6 | ปฏิเสธ secret/body ผิด, ทดลอง → จ่าย → ยกเลิก → หมดอายุ (กันซ้ำ), ข้ามเหตุการณ์เก่า, grace/คืนเงิน/ซื้อขาดชนะ, เฉพาะบัญชี Supabase + entitlement `pro` + TRANSFER, รับเหตุการณ์ของบัญชีที่ถูกลบ (J6) |
| `supabase/deleteAccount.test.ts` | 6 | ต้องมีโทเค็นผู้ใช้, เพิกถอน Apple → ลบลูกค้า RevenueCat → ลบผู้ใช้, เพิกถอนล้มยังลบต่อ, Google ข้ามขั้น Apple, ล้มแล้วตอบ 500 ให้แอปลองใหม่, JWT ES256 ของ Apple (B12, D40) |
| `supabase/schema.test.ts` | 3 | คอลัมน์คลาวด์ตรงกับในเครื่อง, ทุกตารางที่ซิงก์มี RLS + LWW trigger, สถานะที่ซิงก์ได้ตรงกับที่แอปปลดล็อก |
| `sync/engine.test.ts` | 11 | ส่งคิวแล้วลบเมื่อสำเร็จเท่านั้น, ออฟไลน์ไม่หาย, error แล้ว backoff, ถูกปฏิเสธ = `waiting`, ไม่มีสิทธิ์ไม่ซิงก์, ติดตั้งใหม่ดึงทั้งหมด, LWW ข้าม 2 เครื่อง, ฉบับในเครื่องที่ใหม่กว่าไม่ถูกทับ, เคอร์เซอร์, ลบบัญชีล้างในเครื่อง |
| `sync/cursor.test.ts` | 4 | เคอร์เซอร์ (เวลา, id) ไม่ข้ามแถวที่เวลาเท่ากัน |
| `theme/contrast.test.ts` | 11 | สูตร WCAG, สีหลัก 8 สี × 2 โหมดผ่าน AA, สีเองถูกปรับอัตโนมัติ, กราฟ 3:1, ข้อความรอง/สถานะผ่าน AA (DS, N5) |
| `i18n.test.ts` | 4 | ไทย/อังกฤษ key ตรงกัน ไม่มีค่าว่าง placeholder ตรงกัน ทุก `t("…")` ในโค้ดมี key |
| `routes.test.ts` | 3 | ทุกหน้านอกกลุ่ม `(app)` อยู่ในรายการ "เข้าถึงได้เสมอ" ของ B3, กลุ่ม `(app)` ใช้ `AccessGate` |
| `shared.test.ts` | 1 | state machine ใน Edge Function ตรงกับของแอปทุกตัวอักษร |

ตัวช่วยเทสต์ (ไม่ใช่ชุดเทสต์): `__tests__/helpers/env.ts` (`freshEnv()` = DB ใหม่ + service จำลอง), `__tests__/helpers/app.ts`

### 1.3 SPEC N8 → เทสต์ที่ครอบคลุม

| N8 | เทสต์อัตโนมัติ | ต้องทดสอบด้วยมือเพิ่ม |
|---|---|---|
| BMR/TDEE/macro/MET | `domain/nutrition` | — |
| progression | `domain/progression`, `flows/progression` | — |
| % สถิติ | `domain/stats`, `domain/periods`, `app/stats` | — |
| state machine สิทธิ์ทุกสถานะ | `domain/entitlement`, `supabase/webhook`, `shared` | P-02 ถึง P-12 |
| ออฟไลน์ / ซิงก์ล้มเหลว | `sync/engine`, `flows/offline-access`, `supabase:verify` | P-12, P-15, P-16 |
| ล็อกอินซ้ำ | `flows/account`, `services/supabaseAuth` | P-08, P-13, P-17 |
| ลบบัญชี | `flows/account`, `supabase/deleteAccount`, `app/delete-account`, `supabase:verify` ข้อ 7 | P-14 |
| แคชสิทธิ์ออฟไลน์ | `domain/entitlement` (resolveAccess), `flows/offline-access` | P-12 |
| error ภาษาง่ายๆ | `i18n` (มีข้อความครบทั้งสองภาษา) | ตรวจข้อความ error ทุกตัวในข้อ 4.1 |

---

## 2. ทดสอบบนอุปกรณ์จริง: สมาชิก สิทธิ์ บัญชี ซิงก์ (N3)

**ทำทั้ง iOS และ Android ทุกเคส** ยกเว้นที่ระบุ ทำเรียงตามเลขได้ เพราะเคสหลังใช้บัญชีจากเคสก่อน

| HUMAN_TASKS | เคสในเอกสารนี้ |
|---|---|
| ข้อ 64 (ซื้อทดสอบ 1 ครั้งเพื่อตรวจวงจร) | P-01 + P-02 |
| ข้อ 68 (iOS: sandbox / TestFlight) | P-01 ถึง P-09, P-11 (ถ้า sandbox ทำได้), P-12, P-13, P-14, P-18, P-19 — P-10 ทำบน iOS ได้ถ้า sandbox รองรับ |
| ข้อ 69 (Android: license testers) | ชุดเดียวกับข้อ 68 + **P-10** (grace period / account hold) + **P-11** (คืนเงิน) |
| ข้อ 70 (ฝั่งเซิร์ฟเวอร์หลัง deploy) | P-14 (บัญชี Apple บน iPhone), P-15, P-16, P-17 + ดู Logs ของทั้งสองฟังก์ชัน |
| ข้อ 71 (บัญชีผู้รีวิว) | P-20 |

### P-01 เปิดแอปครั้งแรก → ตั้งค่าเริ่มต้น → Paywall (B3, B4, B5, B6, C, J2)

- **เตรียม:** ติดตั้งใหม่ (ลบแอปเดิมก่อน) · ล็อกอินบัญชีสโตร์ที่ยังไม่เคยทดลองสินค้านี้
- **ขั้นตอน:**
  1. เปิดแอป → ต้องเข้า `/onboarding` ขั้น 1 `"Make it yours"` / `"ตั้งค่าให้เป็นแบบของคุณ"` (`onboarding-step-1`) ภาษาเริ่มต้นตามภาษาเครื่อง
  2. เลือกภาษา (`lang-th` / `lang-en`) ธีม (`segment-dark` / `segment-light` / `segment-system`) สีหลัก (`accent-<id>`) → การ์ดตัวอย่างเปลี่ยนสดทันที → `"Next"` / `"ถัดไป"` (`onboarding-next`)
  3. ขั้น 2 `"About you"` / `"ข้อมูลของคุณ"`: กรอกเพศ อายุ ส่วนสูง น้ำหนัก ระดับกิจกรรม เป้าหมาย (หรือกด `"Skip for now"` / `"ข้ามไปก่อน"` `onboarding-skip` ในรอบอื่น)
  4. ขั้น 3 `"Quick start"` / `"เริ่มโปรแกรมอย่างเร็ว"`: เลือกเทมเพลต (`template-ppl3`) → `"Continue"` / `"ดำเนินการต่อ"`
  5. ที่ `/paywall` รอ `"Loading plans from the store…"` / `"กำลังโหลดแพ็กเกจจากสโตร์…"` หายไป
  6. ตรวจ B3: ลองเปิด deep link หน้าฟีเจอร์ — Android `adb shell am start -a android.intent.action.VIEW -d "fitnese://stats"` / iOS Simulator `xcrun simctl openurl booted "fitnese://stats"`
  7. แตะเฟือง `"Account & settings"` → `/account` → ตรวจว่าเปิด `"Privacy Policy"`, `"Terms of Use"`, `"References"` (`/legal/privacy`, `/legal/terms`, `/references`) ได้ แล้วกลับ
  8. (รุ่นนี้) ใน `/account` แตะ "Edit setup" → ต้องกลับไปแก้โปรไฟล์/โปรแกรมของขั้นตั้งค่าเริ่มต้นได้ทั้งที่ยังไม่มีสิทธิ์ แก้ค่าแล้วกลับมา Paywall
- **ผลที่ต้องได้:**
  - แผนรายเดือน (`plan-monthly`): ป้าย `"7-day free trial"` / `"ทดลองฟรี 7 วัน"`, ราคาเต็มจากสโตร์บรรทัดหนึ่ง + `"per month"` / `"ต่อเดือน"` (ไม่ถูกตัด D45), `"Renews monthly. Cancel anytime."`
  - แผนซื้อขาด (`plan-lifetime`): ราคา + `"one-time payment"` / `"จ่ายครั้งเดียว"` + `"Unlocks everything forever. No free trial."` / `"ปลดล็อกทุกฟีเจอร์ถาวร ไม่มีช่วงทดลอง"`
  - ปุ่ม `paywall-cta` มี **ราคาจากสโตร์อยู่ในข้อความ** และราคาเด่นไม่น้อยกว่าคำว่าทดลองฟรี (รุ่นนี้)
  - ข้อความเปิดเผย (`paywall-disclosures`) ครบ 4 บรรทัด: `"Free for 7 days, then {price} per month."` · `"The subscription renews automatically each month until you cancel."` · `"Cancel anytime before the trial ends in your App Store|Google Play account settings and you won’t be charged."` · `"Lifetime is a one-time purchase and does not include a free trial."`
  - มี `"Restore purchases"` (`paywall-restore`), `"Manage or cancel subscription"` / `"จัดการหรือยกเลิกสมาชิก"`, ลิงก์ Terms/Privacy/References และ `"You’ll sign in with Google or Apple first, so your purchase stays with your account."`
  - ไม่มีปุ่ม "ข้าม" เข้าแอป · deep link ข้อ 6 พากลับ `/paywall` (ไม่เห็นหน้าสถิติ)
  - ราคาที่เห็นตรงกับที่ตั้งในสโตร์ → จดลงตาราง HUMAN_TASKS ข้อ 58 คอลัมน์ "ราคาที่ Paywall แสดง"

### P-02 เริ่มทดลองฟรี (บัญชีที่มีสิทธิ์ทดลอง) (B1, B4, B7, J3, J6)

- **เตรียม:** ต่อจาก P-01 ยังไม่ได้ล็อกอินแอป
- **ขั้นตอน:**
  1. เลือก `plan-monthly` → แตะ `paywall-cta` → ต้องไป `/login` **ก่อน** มีหน้าซื้อของสโตร์ใดๆ
  2. `/login`: ปุ่ม `"Continue with Google"` (`signin-google`) และ `"Sign in with Apple"` (`signin-apple`) ขนาดเท่ากัน วางซ้อนกัน → ล็อกอิน
  3. ต้องกลับมา `/paywall` พร้อมแผนรายเดือนที่เลือกไว้ ใต้ปุ่มแสดง `"Signed in as {email}"` / `"ล็อกอินเป็น {email}"` (D05: ต้องแตะยืนยันเอง ไม่เปิดหน้าซื้ออัตโนมัติ)
  4. แตะ `paywall-cta` → หน้าซื้อของสโตร์ต้องแสดงทดลองฟรี 7 วันและราคาหลังจากนั้น → ยืนยันด้วยบัญชี sandbox / license tester
- **ผลที่ต้องได้:**
  - แอป: แจ้ง `"You’re all set! Enjoy Fitnese Pro."` / `"เรียบร้อย! ขอให้สนุกกับ Fitnese Pro"` → เข้า Today · โปรแกรม PPL และตารางสัปดาห์จากขั้นตั้งค่าเริ่มต้นอยู่ในแท็บ Programs · โปรไฟล์ที่กรอกอยู่ใน `/profile`
  - Today มีป้าย `"Trial ends {date}"` / `"ทดลองถึง {date}"` · Settings → Membership: `"Free trial"` + `"Trial ends {date}, then renews monthly"`
  - Settings → `settings-sync` เป็น `"Up to date"` ภายในไม่กี่วินาทีถึงไม่กี่นาที (ถ้าค้าง `"Waiting for your membership to be confirmed"` นาน ให้ดู P-16)
  - RevenueCat: ลูกค้า = id ผู้ใช้ Supabase · entitlement `pro` active · period type trial · webhook ส่งสำเร็จ
  - Supabase: `user_entitlements` ของผู้ใช้ `state = TRIALING`, `will_renew = true` · `revenuecat_events` มี `INITIAL_PURCHASE` · ตารางข้อมูล (`program`, `routine`, `week_plan`, `profile`) มีแถวของผู้ใช้
- **ทำต่อทันที:** สร้าง "ชุดข้อมูลตรวจ" ตามข้อ 0.7

### P-03 ทดลองหมดแล้วแปลงเป็นจ่ายเงิน (B2, J5, J6)

- **เตรียม:** บัญชีจาก P-02 ที่ไม่ได้ยกเลิก · ดูเวลาเร่งในข้อ 0.6
- **ขั้นตอน:** รอเกินช่วงทดลองแบบเร่ง → สลับแอปออกแล้วกลับเข้ามา (หรือเปิดแอปค้างไว้ข้ามเวลาหมดทดลอง) → รอให้ต่ออายุอีก 1–2 รอบ
- **ผลที่ต้องได้:**
  - แอป: ใช้งานต่อได้โดยไม่เด้ง Paywall (ถ้าเปิดค้างข้ามเวลาหมดอายุ อาจเห็นสถานะกำลังโหลดสั้นๆ ระหว่างถามสโตร์ใหม่ D50) · Membership: `"Monthly"` / `"รายเดือน"` + `"Renews {date}"` / `"ต่ออายุ {date}"` · ป้ายบน Today หายไป
  - ไม่มีตัวนับทดลองในแอป — วันที่ทั้งหมดมาจาก `expirationDate` ของสโตร์ (B2)
  - RevenueCat: period type normal · Supabase: `state = SUBSCRIBED_MONTHLY`, `expiration_at` เลื่อนทุกรอบต่ออายุ, `revenuecat_events` มี `RENEWAL`
  - เมื่อ sandbox หยุดต่ออายุเอง (ครบจำนวนรอบในข้อ 0.6) → สถานะเป็น `EXPIRED` → ทำ P-04 ข้อ "หลังหมดอายุ" ได้เลย

### P-04 ยกเลิกระหว่างทดลอง และยกเลิกหลังจ่ายแล้ว (J5, B3)

- **เตรียม:** บัญชีสโตร์ใหม่ เริ่มทดลองตาม P-02
- **ขั้นตอน:**
  1. ใน Settings แตะ `"Manage subscription"` / `"จัดการสมาชิก"` (`settings-manage`) → ต้องเปิดหน้าจัดการสมาชิกของสโตร์ (บน iOS sandbox ลิงก์อาจเปิดหน้าสมาชิกจริงของ App Store ที่ไม่เห็นรายการ sandbox — ถ้าเป็นเช่นนั้นให้ยกเลิกที่ Settings → App Store/Developer → Sandbox Account → Manage ในเครื่อง)
  2. ยกเลิกการต่ออายุ → กลับเข้าแอป
  3. รอจนหมดช่วงทดลองแบบเร่ง → กลับเข้าแอป
  4. ทำซ้ำกับบัญชีที่เป็นรายเดือนแล้ว (ต่อจาก P-03) เพื่อตรวจ "ยกเลิกหลังจ่าย"
- **ผลที่ต้องได้:**
  - หลังข้อ 2 (ยังอยู่ในช่วงทดลอง): ยังใช้ได้ทุกฟีเจอร์ · Membership: `"Free trial"` + `"Trial ends {date}"` (ไม่มี "then renews monthly") · Today: `"Trial ends {date}"` · Supabase: `state = TRIALING`, `will_renew = false`, `revenuecat_events` มี `CANCELLATION`
  - หลังข้อ 3: ถูกพาไป `/paywall` หัวข้อ `"Welcome back — pick up where you left off"` / `"ยินดีต้อนรับกลับ — ฝึกต่อจากเดิมได้เลย"` บรรทัดรอง `"Your programs and history are safe and waiting for you."` · **ไม่มีคำว่าทดลองฟรี** (บัญชีนี้ใช้ทดลองแล้ว) · `/account` → Membership: `"Expired"` + `"Ended {date}"` · Supabase: `state = EXPIRED`, มี `EXPIRATION` · ข้อมูลใน Supabase ยังอยู่ครบ (ไม่ถูกลบ แค่ซิงก์ไม่ได้)
  - ข้อ 4 (ยกเลิกหลังจ่าย): ใช้ได้จนสิ้นรอบบิล · Membership: `"Access until {date}"` / `"ใช้ได้ถึง {date}"` · Today: ป้าย `"Access until {date}"`
  - **ข้อมูลไม่หาย:** สมัครใหม่ (รายเดือนแบบไม่มีทดลอง ตาม P-09) → "ชุดข้อมูลตรวจ" กลับมาครบ (B3)

### P-05 ซื้อขาด (B1, J1)

- **เตรียม:** บัญชีสโตร์ใหม่ + บัญชีแอปใหม่ ทำ P-01 จนถึง Paywall
- **ขั้นตอน:** แตะ `plan-lifetime` → ปุ่มเปลี่ยนเป็น `"Buy lifetime for {price}"` / `"ซื้อขาด {price}"` → ล็อกอิน → แตะอีกครั้ง → ยืนยันในหน้าซื้อของสโตร์ (ต้องเป็นการซื้อครั้งเดียว ไม่มีทดลอง)
- **ผลที่ต้องได้:** เข้า Today · Membership: `"Lifetime"` + `"Unlocked forever"` · Today ไม่มีป้าย · Supabase: `state = LIFETIME`, `expiration_at` ว่าง, `will_renew = false` · ไม่มีรายการสมาชิกรายเดือนในบัญชีสโตร์

### P-06 เปลี่ยนจากรายเดือน/ทดลอง เป็นซื้อขาด (J5) — มาพร้อมรุ่นนี้

- **เตรียม:** บัญชีที่อยู่ใน `TRIALING` (จาก P-02) และอีกบัญชีที่ `SUBSCRIBED_MONTHLY` (จาก P-03)
- **ขั้นตอน:**
  1. Settings → ส่วน Membership → แถว "Get lifetime"
  2. ต้องเปิด Paywall ในโหมดอัปเกรด พร้อมคำเตือนว่า **สมาชิกรายเดือน/ช่วงทดลองจะไม่ถูกยกเลิกให้อัตโนมัติ**
  3. ซื้อขาด → กลับเข้าแอป
  4. ดู Settings → Membership
  5. แตะ `"Manage subscription"` → ยกเลิกรายเดือนในสโตร์ → กลับเข้าแอป
- **ผลที่ต้องได้:**
  - หลังข้อ 3: สถานะ `"Lifetime"` (ซื้อขาดชนะเมื่อมีทั้งสองอย่าง) · Supabase: `state = LIFETIME`
  - ข้อ 4: Settings แสดงคำเตือนว่ามีแผนรายเดือนที่ยังต่ออายุอยู่ (เพื่อให้ผู้ใช้ไปยกเลิกเอง)
  - หลังข้อ 5: คำเตือนหายไป สถานะยังเป็น `"Lifetime"` · ไม่สูญเสียสิทธิ์ ณ จุดใดในขั้นตอน

### P-07 กู้คืนการซื้อ (Restore Purchases) (B3, D04)

- **ขั้นตอน (ก) ยังไม่ล็อกอิน:** ติดตั้งใหม่บนเครื่องที่บัญชีสโตร์เคยซื้อไว้ (บัญชีจาก P-02/P-05) → ผ่านขั้นตั้งค่าเริ่มต้น → ที่ Paywall แตะ `"Restore purchases"` (`paywall-restore`)
- **ผล (ก):** พาไป `/login` ก่อน (สิทธิ์ผูกกับบัญชี) → หลังล็อกอินบัญชีเดิมกู้คืนต่อทันที → `"Your purchase was restored."` / `"กู้คืนการซื้อเรียบร้อยแล้ว"` → เข้าแอปได้
- **ขั้นตอน (ข):** ล็อกอินบัญชีที่ไม่เคยซื้อ บนบัญชีสโตร์ที่ไม่เคยซื้อ → `/account` → `"Restore purchases"` (`account-restore`)
- **ผล (ข):** `"No previous purchase was found for this account."` / `"ไม่พบการซื้อก่อนหน้าของบัญชีนี้"` · ยังอยู่ที่ Paywall
- **ขั้นตอน (ค):** ปิดเน็ตแล้วกด Restore
- **ผล (ค):** `"Couldn’t restore purchases. Please try again."` / `"กู้คืนการซื้อไม่สำเร็จ ลองอีกครั้งนะ"` ไม่ค้าง
- ปุ่ม Restore ใน Settings (`settings-restore`) ต้องให้ผลเหมือน `/account`

### P-08 เปลี่ยนเครื่อง / ติดตั้งใหม่ (B11, J3, C)

- **เตรียม:** บัญชีที่มีสิทธิ์และมี "ชุดข้อมูลตรวจ" · เครื่องที่สอง (ควรต่างแพลตฟอร์ม เช่น ซื้อบน iPhone แล้วเปิดบน Android)
- **ขั้นตอน:**
  1. เครื่องใหม่: ติดตั้ง → ขั้น 1 ของ onboarding แตะ `"I already have an account — sign in"` / `"มีบัญชีอยู่แล้ว — ล็อกอิน"` (`onboarding-have-account`) → ล็อกอินบัญชีเดิม
  2. ทำซ้ำอีกรอบด้วยการลบแอปในเครื่องเดิมแล้วติดตั้งใหม่ (ทางเดินปกติ: ผ่านขั้นตั้งค่าเริ่มต้นจนถึง Paywall แล้วล็อกอิน)
- **ผลที่ต้องได้:**
  - ข้อ 1: เข้า Today ทันที ไม่ต้องผ่าน Paywall และไม่ต้องซื้อซ้ำ · ผู้มีสิทธิ์ข้ามขั้นตั้งค่าเริ่มต้นที่มีข้อมูลบนคลาวด์แล้ว (รุ่นนี้)
  - ข้อมูลจากคลาวด์ลงเครื่องครบ: โปรแกรม, routine, ตารางสัปดาห์, ประวัติ (`/history`), น้ำหนักตัว, โปรไฟล์ · สิทธิ์ข้ามแพลตฟอร์ม (J3) · Membership และวันที่ตรงกับเครื่องแรก
  - ข้อ 2: ค่าที่กรอกในขั้นตั้งค่าเริ่มต้นรอบใหม่ **ไม่ทับ** ข้อมูลเดิมบนคลาวด์
  - หมายเหตุ: ภาษา ธีม และสีหลักเป็นค่าของแต่ละเครื่อง (ไม่ซิงก์) — เครื่องใหม่ใช้ค่าที่เลือกในเครื่องนั้น

### P-09 บัญชีที่ไม่มีสิทธิ์ทดลอง เห็น "สมัครรายเดือน" ไม่มีคำว่าทดลอง (B6)

- **เตรียม:** iOS: บัญชี sandbox ที่เคยใช้ทดลองแล้ว (จาก P-03/P-04) — สิทธิ์ทดลองของ Apple ผูกกับ Apple ID ไม่ใช่บัญชีแอป ให้ทดสอบทั้ง "บัญชีแอปเดิม" และ "บัญชีแอปใหม่บน Apple ID เดิม" · Android: license tester ที่เคยมี `fitnese_monthly` แล้ว (offer ตั้งเป็น "Never had this subscription")
- **ขั้นตอน:** เปิด Paywall (หลังล็อกอิน และก่อนล็อกอินแยกกัน)
- **ผลที่ต้องได้:**
  - หัวข้อ `"Unlock your full training plan"` / `"ปลดล็อกแผนการฝึกทั้งหมดของคุณ"` (ไม่เคยมีสิทธิ์) หรือ `"Welcome back — pick up where you left off"` (เคยมีแล้วหมด)
  - การ์ดรายเดือน **ไม่มี** ป้าย `"7-day free trial"` · ปุ่ม `"Subscribe for {price} / month"` / `"สมัครรายเดือน {price} / เดือน"` · ข้อความเปิดเผย `"{price} per month. No free trial."` / `"{price} ต่อเดือน ไม่มีช่วงทดลองฟรี"` + `"Cancel anytime in your … account settings; access continues until the end of the billing period."`
  - ไม่มีคำว่า "free"/"ฟรี" ที่ใดบน Paywall · ระหว่างโหลดหรือเมื่อตรวจสิทธิ์ทดลองไม่ได้ (`unknown`) ก็ต้องไม่แสดงทดลองฟรี
  - ซื้อแล้วหน้าซื้อของสโตร์ต้องเรียกเก็บทันที (ไม่มีทดลอง) → สถานะ `SUBSCRIBED_MONTHLY`
- **รีเซ็ตสิทธิ์ทดลองเพื่อทดสอบซ้ำ:** iOS ใช้บัญชี sandbox ใหม่ หรือ App Store Connect → Users and Access → Sandbox → เลือกผู้ทดสอบ → Clear Purchase History (ถ้าคอนโซลมีเมนูนี้) · Android ใช้ license tester ใหม่

### P-10 ปัญหาการชำระเงิน: grace period / billing retry / account hold (J5, B8)

- **เตรียม:** บัญชีรายเดือน (หลัง P-03) · ตั้ง grace ตาม HUMAN_TASKS ข้อ 45 (Apple) และข้อ 53 (Google)
- **ขั้นตอน Android:** Play Store → Payments & subscriptions → Subscriptions → แอปนี้ → เปลี่ยนวิธีชำระเป็นบัตรทดสอบที่ปฏิเสธเสมอ (เช่น "Test card, always declines") → รอรอบต่ออายุถัดไป → กลับเข้าแอป → รอจนพ้น grace → เข้า account hold → เปลี่ยนกลับเป็นบัตรที่อนุมัติ
- **ขั้นตอน iOS (ถ้า sandbox รองรับ):** ปิดการอนุญาตซื้อ/ต่ออายุของบัญชี sandbox ในเครื่อง (ตามเอกสาร Apple "Testing failing subscription renewals and In-App Purchases" — ชื่อเมนูตรวจในเครื่องจริง) → รอรอบต่ออายุ → เปิดกลับ
- **ผลที่ต้องได้:**
  - ระหว่าง grace: ยังใช้ได้ (ไม่เด้ง Paywall) · Today ป้าย `"Payment issue"` / `"มีปัญหาการชำระเงิน"` โทนเตือน · Membership: `"Payment issue"` + `"Update your payment by {date} to keep access"` · Supabase: `state = BILLING_GRACE`, `billing_issue_at` มีค่า, `revenuecat_events` มี `BILLING_ISSUE` · ซิงก์ยังทำงาน
  - หลังพ้น grace / account hold: ถูกล็อก → `/paywall` แสดงข้อความชวนแก้การชำระเงิน ("fix payment" — มาพร้อมรุ่นนี้) ที่พาไปหน้าจัดการสมาชิกของสโตร์ · Supabase: `state = EXPIRED` (หรือ `billing_issue_at` ยังมีค่า) · ข้อมูลไม่หาย
  - หลังแก้วิธีชำระ: สิทธิ์กลับมา (`SUBSCRIBED_MONTHLY`) และ "ชุดข้อมูลตรวจ" ครบ

### P-11 คืนเงิน (J5)

- **Android:** Play Console → Order management → ค้นหาคำสั่งซื้อทดสอบ → Refund (เลือกเพิกถอนสิทธิ์/ยกเลิกสมาชิกด้วย) หรือ RevenueCat → Customers → ลูกค้า → ธุรกรรม → Refund (ชื่อเมนูอาจเปลี่ยน) — ทำทั้งรายเดือนและซื้อขาด
- **iOS:** sandbox ไม่มีทางขอคืนเงินผ่าน UI ของแอปนี้ (แอปไม่มีปุ่มขอคืนเงิน) — ตรวจเอกสาร Apple ปัจจุบันว่ามีวิธีจำลองหรือไม่ ถ้าไม่มี ให้อาศัยผลของ Android + `__tests__/supabase/webhook.test.ts` ("handles billing grace, refunds and lifetime precedence") และบันทึกว่า "ข้าม (sandbox ไม่รองรับ)"
- **ผลที่ต้องได้:** RevenueCat ส่ง `CANCELLATION` (เหตุผล customer support) → Supabase `state = EXPIRED` ทันที · แอปหลังกลับเข้ามา: ถูกล็อก → Paywall `"Welcome back…"` · ข้อมูลยังอยู่
- **จุดที่ต้องจับตา:** หลังคืนเงิน **ซื้อขาด** แอปต้องล็อก ถ้าแอปยังขึ้น `"Lifetime"` ให้บันทึกว่าไม่ผ่านและแจ้งผู้พัฒนา (แอปถือว่าธุรกรรมซื้อขาดใน `nonSubscriptionTransactions` ของ RevenueCat = LIFETIME — `deriveSnapshot` ใน `src/domain/entitlement/machine.ts`)

### P-12 ออฟไลน์: ใช้แคชสิทธิ์ + ผ่อนผัน 48 ชม. (B9, D06, D48–D50)

ใช้บัญชีที่ยกเลิกการต่ออายุแล้ว (วันหมดอายุคงที่ ดูได้จาก Membership `"Access until {date}"` หรือ `"Trial ends {date}"`) เปลี่ยนนาฬิกาเครื่องได้ที่ iOS: Settings → General → Date & Time (ปิด Set Automatically) / Android: Settings → System → Date & time — **คืนค่าอัตโนมัติทุกครั้งหลังทดสอบ**

| # | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|
| ก | ก่อนวันหมดอายุ เปิดโหมดเครื่องบิน → ปิดแอปทั้งหมด → เปิดใหม่ | เข้าแอปได้ ไม่ต้องล็อกอินใหม่ (แม้โทเค็นหมดอายุระหว่างออฟไลน์ D48) · `settings-sync` = `"Offline — changes are saved on this device"` |
| ข | (ต่อ) บันทึกเซสชันใหม่ 1 ครั้ง → ปิด/เปิดแอปออฟไลน์ | เซสชันอยู่ใน `/history` · `"1 change waiting to upload"` หรือมากกว่า (นับตามแถวที่รอส่ง) |
| ค | เปิดเน็ต | สถานะ `"Syncing…"` → `"Up to date"` จำนวนรอส่งเป็น 0 · Supabase มีแถว `workout_session` ใหม่ |
| ง | ออฟไลน์ แล้วให้เวลาเลยวันหมดอายุไปไม่ถึง 48 ชม. (รอจริงตามเวลา sandbox หรือเลื่อนนาฬิกา) → เปิดแอป | ยังใช้ได้ (ช่วงผ่อนผันออฟไลน์) |
| จ | ออฟไลน์ เลื่อนนาฬิกาให้เลยวันหมดอายุเกิน 48 ชม. → ปิด/เปิดแอป | ถูกล็อก → `/paywall` แสดง `"Plans can’t be loaded from the store right now."` / `"ตอนนี้โหลดแพ็กเกจจากสโตร์ไม่ได้"` + `"Try again"` · `/account`, Privacy, Terms, References ยังเปิดได้ |
| ฉ | คืนนาฬิกาอัตโนมัติ + เปิดเน็ต → กลับเข้าแอป | สโตร์ยืนยัน `EXPIRED` → Paywall `"Welcome back…"` |
| ช | ออนไลน์ หลังวันหมดอายุ (ไม่มีการต่ออายุ) | ล็อกทันที — ไม่มีช่วงผ่อนผันเมื่อออนไลน์ |
| ซ | เปิดแอปค้างไว้ที่ Today ข้ามเวลาหมดอายุ (ออนไลน์) | แอปถามสโตร์ใหม่เอง (D50) ระหว่างรอแสดงสถานะโหลด ไม่เด้ง Paywall วูบ ถ้าต่ออายุแล้วอยู่ต่อ ถ้าหมดจริงไป Paywall |
| ฌ | บัญชี `LIFETIME` ออฟไลน์ + เลื่อนนาฬิกาไป 1 ปี | ยังใช้ได้ |
| ญ | ล็อกเอาต์แล้วเปิดแอปออฟไลน์ | ไม่มีสิทธิ์ (แคชผูกกับบัญชี) |
| ฎ | ที่ Paywall โหลดแพ็กเกจขณะออนไลน์ แล้วปิดเน็ต → แตะ `paywall-cta` | แจ้งว่าการซื้อไม่สำเร็จ **และยังไม่ถูกเรียกเก็บเงิน** (รุ่นนี้) ไม่ค้าง |

### P-13 ล็อกอิน Google และ Apple ทั้งสองแพลตฟอร์ม (B10, N1, D11, D32, D51)

| # | แพลตฟอร์ม | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|---|
| ก | iOS | `signin-google` | หน้าเลือกบัญชี Google จริง → สำเร็จ |
| ข | iOS | `signin-apple` (ปุ่มทางการของระบบ ข้อความบนปุ่มเป็นภาษาของระบบ) | หน้าต่าง native ของ Apple → เลือก "Hide My Email" → สำเร็จ · `/account` แสดงอีเมล `…@privaterelay.appleid.com · Using Apple’s private email relay` / `… · ใช้อีเมลแบบซ่อน (Private Relay) ของ Apple` |
| ค | Android | `signin-google` | หน้าเลือกบัญชี Google → สำเร็จ (ถ้า `DEVELOPER_ERROR` ดู HUMAN_TASKS ข้อ 40/50) — ทดสอบทั้ง build ที่ติดตั้งตรง (EAS key) และที่ติดตั้งจาก Play (Play App Signing key) |
| ง | Android | `signin-apple` | เปิดเบราว์เซอร์ไปหน้า Apple → ล็อกอิน → เด้งกลับแอปผ่าน `fitnese://auth-callback` → สำเร็จ (ค้างที่เบราว์เซอร์ = ดู HUMAN_TASKS ข้อ 19, 25, 27) |
| จ | ทั้งคู่ | กดเริ่มล็อกอินแล้วยกเลิก | กลับหน้าเดิม ไม่มีกล่อง error (ยกเลิกไม่ใช่ข้อผิดพลาด) |
| ฉ | ทั้งคู่ | ปิดแอปทั้งหมดแล้วเปิดใหม่ | ยังล็อกอินอยู่ (จำเซสชัน) |
| ช | ทั้งคู่ | Settings → `"Sign out"` (`settings-signout`) → ยืนยัน `"Sign out? Your data stays safe on this device and in your account."` | ไป `/paywall` · ล็อกอินกลับบัญชีเดิม → ข้อมูลกลับมาครบ |
| ซ | ทั้งคู่ | ปุ่ม Google/Apple ในโหมดมืดและสว่าง | ขนาด ความกว้าง ความเด่นเท่ากัน (มืด: ขาวทั้งคู่ / สว่าง: ดำทั้งคู่) |
| ฌ | ทั้งคู่ | ล็อกอิน Google และ Apple ที่ใช้อีเมลเดียวกัน | บันทึกผลว่าได้บัญชีเดียวกันหรือแยกกัน (ขึ้นกับการตั้งค่า Supabase Auth) เพื่อใช้ตอบคำถามผู้ใช้ |
| ญ | ทั้งคู่ | Supabase → Authentication → Users | มีผู้ใช้ตาม provider ที่ใช้ |

### P-14 ลบบัญชี (B12, N1, D40, D52)

- **เตรียม:** 3 บัญชีที่มีสิทธิ์และมีข้อมูล: (1) Apple บน iPhone (2) Google (3) Apple บน Android · ทั้งหมดยังมีสมาชิกรายเดือนในสโตร์
- **ขั้นตอน:**
  1. Settings → `"Delete account and data"` / `"ลบบัญชีและข้อมูล"` (`settings-delete`) → `/delete-account`
  2. ตรวจกล่องคำเตือน (`delete-subscription-warning`): `"Deleting your account does not cancel your App Store or Google Play subscription…"` / `"การลบบัญชีไม่ยกเลิกการสมัครสมาชิกใน App Store หรือ Google Play…"` → แตะ `"Open subscription settings"` / `"เปิดหน้าการสมัครสมาชิก"` ต้องเปิดหน้าสมาชิกของสโตร์ → กลับมา
  3. ปุ่ม `"Delete my account"` (`delete-confirm`) ต้องกดไม่ได้จนกว่าจะติ๊ก `"I understand that all my data will be deleted"` (`delete-understood`)
  4. ติ๊ก → กดลบ → กล่องยืนยัน `"Delete account permanently?"` → ยืนยัน
  5. บัญชี Apple บน iPhone: เห็นข้อความ `"Apple will ask you to confirm once more so we can revoke the app’s access."` แล้ว Apple ขอยืนยันอีกครั้ง → ยืนยัน (และอีกรอบให้กดยกเลิกที่หน้าต่าง Apple: ต้องกลับมาโดยไม่ลบและไม่มีกล่อง error)
  6. ทดสอบแบบออฟไลน์ 1 ครั้ง
- **ผลที่ต้องได้:**
  - แอป: `"Your account has been deleted."` / `"ลบบัญชีเรียบร้อยแล้ว"` → `/paywall` · ข้อมูลของบัญชีในเครื่องหายหมด
  - Supabase: ผู้ใช้หายจาก Authentication → Users · ไม่มีแถวของ `user_id` นั้นในทุกตาราง รวม `user_entitlements` และ `revenuecat_events` ของผู้ใช้ · Logs ของ `delete-account` ไม่มี `apple revoke failed` (บัญชี 1)
  - RevenueCat: ลูกค้าถูกลบ (ถ้าตั้ง `REVENUECAT_SECRET_API_KEY` ตามข้อ 63)
  - Apple (บัญชี 1): iPhone → Settings → [ชื่อ] → Sign in with Apple (หรือ Sign-In & Security) → แอปไม่อยู่ในรายการแล้ว
  - บัญชี 3 (Apple บน Android): ข้อมูลถูกลบ แต่แอป **ไม่ได้ขอ authorization code ใหม่จาก Apple บน Android จึงไม่เพิกถอนโทเค็น** — บันทึกผลและให้เจ้าของตัดสินว่ายอมรับได้หรือไม่
  - สมาชิกในสโตร์ยังต่ออายุอยู่จริง (ตรงกับคำเตือน) → ยกเลิกเองเพื่อไม่ให้ sandbox ต่ออายุค้าง
  - ออฟไลน์ (ข้อ 6): `"We couldn’t delete your account. Check your connection and try again."` และไม่มีอะไรถูกลบ
- **ต่อ (TRANSFER):** ล็อกอินใหม่ด้วย Apple ID/Google เดิม (ได้บัญชีใหม่) → Paywall → `"Restore purchases"` → ดู P-18

### P-15 ซิงก์ 2 เครื่อง รวมแก้ไขตอนออฟไลน์และข้อมูลชนกัน (L, D12, D38, D59)

- **เตรียม:** เครื่อง A และ B ล็อกอินบัญชีเดียวกันที่มีสิทธิ์ ตั้งเวลาอัตโนมัติทั้งสองเครื่อง (LWW ใช้เวลาที่แก้ไขจากนาฬิกาเครื่อง) · ก่อนแต่ละข้อกด `"Sync now"` ทั้งสองเครื่องจน `"Up to date"`
- **ขั้นตอนและผล:**
  1. **ส่งต่อ:** A สร้างโปรแกรมจากเทมเพลต → B กด `"Sync now"` (หรือสลับแอปออกแล้วกลับเข้า) → B เห็นโปรแกรม routine และตารางสัปดาห์ครบ
  2. **ออฟไลน์:** A เปิดโหมดเครื่องบิน → บันทึกเซสชัน + แก้น้ำหนักตัว → ปิด/เปิดแอป → ข้อมูลยังอยู่ · เปิดเน็ต → A `"Up to date"` → B เห็นเซสชันใน `/history` และค่าในสถิติ
  3. **ชนกัน (แก้ทีหลังชนะ):** A ออฟไลน์ เปลี่ยนชื่อ routine "Push A" เป็น "Push A1" (เวลา t1) → B ออนไลน์ เปลี่ยน routine เดียวกันเป็น "Push A2" (t2 > t1) แล้วซิงก์ → A เปิดเน็ตและซิงก์ → **ทั้งสองเครื่องเป็น "Push A2"** (ตัดสินด้วยเวลาที่แก้ ไม่ใช่เวลาที่ซิงก์ และตัดสินทั้งระเบียน)
  4. **ชนกันกลับด้าน:** B แก้ก่อน (t1) ออนไลน์ → A ออฟไลน์แก้ทีหลัง (t2) → A ซิงก์ → ทั้งสองเครื่องเป็นค่าของ A
  5. **override วันเดียวกัน:** A ออฟไลน์ตั้ง `"Rest today"` / `"วันนี้พัก"` → B ตั้ง routine อื่นสำหรับวันนี้ → ซิงก์ทั้งคู่ → ทั้งสองเครื่องใช้ override ที่แก้ล่าสุด และ `"Back to this week’s plan"` (`today-back-to-plan`) ล้าง override ของวันนั้นทั้งหมด
  6. **ลบ:** A ลบเซสชัน (`/history/[id]` → `"Delete this workout"` `history-delete`) → B หลังซิงก์ไม่เห็นเซสชันนั้นและสถิติลดลงตาม
  7. **ล็อกเอาต์ตอนมีของค้าง:** A ออนไลน์แก้ข้อมูลแล้วล็อกเอาต์ทันที → B เห็นการแก้นั้น (แอปพยายามส่งคิวก่อนล็อกเอาต์)
  8. ไม่มีข้อมูลซ้ำหรือหายในทุกข้อ (นับจำนวนเซสชันใน `/history` ทั้งสองเครื่อง)

### P-16 webhook มาช้า → สถานะซิงก์ "waiting" (J6, D39)

- **คำเตือน:** การตั้งค่า webhook ใช้ร่วมกันทั้ง sandbox และ production — ทำก่อนเปิดตัว หรือช่วงที่ไม่มีผู้ใช้จริง
- **ขั้นตอน:**
  1. RevenueCat → Integrations → Webhooks → แก้ Authorization header ให้ผิดชั่วคราว
  2. บัญชีสโตร์ + บัญชีแอปใหม่ → เริ่มทดลองตาม P-02 → สร้างข้อมูล
  3. ดู Settings → `settings-sync`
  4. แก้ header กลับเป็นค่าที่ถูก (`Bearer <WEBHOOK_SECRET>`) → รอ RevenueCat ส่งซ้ำ (ตรวจนโยบาย retry ในคอนโซล) หรือทำให้เกิดเหตุการณ์ใหม่
  5. กด `"Sync now"`
- **ผลที่ต้องได้:**
  - ข้อ 2–3: แอปปลดล็อกทันที (สิทธิ์มาจาก RevenueCat SDK) · `settings-sync` = `"Waiting for your membership to be confirmed"` / `"รอยืนยันสถานะสมาชิก"` + จำนวนรายการรออัปโหลด · ใช้งานได้ปกติ ข้อมูลอยู่ในเครื่อง · RevenueCat แสดงการส่ง webhook ล้ม (401) · Supabase ไม่มีแถว/สถานะยังไม่ใช่ `TRIALING`
  - ข้อ 4–5: Supabase `state = TRIALING` → สถานะซิงก์เป็น `"Up to date"` จำนวนรอส่งเป็น 0 · ข้อมูลที่สร้างระหว่างรอขึ้นคลาวด์ครบ ไม่มีอะไรหาย

### P-17 แยกข้อมูลระหว่างบัญชี (D12, HUMAN_TASKS ข้อ 70)

- **ขั้นตอน:** เครื่องเดียว: บัญชี 1 สร้างข้อมูล → ล็อกเอาต์ → ล็อกอินบัญชี 2 (มีสิทธิ์) → ดูทุกแท็บ → ล็อกเอาต์ → ล็อกอินบัญชี 1 · และ 2 บัญชีบน 2 เครื่องพร้อมกัน
- **ผล:** บัญชี 2 ไม่เห็นข้อมูลของบัญชี 1 (และกลับกัน) · กลับมาบัญชี 1 ข้อมูลครบ · Supabase แต่ละแถวมี `user_id` ถูกบัญชี

### P-18 ย้ายสิทธิ์ระหว่างบัญชีแอป (TRANSFER) — มาพร้อมรุ่นนี้

- **เตรียม:** บัญชีแอป A ซื้อด้วยบัญชีสโตร์ X ไว้แล้ว · ตรวจ RevenueCat → Project settings → Restore behavior (ค่าทั่วไปคือย้ายไป app user id ใหม่)
- **ขั้นตอน:** บนเครื่องที่ใช้บัญชีสโตร์ X: ล็อกเอาต์ A → ล็อกอินบัญชีแอป B → Paywall → `"Restore purchases"`
- **ผลที่ต้องได้:** B ได้สิทธิ์ (`"Your purchase was restored."`) · webhook `TRANSFER` → Supabase: B ได้สถานะสิทธิ์ (ซิงก์ได้) และ A เป็น `EXPIRED` · ล็อกอิน A อีกครั้งต้องถูกล็อก · ถ้าสิทธิ์ย้ายไป B เองตั้งแต่ล็อกอินโดยไม่ต้องกด Restore ให้บันทึกไว้

### P-19 การชำระเงินที่รออนุมัติ (pending) — Android

- **ขั้นตอน:** license tester ซื้อรายเดือนด้วยบัตรทดสอบแบบช้า (เช่น "Slow test card, approves after a few minutes")
- **ผลที่ต้องได้:** ระหว่างรอ แอปไม่ปลดล็อก และเมื่อสโตร์อนุมัติ แอปปลดล็อกเอง (หรือหลังสลับแอปเข้ามาใหม่)
- **จุดที่ต้องจับตา:** จากโค้ดปัจจุบัน ข้อผิดพลาดประเภทอื่นๆ ของ RevenueCat (รวม payment pending) แสดง `"The purchase didn’t go through. You were not charged."` — ถ้าเห็นข้อความนี้ทั้งที่การชำระยังรออนุมัติและต่อมาถูกเรียกเก็บ ให้บันทึกว่าไม่ผ่านและแจ้งผู้พัฒนา

### P-20 บัญชีสำหรับผู้รีวิว (N1, HUMAN_TASKS ข้อ 71)

- **ขั้นตอน:** เครื่องที่ติดตั้งใหม่ + บัญชี Google สำหรับรีวิวที่ไม่เคยซื้อ → ทำ P-01 → ที่ `/login` ล็อกอินด้วยบัญชีนี้ได้โดยไม่ติดการยืนยันเพิ่ม → **หยุดที่หน้าซื้อของสโตร์ ไม่ยืนยันการซื้อ**
- **ผล:** ผู้รีวิวจะเห็น flow ทดลองฟรีตั้งแต่ต้น · บันทึกขั้นตอนนี้ใน App Review Notes ตามข้อ 76

---

## 3. Accessibility (N5)

### 3.1 VoiceOver (iOS) และ TalkBack (Android)

เปิด: iOS Settings → Accessibility → VoiceOver · Android Settings → Accessibility → TalkBack — ทำครบทั้งสองภาษา (อย่างน้อยภาษาไทย 1 รอบเต็ม) ใช้การปัดไปทีละรายการ ห้ามแตะตรงตำแหน่งบนจอ

| flow | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|
| ตั้งค่าเริ่มต้น | ขั้น 1–3 จนถึง Paywall | อ่าน `"Step 1 of 3"` / `"ขั้นที่ 1 จาก 3"` · ภาษาและสีหลักอ่านเป็นกลุ่มตัวเลือก (radio) พร้อมชื่อ เช่น `"Pink"`, `"Custom color"` และสถานะ "เลือกอยู่" · ช่องโปรไฟล์มีชื่อช่อง · ปุ่ม Next/Skip มีชื่อ |
| Paywall | ปัดทุกองค์ประกอบ | หัวข้ออ่านเป็น header · การ์ดแผนอ่านเป็น radio รวม ชื่อแผน + ป้ายทดลอง + ราคา + เงื่อนไข ในประโยคเดียว และบอกว่าเลือกอยู่หรือไม่ · อ่านข้อความเปิดเผยครบทุกบรรทัด · ปุ่มเฟืองอ่าน `"Account & settings"` |
| ล็อกอิน | ปัดถึงปุ่ม | `"Continue with Google"` และ `"Sign in with Apple"` อ่านเป็นปุ่ม |
| Today | ปัดทั้งหน้า | หัวข้อ header · ป้ายสมาชิก · ปุ่ม `+` อ่าน `"Start an empty session"` · ปุ่มเมนูอ่าน `"More options"` / `"ตัวเลือกเพิ่มเติม"` · ปุ่มเริ่มอ่าน `"Start {routine}"` |
| ตารางสัปดาห์ `/week` | ปัดแถวจุดวัน | แต่ละวันอ่าน `"{วัน}: scheduled"` / `"{วัน}: not scheduled"` (ตามภาษา) · สวิตช์อ่าน `"{name} in schedule"` |
| เซสชัน | บันทึกน้ำหนัก/ครั้ง → ติ๊ก → พัก → จบ | ช่องอ่าน `"Set 1, Weight: …"` · ปุ่มติ๊กอ่าน `"Mark set 1 done"` / `"Mark set 1 not done"` · แป้นตัวเลขทุกปุ่มมีชื่อ รวม `"Delete digit"` · ความคืบหน้าอ่าน `"{done} of {total} sets"` · ตัวจับเวลาพักและปุ่ม Skip อ่านได้ |
| สรุปเซสชัน | เลือกความหนัก → ยอมรับ/ข้ามเป้า | ตัวเลือก Light/Moderate/Hard อ่านพร้อมสถานะ · ปุ่ม `"Accept"`/`"Skip"` บอกว่าเป็นของท่าไหน |
| สถิติ | สลับช่วง/มุมมอง/ตัวชี้วัด | ตัวสลับอ่านชื่อกลุ่มและตัวเลือก · กราฟอ่านเป็นข้อความสรุป `"{title}. {items}"` พร้อมเปอร์เซ็นต์ (ไม่ต้องดูภาพ) |
| Settings | สวิตช์/ตัวสลับ | สวิตช์ตัวจับเวลาพักอ่าน `"Rest timer between sets"` พร้อมสถานะเปิด/ปิด |
| ลบบัญชี | ติ๊กยืนยัน | อ่านเป็น checkbox พร้อมสถานะ checked/unchecked |
| Sheet ทุกตัว | เปิด sheet | โฟกัสอยู่ใน sheet และปุ่มปิด (`sheet-close`) อ่านว่า `"Close"` / `"ปิด"` |

**ผ่านเมื่อ:** ทุกองค์ประกอบที่แตะได้มีชื่อที่สื่อความหมายในภาษาปัจจุบัน ไม่มีปุ่มที่อ่านแค่ "button" ลำดับการอ่านเป็นไปตามลำดับภาพ และทำ flow ทั้งหมดจบได้ด้วยการปัดอย่างเดียว

### 3.2 ขยายตัวอักษรสูงสุด

- iOS: Settings → Accessibility → Display & Text Size → Larger Text → เปิด Larger Accessibility Sizes → เลื่อนสุด · Android: Settings → Display → Font size สูงสุด และ Display size ใหญ่สุด
- เดินทุกหน้าในข้อ 3.1 + `/profile`, `/history`, `/exercises`, `/legal/[doc]`
- **ผลที่ต้องได้:** ข้อความเนื้อหาโตได้ถึง 2 เท่า (`BODY_MAX_SCALE`) ตัวเลขใหญ่/หัวข้อโตได้ถึง 1.4 เท่า (`BIG_TEXT_MAX_SCALE` ใน `src/theme/typography.ts`) · ไม่มีข้อความถูกตัดหรือซ้อนกัน · ราคาบน Paywall เห็นครบ · ปุ่มยังกดได้ · แถวเซ็ตในเซสชันยังใช้งานได้ · แถบแท็บไม่บังเนื้อหา · ทุกหน้าเลื่อนดูได้จนสุด

### 3.3 Contrast ของสีหลักทั้ง 8 สี × 2 โหมด

1. รัน `npm run contrast` → ทุกแถวต้องเป็น `ผ่าน` และ exit code 0 (คัดตารางไปเทียบ/อัปเดต `docs/DESIGN_SYSTEM.md` ถ้าค่าเปลี่ยน)
2. บนเครื่องจริง: Settings → `"Accent color"` / `"สีหลัก"` → เลือกทีละสี (`accent-pink`, `accent-lavender`, `accent-sky`, `accent-mint`, `accent-lime`, `accent-gold`, `accent-peach`, `accent-coral`) × ธีม `"Dark"` และ `"Light"` → ดู Today (หัวข้อบนแสงเรือง, ปุ่มเริ่ม), แถบแท็บที่เลือก, chip ที่เลือก, ปุ่มหลัก (`paywall-cta`, `session-finish`), กราฟในสถิติ
3. สีเอง: `accent-custom` → ใส่สีสว่างมาก เช่น `#FFFF00` และมืดมาก เช่น `#202020` ใน `custom-hex` → ต้องเห็น `"Adjusted slightly so text stays easy to read."` เมื่อสีถูกปรับ → `custom-apply` → ตรวจแบบข้อ 2
4. เสริม (ไม่บังคับ): Xcode → Accessibility Inspector → Audit หรือแอป Accessibility Scanner ของ Android ตรวจ contrast บนเครื่อง
- **ผ่านเมื่อ:** สคริปต์ผ่านทั้งหมด และไม่มีข้อความที่อ่านยากด้วยตาในทุกชุดสี

### 3.4 พื้นที่แตะ ≥ 48

- Android: ติดตั้ง Accessibility Scanner → สแกนทุกหน้าหลัก → ต้องไม่มีคำเตือน touch target · iOS: Accessibility Inspector → Audit (hit region)
- จุดที่ต้องดูเป็นพิเศษ: ไอคอน `+`/เมนู (`today-add`, `today-menu`), จุดวันในตารางสัปดาห์ (`weekday-<d>`), ปุ่มติ๊กเซ็ต (`tick-…`), แป้นตัวเลข (`key-…`), Stepper (`settings-rest`), chip ก้าวน้ำหนัก (`settings-step-<i>`), ปุ่มปิด sheet, checkbox ลบบัญชี
- คอมโพเนนต์ใช้ `MIN_TOUCH = 48` จาก `src/theme/tokens.ts` — ถ้าพบจุดเล็กกว่า ให้แจ้งพร้อมชื่อหน้าและ testID

### 3.5 ลดการเคลื่อนไหว

iOS: Accessibility → Motion → Reduce Motion · Android: Accessibility → Remove animations → ติ๊กเซ็ตในเซสชันต้องไม่มีแอนิเมชันเด้ง (ยังมี haptic ได้) และแอปไม่มีการเคลื่อนไหวรุนแรง

---

## 4. ภาษา ธีม และขนาดจอ

### 4.1 ภาษาไทย / อังกฤษ

| # | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|
| 1 | ติดตั้งใหม่บนเครื่องภาษาไทย และอีกครั้งบนเครื่องภาษาอังกฤษ | ภาษาเริ่มต้นตามเครื่อง (D19) |
| 2 | Settings → `"Language"` / `"ภาษา"` → `lang-en` ↔ `lang-th` | ทั้งแอปเปลี่ยนทันที รวมแถบแท็บ (`"Today/Programs/Stats/Settings"` ↔ `"วันนี้/โปรแกรม/สถิติ/ตั้งค่า"`), sheet, กล่องแจ้งเตือน, หน้ากฎหมาย |
| 3 | เดินทุกหน้าในภาษาไทย | ไม่มีข้อความอังกฤษหลงเหลือ (ยกเว้นคำเฉพาะที่ตั้งใจ เช่น RIR, RPE, ชื่อสินค้า Fitnese Pro, routine) · สระ/วรรณยุกต์ไม่ถูกตัดหัวท้าย |
| 4 | ดูวันที่ใน Membership, ประวัติ, สถิติ | ไทยเป็น พ.ศ. เช่น `16 ต.ค. 2569`, อังกฤษ `Oct 16, 2026` · แถวตัวย่อวัน อา จ อ พ พฤ ศ ส |
| 5 | อังกฤษ: Today ที่มี 1 ท่า และหลายท่า | `"1 exercise"` / `"2 exercises"` (พหูพจน์ถูก) |
| 6 | คลังท่า `/exercises` ค้นหาชื่อไทยและชื่ออังกฤษ (`exercise-search`) | เจอทั้งสองภาษา ไม่สนตัวพิมพ์และวรรณยุกต์ |
| 7 | ส่งออก CSV (`settings-export` → `export-workouts`, `export-daily`) | หัวคอลัมน์อังกฤษแบบ snake_case คงที่ (D33) ข้อมูลในคอลัมน์ใช้ภาษาที่เลือก เปิดใน Excel/Numbers/Google Sheets แล้วภาษาไทยไม่เพี้ยน |
| 8 | ราคาและหน้าซื้อของสโตร์ | รูปแบบราคาและภาษาบนหน้าซื้อมาจากประเทศ/ภาษาของบัญชีสโตร์ ไม่ใช่ภาษาที่เลือกในแอป — ถือว่าถูกต้อง |
| 9 | ข้อความ error (N8): ปิดเน็ตแล้วลองซื้อ/กู้คืน/ลบบัญชี/ซิงก์, ใส่ค่าผิดช่วงในโปรไฟล์ | ข้อความภาษาง่ายทั้งสองภาษา ไม่มีรหัส error ดิบ เช่น `"Please enter a value between {min} and {max}"` / `"กรุณากรอกค่าระหว่าง … ถึง …"` |
| 10 | ชื่อแอปบนหน้าจอหลัก | `Fitnese` ทั้งสองภาษา (`src/i18n/native/*.json`) |

### 4.2 โหมดมืด / สว่าง / ตามระบบ

- Settings → `"Theme"` / `"ธีม"` → `"Dark"`, `"Light"`, `"System"` (`segment-dark`, `segment-light`, `segment-system`)
- **ผลที่ต้องได้:** มืด = พื้นดำ + แสงเรืองสีหลักด้านบน · สว่าง = พื้นเทาอ่อน การ์ดขาว แสงเรืองจางลง · `"System"` เปลี่ยนตามการสลับโหมดของเครื่องทันทีขณะเปิดแอป · ไอคอน status bar อ่านออกทั้งสองโหมด · sheet, แป้นตัวเลข, กราฟ, ปุ่มล็อกอิน, หน้า Paywall/ล็อกอินถูกต้องทั้งสองโหมด · ไม่มีจุดที่ข้อความกลืนกับพื้น

### 4.3 จอเล็ก / จอใหญ่

| อุปกรณ์ | สิ่งที่ตรวจ |
|---|---|
| iPhone จอเล็กสุดที่ iOS เป้าหมายรองรับ (เช่น iPhone SE 4.7 นิ้ว หรือ simulator ขนาดเดียวกัน) | การ์ดแผน 2 ใบบน Paywall วางคู่กันโดยราคาไม่ถูกตัด (รวมตอนขยายตัวอักษร) · แถวเซ็ตในเซสชันพอดีจอ · แถบแท็บไม่บังปุ่มล่างสุด · คีย์บอร์ดไม่บังช่องกรอกใน sheet |
| iPhone จอใหญ่ (6.9 นิ้ว) | ระยะห่างไม่ยืดเกิน · แสงเรืองพอดีด้านบน |
| iPad (แอปตั้ง `supportsTablet: false` จึงรันแบบแอป iPhone บน iPad) | เปิดได้ ล็อกอิน/ซื้อได้ หน้าตาไม่พัง — ผู้รีวิวของ Apple อาจทดสอบบน iPad |
| Android จอเล็ก (~360×640 dp) และจอใหญ่/พับได้/แท็บเล็ต (emulator) | เหมือนข้อ iPhone · ปุ่ม Back ของระบบและแถบ gesture ไม่บังเนื้อหา |
| ทุกเครื่อง | แอปล็อกแนวตั้ง (`orientation: 'portrait'`) · safe area (รอยบาก, home indicator) ถูกต้อง |

---

## 5. เช็กลิสต์ regression ก่อนทุก release

ทำทุกครั้งก่อน `eas build --profile production` / ก่อนกด Submit ใช้คู่กับ HUMAN_TASKS ข้อ 80 (เช็กลิสต์ส่งรีวิว)

### 5.1 อัตโนมัติและค่าคอนฟิก

- [ ] `npm ci && npm run check` ผ่าน (จดจำนวนชุด/ข้อจากบรรทัดสุดท้าย)
- [ ] `RELEASE=1 npm test` ผ่าน (ไม่มี placeholder ในเอกสารกฎหมาย) และหน้า `/legal/privacy`, `/legal/terms` ไม่แสดงป้าย `"Template — the developer must review…"` / `"เทมเพลต — ผู้พัฒนาต้องตรวจ…"` แล้ว
- [ ] `npm run contrast` ผ่าน
- [ ] ถ้าแก้ `supabase/` หรือ state machine: `npm run supabase:verify` + `deno check …` ผ่าน, `node scripts/sync-shared.js` แล้ว `__tests__/shared.test.ts` ผ่าน, deploy ฟังก์ชันและ `npx supabase db push` แล้ว (HUMAN_TASKS ข้อ 85)
- [ ] `npx expo export` ทั้ง iOS/Android และ `npx expo prebuild --clean --no-install` ผ่าน (แล้วลบ `ios/` `android/`)
- [ ] `npx expo config --type introspect`: `ios.privacyManifests.NSPrivacyTracking = false` และ `NSPrivacyCollectedDataTypes` ระบุ Email Address, User ID, Fitness, Health, Purchase History — ทุกรายการ linked = true, tracking = false, จุดประสงค์ App Functionality (ตรงกับตาราง App Privacy ใน HUMAN_TASKS ส่วน R) · Android ไม่มีสิทธิ์ที่ถูก block (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`)
- [ ] `eas env:list --environment production`: `EXPO_PUBLIC_USE_MOCKS=0` และคีย์ครบ (ข้อ 37) · `version` ใน `app.config.ts` เป็นเวอร์ชันที่จะปล่อย · `eas.json` มี `ascAppId` จริง
- [ ] `grep -rn "TODO\|FIXME" src supabase scripts` ว่าง หรือทุกรายการบันทึกใน `docs/PROGRESS.md`

### 5.2 สมาชิกและบัญชี (build preview/TestFlight/internal ทั้ง iOS และ Android)

- [ ] P-01: Paywall ราคาจากสโตร์ตรงกับตารางข้อ 58, ป้ายทดลองและข้อความเปิดเผยครบ, ปุ่มซื้อมีราคา
- [ ] P-02: ล็อกอินก่อนซื้อ → เริ่มทดลอง → Today + ป้าย + ซิงก์ `"Up to date"` + Supabase `TRIALING`
- [ ] P-05 ซื้อขาด และ P-06 อัปเกรดเป็นซื้อขาด (มีคำเตือนให้ยกเลิกรายเดือน)
- [ ] P-07 Restore (ก) และ (ข)
- [ ] P-08 ติดตั้งใหม่ → ล็อกอิน → ข้อมูลและสิทธิ์กลับมา
- [ ] P-09 บัญชีไม่มีสิทธิ์ทดลองไม่เห็นคำว่าทดลองฟรี
- [ ] P-12 ข้อ ก–ค (ออฟไลน์แล้วซิงก์) และข้อ ฎ (ซื้อตอนออฟไลน์)
- [ ] P-13 ล็อกอิน Google และ Apple ทั้งสองแพลตฟอร์ม
- [ ] P-14 ลบบัญชี (อย่างน้อยบัญชี Apple บน iPhone 1 ครั้ง) + คำเตือนเรื่องสมาชิกในสโตร์
- [ ] ปุ่ม `"Manage subscription"`, `"Restore purchases"`, Privacy, Terms, References, `"Delete account and data"` เปิดได้ทั้งจาก Settings และ `/account`
- [ ] ถ้ารุ่นนี้แก้ส่วนสิทธิ์/Paywall/webhook: ทำส่วนที่ 2 ครบทุกเคส

### 5.3 ฟีเจอร์หลัก (ทำบนเครื่องจริงอย่างน้อย 1 แพลตฟอร์มต่อ release สลับกันไป)

- [ ] **Today:** หัวข้อ `"Today: {routine}"` / `"Rest day today"` ถูกตามตาราง · ปุ่มวงกลม `"Start"` · `"What do you feel like today?"` เปลี่ยนเป็น routine อื่น / `"Start an empty session"` / `"Rest today"` แล้ว `"Changed for today only — your weekly plan is unchanged."` · `"Back to this week’s plan"` · เช็กลิสต์กล้ามเนื้อ · แตะกรอก `"Calories burned today"` (`today-kcal-burned`, ขึ้น `"Entered by you"`) และ `"Calories eaten today"` (`today-kcal-eaten`) · ป้ายต่ออายุ/สิ้นสุดทดลอง · คำเตือนสุขภาพ + ลิงก์ "Sources" ไป `/references`
- [ ] **ตารางสัปดาห์ `/week`:** แตะจุดวันเปิด/ปิด · สวิตช์ routine · `"Copy from another day"` (`week-copy` → `copy-from-<d>` → `copy-to-<d>` → `copy-confirm`) · สลับโปรแกรมทั้งสัปดาห์ (`week-program-<id>`) · แก้เฉพาะวันที่ใน `"Next 7 days"` (`week-day-<date>`) · วันเริ่มสัปดาห์ จันทร์/อาทิตย์
- [ ] **Programs:** สร้างจากทุกเทมเพลต (`use-template-<key>`), สร้างเอง (`programs-add` → `new-program-name` → `new-program-create`), เพิ่ม routine (`program-add-routine`), คัดลอก/ย้าย routine ข้ามกรุ๊ป, ลบโปรแกรมแล้วประวัติยังอยู่
- [ ] **Routine `/routine/[id]`:** เพิ่มท่าจากคลัง (`routine-add-exercise` → `ex-<id>` → `exercises-add-selected`), จัดลำดับ, ตั้งค่าท่า (`exercise-settings`): เซ็ต ช่วงครั้ง โหมด progression ทั้ง 4 แบบ ก้าวน้ำหนัก ตัวจับเวลาพัก — ค่าขั้นสูงซ่อนหลังปุ่ม "More" / `"เพิ่มเติม"` · RIR รับ 0–10, RPE รับ 1–10 (นอกช่วงต้องถูกปฏิเสธพร้อมข้อความ)
- [ ] **คลังท่า:** ไอคอนกลุ่มกล้ามเนื้อ, ค้นหา/กรอง (`filter-<muscle>`, `filter-eq-<e>`), สร้างท่าเอง (`exercises-new` → `custom-name` → `primary-<muscle>` → `custom-save`) และแก้ท่าที่สร้างเองได้
- [ ] **เซสชัน:** แป้นตัวเลขใหญ่ (`number-pad`), ติ๊กเซ็ต + haptic, ตัวจับเวลาพัก (`rest-timer`, `rest-skip`), แตะเป้า → `"Today only"` / `"From now on"` (`target-today`, `target-forward`), เพิ่ม/ลบเซ็ต (รวมลบเซ็ตรายตัว), เพิ่ม/สลับ/จัดลำดับ/ลบท่า (`ex-menu-<id>`), เปิดตั้งค่าท่าจากเซสชัน, ออกแล้วกลับมาต่อ (`today-resume`), `"Discard workout"` ยืนยันก่อนลบ
- [ ] **บันทึกย้อนหลัง:** Today → เมนู (`today-menu`) → `"Log a past workout"` → เลือกวัน (`log-past-<n>`) → เลือก routine → เซสชันขึ้น `"Logged for {date}"` → ตอนจบถามระยะเวลา → ประวัติขึ้น `"Logged later"`
- [ ] **สรุปเซสชัน:** เลือกความหนัก (`intensity-<i>`) → `session-save` → แคลอรี่ (`summary-kcal`) · เป้าครั้งหน้า `"Accept"` / `"Skip"` (`accept-<id>`, `skip-<id>`) · คำเตือนสุขภาพ + "Sources" · `"Back to Today"` (`summary-home`)
- [ ] **สถิติ:** ช่วง วัน/สัปดาห์/เดือน/ปี + เลื่อนย้อน (`stats-prev`, `stats-next`) · 3 มุมมอง × 3 ตัวชี้วัด รวม 100% เสมอ · กรองกรุ๊ป (`group-all`, `group-<key>`) · สถานะว่าง · พลังงานเทียบ TDEE · บันทึกน้ำหนัก · ประวัติ (`stats-see-all` → `/history` → `/history/[id]` → ลบ) · ความแข็งแรง 1RM (`strength-<id>` → `/stats/exercise/[id]`) · คำเตือนสุขภาพ + "Sources" ในสถิติ ความแข็งแรง และประวัติ
- [ ] **โปรไฟล์ `/profile`:** BMR/TDEE/เป้าแคลอรี่/macro คำนวณสด · อายุ < 18 ไม่มีเป้าลดน้ำหนัก · เพดาน 1,200/1,500 · ปรับเป้าและ MET อยู่หลัง "More" · บันทึก (`profile-save`) · คำเตือน (`health-disclaimer`) + ลิงก์แหล่งอ้างอิง (`profile-references`)
- [ ] **Settings:** หน่วย kg/lb และ cm/ft-in (ค่าที่แสดงแปลงถูก ข้อมูลเก็บเป็น kg), ตัวจับเวลาพัก, วันเริ่มสัปดาห์, ก้าวน้ำหนัก, ส่งออก CSV ทั้ง 2 ไฟล์, `"Sync now"`, เวอร์ชันแอปตรงกับที่จะปล่อย, คำเตือนเมื่อมีซื้อขาดแต่รายเดือนยังต่ออายุ
- [ ] **`/references`:** มี Mifflin et al. 1990, ISSN Protein and Exercise (2017), Compendium of Physical Activities (2024) และลิงก์เปิดได้
- [ ] ภาษาไทย + อังกฤษ และโหมดมืด + สว่าง อย่างน้อยหน้าละ 1 รอบ (ข้อ 4.1–4.2)
- [ ] VoiceOver/TalkBack flow Paywall → ล็อกอิน → เซสชัน (ข้อ 3.1) และขยายตัวอักษรสูงสุดบน Paywall + เซสชัน (ข้อ 3.2)

### 5.4 เซิร์ฟเวอร์

- [ ] RevenueCat → Webhooks → `"Send test event"` ได้ HTTP 200 และ `revenuecat_events` มีแถว `type = TEST` (ข้อ 62)
- [ ] Edge Functions → Logs ของ `revenuecat-webhook` และ `delete-account` ไม่มี error ใหม่ (ข้อ 84)
- [ ] `revenuecat_events` ไม่มีแถวเก่ากว่า 90 วัน (กลไกลบอัตโนมัติที่มาพร้อมรุ่นนี้): `select count(*) from public.revenuecat_events where received_at < now() - interval '90 days';` ต้องได้ 0
- [ ] Apple OAuth client secret ยังไม่หมดอายุ (ข้อ 82) — ถ้าหมด Sign in with Apple บน Android ใช้ไม่ได้

### 5.5 หลังปล่อย

- [ ] ติดตั้งเวอร์ชันจากสโตร์จริงบนเครื่องที่มีข้อมูลเวอร์ชันก่อน → อัปเดต → ข้อมูลยังอยู่ครบ (migration ในเครื่องทำงาน) และสถานะสมาชิกไม่เปลี่ยน
- [ ] ดู RevenueCat (webhook ที่ล้ม) และ Supabase Logs วันแรกหลังปล่อย (ข้อ 84)

---

## 6. แบบฟอร์มบันทึกผล

คัดลอกตารางนี้ไปเป็นบันทึกของแต่ละเวอร์ชัน (เช่น สเปรดชีตหรือ issue ของ release) หนึ่งแถวต่อหนึ่งเคสต่อหนึ่งแพลตฟอร์ม ผลที่ "ไม่ผ่าน" ต้องมีภาพหน้าจอหรือวิดีโอ และขั้นตอนทำซ้ำ

| รหัส | แพลตฟอร์ม / เครื่อง / OS | build (โปรไฟล์ + เลข build) | บัญชีสโตร์ / บัญชีแอป | วันที่ | ผล (ผ่าน / ไม่ผ่าน / ข้าม) | หมายเหตุ (ค่าเวลา sandbox ที่เจอจริง, ลิงก์ภาพ, เหตุผลที่ข้าม) |
|---|---|---|---|---|---|---|
| P-01 | | | | | | |
| … | | | | | | |

สรุปท้ายบันทึก: จำนวนผ่าน/ไม่ผ่าน/ข้าม ต่อแพลตฟอร์ม, ราคาที่ Paywall แสดง (ส่งต่อไปตารางข้อ 58), ปัญหาที่ต้องแก้ก่อนส่งรีวิว
