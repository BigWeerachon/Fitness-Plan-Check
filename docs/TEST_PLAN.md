# TEST_PLAN — แผนทดสอบ Fitnese

> เอกสารนี้ตอบ SPEC **N3** (ทดสอบการซื้อและช่วงทดลองทุกสถานะด้วย Apple sandbox / TestFlight และ Google license testers), **N5** (accessibility) และ **N8** (คุณภาพ/เทสต์อัตโนมัติ) ตามที่ [SPEC_CHANGES.md](SPEC_CHANGES.md) ปรับ (แอปออฟไลน์ล้วน ไม่มีบัญชี/ล็อกอิน/ซิงก์ — D81) และเป็นคู่มือที่ `docs/HUMAN_TASKS.md` ส่วน O (ข้อ 45–48) อ้างถึง
>
> **ป้ายในเอกสาร** เขียนเป็น `"ข้อความอังกฤษ" / "ข้อความไทย"` ตามไฟล์ `src/i18n/locales/en|th/*.ts` และ `testID` เขียนในเครื่องหมาย `` ` `` (เช่น `paywall-cta`) ส่วนเส้นทางเขียนแบบ Expo Router (เช่น `/paywall`, `/legal/[doc]`) — ถ้าข้อความในแอปต่างจากที่เขียน ให้ยึดไฟล์ i18n และบันทึกความต่างในผลทดสอบ

## สารบัญ

0. [เตรียมก่อนทดสอบ](#0-เตรียมก่อนทดสอบ)
1. [ตรวจอัตโนมัติ (N8)](#1-ตรวจอัตโนมัติ-n8)
2. [ทดสอบบนอุปกรณ์จริง: สมาชิก สิทธิ์ ข้อมูลในเครื่อง (N3)](#2-ทดสอบบนอุปกรณ์จริง-สมาชิก-สิทธิ์-ข้อมูลในเครื่อง-n3)
3. [Accessibility (N5)](#3-accessibility-n5)
4. [ภาษา ธีม และขนาดจอ](#4-ภาษา-ธีม-และขนาดจอ)
5. [เช็กลิสต์ regression ก่อนทุก release](#5-เช็กลิสต์-regression-ก่อนทุก-release)
6. [แบบฟอร์มบันทึกผล](#6-แบบฟอร์มบันทึกผล)

---

## 0. เตรียมก่อนทดสอบ

### 0.1 build ที่ใช้

| ใช้ทดสอบ | build | ทำตาม |
|---|---|---|
| ระหว่างพัฒนา + ซื้อด้วยบัญชี sandbox | development build (`eas build --profile development`) + `npm start` + `.env` คีย์จริง `EXPO_PUBLIC_USE_MOCKS=0` | HUMAN_TASKS ข้อ 20, 41 |
| พฤติกรรมเหมือน release | `preview` (Android APK / iOS internal) | ข้อ 42 |
| ก่อนส่งรีวิว | TestFlight (iOS) / Internal testing ของ Play (Android) จาก build `production` | ข้อ 43–44 |

**ห้ามทดสอบส่วนที่ 2 ในโหมด mock** วิธีดูว่าไม่ใช่ mock: แตะซื้อแล้วต้องเห็นหน้าซื้อของ App Store / Google Play จริง (โหมด mock ซื้อผ่านทันทีโดยไม่มีหน้าของสโตร์) และ Paywall ไม่ควรแสดงราคา `฿19.00 / ฿99.00` ของสโตร์จำลอง (D20) เว้นแต่ราคาที่ตั้งจริงบังเอิญเท่ากัน — release build บนมือถือไม่ใช้ mock เด็ดขาด (D47, `__tests__/services/config.test.ts`)

### 0.2 บัญชีและเครื่องที่ต้องมี

- **iOS:** บัญชี sandbox หลายบัญชี (ข้อ 45) — ใช้บัญชีใหม่ทุกครั้งที่ต้องการ "ลูกค้าใหม่ที่มีสิทธิ์ทดลอง" ลงชื่อ sandbox ที่ iPhone: Settings → App Store → Sandbox Account (iOS รุ่นใหม่อาจอยู่ที่ Settings → Developer → Sandbox Apple Account) · TestFlight ใช้ Apple ID จริงของผู้ทดสอบแต่ซื้อในสภาพแวดล้อม sandbox (ไม่เสียเงิน)
- **Android:** บัญชี Gmail ที่เป็น License tester และอยู่ในรายชื่อ Internal testing (ข้อ 46) ต้องเป็นบัญชีหลักของ Play Store ในเครื่อง
- **ไม่มีบัญชีแอป:** แอปไม่มีล็อกอิน สิทธิ์ผูกกับบัญชีสโตร์ผ่านรหัสนิรนามของ RevenueCat (D81.2)
- **เครื่อง:** iPhone 1 เครื่อง + Android 1 เครื่องเป็นขั้นต่ำ — เคส "เปลี่ยนเครื่อง" (P-08) ต้องมี **เครื่องที่สองของแพลตฟอร์มเดียวกัน** (หรือลบแอปแล้วติดตั้งใหม่) เพราะการซื้อกู้คืนข้ามแพลตฟอร์มไม่ได้ ส่วนไฟล์สำรองย้ายข้ามแพลตฟอร์มได้

### 0.3 ที่ดูผลระหว่างทดสอบ

| ที่ | ดูอะไร |
|---|---|
| แอป → แท็บ Settings (`tab-settings`) → ส่วน `"Membership"` / `"สมาชิก"` → แถว `settings-membership` | ชื่อสถานะ + วันที่ (B7) |
| แอป → แท็บ Settings → ส่วน `"Your data"` / `"ข้อมูลของคุณ"` | `"Back up data"` (`settings-backup`, บรรทัดรอง `"Last backup: {date}"` / `"Not backed up yet"`), `"Restore from file"` (`settings-restore-file`), `"Export CSV"` (`settings-export`), `"Delete all data on this device"` (`settings-delete`) + ข้อความเตือน (`settings-backup-hint`) |
| แอป → `/account` (ปุ่ม `"Settings"` / `"การตั้งค่า"` บน Paywall) | เข้าได้เสมอแม้ถูกล็อก: สถานะสมาชิก, `"Restore purchases"` (`account-restore`), `"Manage subscription"` (`account-manage`), `"Edit setup"` (`account-edit-setup`), สำรอง (`account-backup`), กู้คืนจากไฟล์ (`account-restore-file`), ลบข้อมูลทั้งหมด (`account-delete-data`) |
| แอป → แท็บ Today (`today`) | ป้ายเล็กใต้หัวข้อ (B7) |
| RevenueCat → Customers | ลูกค้ามี id แบบ `$RCAnonymousID:…` (ไม่มีอีเมล/ชื่อ) — ค้นด้วย Transaction ID/Order ID หรือดูรายการล่าสุด · entitlement `pro`, period type (trial/normal), วันหมดอายุ, ประวัติธุรกรรม, ประวัติการ alias/transfer เมื่อกู้คืนบนเครื่องใหม่ |

แอปตัดสินสิทธิ์จาก customerInfo ของ RevenueCat SDK บนเครื่องเท่านั้น (`src/domain/entitlement/machine.ts`) — ไม่มีเซิร์ฟเวอร์ของเราให้ตรวจ แอปตรวจสิทธิ์ใหม่ทุกครั้งที่กลับเข้าแอป (foreground) และเมื่อกลับมาออนไลน์ จึงให้สลับแอปออกแล้วกลับเข้ามาหลังเปลี่ยนสถานะในสโตร์

### 0.4 สถานะสิทธิ์ (B8) → สิ่งที่ผู้ใช้ต้องเห็น

| สถานะ | แถว Membership (`settings-membership` / `/account`) | ป้ายบน Today | เข้าแอปได้ |
|---|---|---|---|
| `NO_ENTITLEMENT` | `"No active plan"` / `"ยังไม่มีแพ็กเกจ"` | — | ไม่ → `/paywall` |
| `TRIALING` | `"Free trial"` / `"ทดลองใช้ฟรี"` + `"Trial ends {date}, then renews monthly"` (ถ้ายกเลิกแล้ว: `"Trial ends {date}"`) | `"Trial ends {date}"` / `"ทดลองถึง {date}"` | ได้ |
| `SUBSCRIBED_MONTHLY` | `"Monthly"` / `"รายเดือน"` + `"Renews {date}"` (ถ้ายกเลิกแล้ว: `"Access until {date}"`) | เฉพาะเมื่อยกเลิกแล้ว: `"Access until {date}"` | ได้ |
| `LIFETIME` | `"Lifetime"` / `"ซื้อขาด"` + `"Lifetime access"` | — | ได้ |
| `BILLING_GRACE` | `"Payment issue"` / `"มีปัญหาการชำระเงิน"` + `"Update your payment by {date} to keep access"` | `"Payment issue"` (โทนเตือน) | ได้ |
| `EXPIRED` | `"Expired"` / `"หมดอายุแล้ว"` + `"Ended {date}"` | — | ไม่ → `/paywall` หัวข้อ `"Welcome back — pick up where you left off"` (ถ้าหมดเพราะปัญหาการชำระเงิน: `"There’s a problem with your payment"` + ปุ่ม `"Fix payment"`) |

วันที่ภาษาไทยแสดงเป็น พ.ศ. (เช่น `16 ต.ค. 2569`) ภาษาอังกฤษเป็น `Oct 16, 2026` (`src/i18n/format.ts`) · ข้อมูลในเครื่องไม่ถูกลบในทุกสถานะ (B3)

### 0.5 เวลาเร่งของ sandbox (ต้องตรวจเอกสารปัจจุบันก่อนทดสอบ)

Apple และ Google ย่อเวลาต่ออายุในสภาพแวดล้อมทดสอบ ตัวเลขด้านล่างเป็น **ค่าที่เคยประกาศไว้ อาจเปลี่ยนแล้ว** — ก่อนทดสอบให้เปิดเอกสาร "Testing in-app purchases with sandbox" / "Testing in-app purchases with TestFlight" ของ Apple และ "Test Google Play Billing (license testers)" ของ Google แล้วจดค่าจริงลงบันทึกผล

| ระยะเวลาจริง | Apple sandbox (ค่าเดิมที่ทราบ) | Google license tester (ค่าเดิมที่ทราบ) |
|---|---|---|
| ทดลองฟรี 1 สัปดาห์ / 7 วัน | ~3 นาที | ~3 นาที |
| รอบบิล 1 เดือน | ~5 นาที | ~5 นาที |
| ต่ออายุอัตโนมัติได้กี่รอบก่อนหยุดเอง | ~12 รอบ | ~6 รอบ |
| grace period / account hold | ใช้ตามที่ตั้งในข้อ 25 (Server Environments = Sandbox and Production) | ย่อเหลือหลักนาที |
| TestFlight | ใช้อัตราต่ออายุของ TestFlight เอง — ตรวจเอกสาร | — |

### 0.6 ข้อมูลที่ควรสร้างไว้ก่อน (เพื่อดูว่าข้อมูลไม่หาย)

หลังได้สิทธิ์ครั้งแรก ให้สร้าง "ชุดข้อมูลตรวจ" นี้ แล้วใช้ตรวจหลังทุกเคสที่สิทธิ์หมด/สำรอง/กู้คืน/อัปเดตแอป:

1. แท็บ Programs (`tab-programs`) → `"Start from a template"` / `"เริ่มจากเทมเพลต"` → เลือก PPL → `"Use this template"` (`use-template-ppl3`)
2. Today → การ์ด routine ของวันนี้ → ปุ่มวงกลม `"Start"` (`start-<id>`) → ติ๊ก 2 เซ็ต (`tick-<exerciseId>-0`, `-1`) → `"Finish workout"` (`session-finish`) → เลือกความหนัก → `"Save workout"` (`session-save`)
3. Stats → `"Log today’s weight"` (`stats-log-weight`) ใส่ค่า
4. จดชื่อโปรแกรม, จำนวนเซสชันใน History (`/history`) และน้ำหนักล่าสุด (`stats-latest-weight`)

---

## 1. ตรวจอัตโนมัติ (N8)

### 1.1 คำสั่ง

| คำสั่ง | ทำอะไร | พิสูจน์อะไร | ต้องมี |
|---|---|---|---|
| `npm run check` | `npm run typecheck && npm run lint && npm run test -- --ci` | ผ่านทั้งสามอย่าง = พร้อม commit (กฎใน `CLAUDE.md`) | Node 22, `npm ci` |
| `npm run typecheck` | `tsc --noEmit` (strict) | ชนิดถูกทั้งโปรเจกต์ รวมเส้นทางแบบ typed routes ของ Expo Router | — |
| `npm run lint` | `expo lint --max-warnings 0` | ไม่มี warning, รูปแบบ prettier, ไม่มีข้อความฮาร์ดโค้ดใน JSX หรือ prop `accessibilityLabel/placeholder/title/label` | — |
| `npm test` | jest — SQLite จริงผ่าน better-sqlite3, สโตร์จำลอง | รายการชุดเทสต์ในข้อ 1.2 | — |
| `RELEASE=1 npm test` | เปิดตัวกันพลาดก่อนส่งสโตร์ | **ล้มเหลวถ้ายังมีค่า placeholder** ใน `src/legal/content.ts` | — |
| `npm run contrast` | `tsx scripts/contrast-report.ts` | ตาราง contrast ของสีหลักทั้ง 8 สี × โหมดมืด/สว่าง — **exit code 1 ถ้ามีค่าใดไม่ผ่าน WCAG AA** | — |
| `node store-metadata/check-limits.js` | นับตัวอักษรข้อความหน้าร้าน/App Review Notes | ไม่เกินขีดจำกัดของสโตร์ และตัวเลขที่เขียนไว้ตรงกับที่นับจริง (`--release` ล้มถ้ายังมี placeholder) | — |
| `npm run doctor` | `npx expo-doctor` | เวอร์ชันแพ็กเกจตรงกับ Expo SDK 57 | เครือข่าย |
| `npx expo export --platform ios --output-dir <โฟลเดอร์ชั่วคราว>` และ `--platform android` | bundle JS ของทั้งสองแพลตฟอร์ม (D21) | Metro หา import ครบ — **ไม่ได้พิสูจน์ว่า native build ผ่าน** | — |
| `npx expo prebuild --clean --no-install` | สร้าง `ios/` และ `android/` จาก `app.config.ts` (อยู่ใน `.gitignore` — ลบทิ้งหลังตรวจ) | plugin ทำงาน: `blockedPermissions`, privacy manifest (`ios/*/PrivacyInfo.xcprivacy`) | — |
| `npx expo config --type introspect` | พิมพ์ config สุดท้าย | ตรวจ `ios.privacyManifests` และสิทธิ์ Android ตามเช็กลิสต์ข้อ 5.1 | — |
| `npm run preview:web` แล้ว `node scripts/web-screenshots.js <โฟลเดอร์> [en\|th] [dark\|light] [สีหลัก]` | พรีวิวเว็บในโหมด mock + ถ่ายภาพทุกหน้า (Playwright) | ตรวจภาพเร็วๆ เท่านั้น (D43) | Playwright |
| `npm run legal:export` | เขียน `docs/legal/*.md` ใหม่จาก `src/legal/content.ts` | สำเนาเว็บตรงกับในแอป | — |

ไม่มีชุดเทสต์ E2E บนเครื่องจริง (Detox/Maestro) — ส่วนที่ 2–4 ต้องทดสอบด้วยมือ

### 1.2 ชุดเทสต์ใน `__tests__/`

จำนวนชุด/ข้อเทสต์ดูที่บรรทัดสุดท้ายของ `npm run check` (1 ข้อข้ามโดยตั้งใจ = guard `RELEASE` ของเอกสารกฎหมาย) โครงสร้างตามโฟลเดอร์อธิบายใน [ARCHITECTURE.md §8](ARCHITECTURE.md) — ชุดที่เกี่ยวกับส่วนที่ 2 ของเอกสารนี้:

| ไฟล์ | ตรวจอะไร |
|---|---|
| `domain/entitlement.test.ts` | สิทธิ์ทั้ง 6 สถานะ, แปลง customerInfo → สถานะ (ซื้อขาดชนะ, คืนเงิน, billing issue), แคชออฟไลน์ + ผ่อนผัน 48 ชม. (B8–B9, J5) |
| `domain/paywall.test.ts` | ทดลองฟรีเฉพาะผู้มีสิทธิ์ (ไม่รู้ผล = ไม่แสดง), หัวข้อ winback/billing/upgrade, สโตร์ไม่มีสินค้า, ราคาจากสโตร์ (B5–B6, J2) |
| `flows/account.test.ts` | ซื้อทันทีโดยไม่ล็อกอิน, กู้คืนการซื้อแบบนิรนาม, "เครื่องใหม่" ได้สิทธิ์คืน, ข้อมูลอยู่ครบเมื่อหมดสิทธิ์และกลับมาเมื่อสมัครใหม่ (B3, B4, B11) |
| `flows/offline-access.test.ts` | ข้อมูลแคชของ RevenueCat ถือว่าเก่า, ผ่อนผัน 48 ชม., ถามสโตร์ใหม่เมื่อถึงวันหมดอายุขณะเปิดแอป (D49–D50) |
| `app/paywall.test.tsx`, `app/membership.test.tsx`, `app/gate.test.tsx`, `app/onboarding*.test.tsx` | Paywall/สมาชิก/ตัวกั้นสิทธิ์/ตั้งค่าเริ่มต้น (รวม "เคยซื้อแล้ว? กู้คืนการซื้อ" และข้ามขั้นสำหรับผู้มีสิทธิ์) |
| `domain/backup.test.ts`, `db/backup.test.ts`, `features/useBackup.test.tsx`, `app/backup.test.tsx` | รูปแบบไฟล์สำรอง, ตรวจไฟล์เสีย/ใหม่กว่า/ไม่ครบ/ชนิดผิด/id ซ้ำ, schema เก่า, round-trip ทุกตาราง, rollback เมื่อพังกลางทาง, ปุ่มในหน้าตั้งค่าและหน้า `/account` (D82) |
| `features/deleteAllData.test.ts`, `app/delete-data.test.tsx` | ลบข้อมูลทั้งหมดในทรานแซกชันเดียว, คงค่าของเครื่อง, ยืนยัน 2 ขั้น + คำเตือนเรื่องสมาชิก (B12 ตาม SPEC_CHANGES) |
| `db/migrations.test.ts` | อัปเกรดฐานข้อมูลยุคซิงก์ (0004–0006) โดยข้อมูลเดิมยังอยู่ (D81) |
| `appConfig.test.ts`, `legal.test.ts` | privacy manifest เหลือ UserID + PurchaseHistory, ไม่มีปลั๊กอินล็อกอิน; นโยบายฯ/ข้อกำหนดฉบับออฟไลน์ (D83) |

### 1.3 SPEC N8 (ตาม SPEC_CHANGES) → เทสต์ที่ครอบคลุม

| N8 | เทสต์อัตโนมัติ | ต้องทดสอบด้วยมือเพิ่ม |
|---|---|---|
| BMR/TDEE/macro/MET | `domain/nutrition` | — |
| progression | `domain/progression`, `flows/progression` | — |
| % สถิติ | `domain/stats`, `domain/periods`, `app/stats` | — |
| state machine สิทธิ์ทุกสถานะ | `domain/entitlement` | P-02 ถึง P-11 |
| ออฟไลน์ / แคชสิทธิ์ออฟไลน์ | `flows/offline-access`, `domain/entitlement` (resolveAccess) | P-12 |
| ซื้อ/กู้คืนการซื้อแบบไม่ล็อกอิน | `flows/account`, `features/useRestorePurchases`, `app/paywall` | P-02, P-07, P-08 |
| สำรอง / กู้คืนจากไฟล์ | `domain/backup`, `db/backup`, `features/useBackup`, `app/backup` | P-13 |
| ลบข้อมูลทั้งหมดในเครื่อง | `features/deleteAllData`, `app/delete-data` | P-14 |
| migration รักษาข้อมูลเดิม | `db/migrations` | P-15 |
| error ภาษาง่ายๆ | `i18n` (มีข้อความครบทั้งสองภาษา) | ตรวจข้อความ error ทุกตัวในข้อ 4.1 |

---

## 2. ทดสอบบนอุปกรณ์จริง: สมาชิก สิทธิ์ ข้อมูลในเครื่อง (N3)

**ทำทั้ง iOS และ Android ทุกเคส** ยกเว้นที่ระบุ ทำเรียงตามเลขได้ เพราะเคสหลังใช้บัญชีสโตร์/ข้อมูลจากเคสก่อน

| HUMAN_TASKS | เคสในเอกสารนี้ |
|---|---|
| ข้อ 41 (ซื้อทดสอบครบวงจร) | P-01, P-02, P-06, P-08 |
| ข้อ 45 (iOS: sandbox / TestFlight) | P-01 ถึง P-09, P-11 (ถ้า sandbox ทำได้), P-12 — P-10 ถ้า sandbox รองรับ |
| ข้อ 46 (Android: license testers) | ชุดเดียวกับข้อ 45 + **P-10** (grace period / account hold) + **P-11** (คืนเงิน) + **P-16** (pending) |
| ข้อ 47 (ข้อมูลในเครื่อง) | P-13, P-14, P-15, P-12 ข้อ ก–ข |
| ข้อ 48 (ข้อมูลสำหรับผู้รีวิว) | P-17 |

### P-01 เปิดแอปครั้งแรก → ตั้งค่าเริ่มต้น → Paywall (B3, B4, B5, B6, C, J2)

- **เตรียม:** ติดตั้งใหม่ (ลบแอปเดิมก่อน) · ลงชื่อบัญชีสโตร์ที่ยังไม่เคยทดลองสินค้านี้
- **ขั้นตอน:**
  1. เปิดแอป → ต้องเข้า `/onboarding` ขั้น 1 `"Make it yours"` / `"ตั้งค่าให้เป็นแบบของคุณ"` (`onboarding-step-1`) ภาษาเริ่มต้นตามภาษาเครื่อง และมีลิงก์ `"Already purchased? Restore purchases"` / `"เคยซื้อแล้ว? กู้คืนการซื้อ"` (`onboarding-restore`)
  2. เลือกภาษา (`lang-th` / `lang-en`) ธีม (`segment-dark` / `segment-light` / `segment-system`) สีหลัก (`accent-<id>`) → การ์ดตัวอย่างเปลี่ยนสดทันที → `"Next"` (`onboarding-next`)
  3. ขั้น 2 `"About you"` / `"ข้อมูลของคุณ"`: กรอกเพศ อายุ ส่วนสูง น้ำหนัก ระดับกิจกรรม เป้าหมาย (หรือ `"Skip for now"` `onboarding-skip` ในรอบอื่น)
  4. ขั้น 3 `"Quick start"`: เลือกเทมเพลต (`template-ppl3`) → `"Continue"`
  5. ที่ `/paywall` รอ `"Loading plans from the store…"` หายไป
  6. ตรวจ B3: เปิด deep link หน้าฟีเจอร์ — Android `adb shell am start -a android.intent.action.VIEW -d "fitnese://stats"` / iOS Simulator `xcrun simctl openurl booted "fitnese://stats"`
  7. แตะ `"Settings"` / `"การตั้งค่า"` บน Paywall → `/account` → ตรวจว่าเปิด `"Privacy Policy"`, `"Terms of Use"`, `"References"` ได้ และเห็นหมวด `"Your data"` (สำรอง/กู้คืนจากไฟล์/ลบข้อมูลทั้งหมด) แล้วกลับ
  8. ใน `/account` แตะ `"Edit setup"` (`account-edit-setup`) → แก้โปรไฟล์/โปรแกรมของขั้นตั้งค่าเริ่มต้นได้ทั้งที่ยังไม่มีสิทธิ์
- **ผลที่ต้องได้:**
  - หัวข้อ `"Unlock your full training plan"` บรรทัดรอง `"Every feature, no account or sign-in needed."` · ฟีเจอร์ `"Works offline — your data stays on your device"`
  - แผนรายเดือน (`plan-monthly`): ป้าย `"7-day free trial"`, ราคาเต็มจากสโตร์ + `"per month"` (ไม่ถูกตัด D45), `"Renews monthly. Cancel anytime."`
  - แผนซื้อขาด (`plan-lifetime`): ราคา + `"one-time payment"` + `"Unlocks everything with a one-time payment. No free trial."`
  - ปุ่ม `paywall-cta` มี **ราคาจากสโตร์อยู่ในข้อความ** และบรรทัดยอดเรียกเก็บ `"7 days free, then {price}/month"` เด่นเหนือปุ่ม (D60)
  - ข้อความเปิดเผย (`paywall-disclosures`) ครบ: ราคาหลังทดลอง · ต่ออายุอัตโนมัติ · ยกเลิกอย่างน้อย 24 ชม. ก่อนสิ้นสุดทดลองในการตั้งค่าบัญชี App Store/Google Play · ซื้อขาดไม่มีทดลอง
  - มี `"Restore purchases"` (`paywall-restore`), `"Manage or cancel subscription"`, ลิงก์ Terms/Privacy/References และ `"Your purchase is linked to your {store} account. On a new phone, tap Restore purchases."` (`paywall-store-account`) — **ไม่มีหน้า/ปุ่มล็อกอินใดๆ**
  - ไม่มีปุ่ม "ข้าม" เข้าแอป · deep link ข้อ 6 พากลับ `/paywall`
  - ราคาที่เห็นตรงกับที่ตั้งในสโตร์ → จดลงตาราง HUMAN_TASKS ข้อ 37 คอลัมน์ "ราคาที่ Paywall แสดง"

### P-02 เริ่มทดลองฟรี (B1, B4, B7, J3)

- **เตรียม:** ต่อจาก P-01
- **ขั้นตอน:** เลือก `plan-monthly` → แตะ `paywall-cta` → หน้าซื้อของสโตร์ต้องเปิด **ทันที** (ไม่มีขั้นล็อกอิน) และแสดงทดลองฟรี 7 วันและราคาหลังจากนั้น → ยืนยันด้วยบัญชี sandbox / license tester
- **ผลที่ต้องได้:**
  - แอป: `"You’re all set! Enjoy Fitnese Pro."` → เข้า Today · โปรแกรม PPL และตารางสัปดาห์จากขั้นตั้งค่าเริ่มต้นอยู่ในแท็บ Programs · โปรไฟล์ที่กรอกอยู่ใน `/profile`
  - Today มีป้าย `"Trial ends {date}"` · Settings → Membership: `"Free trial"` + `"Trial ends {date}, then renews monthly"`
  - RevenueCat: ลูกค้าใหม่ id `$RCAnonymousID:…` · entitlement `pro` active · period type trial
- **ทำต่อทันที:** สร้าง "ชุดข้อมูลตรวจ" ตามข้อ 0.6

### P-03 ทดลองหมดแล้วแปลงเป็นจ่ายเงิน (B2, J5)

- **เตรียม:** บัญชีจาก P-02 ที่ไม่ได้ยกเลิก · ดูเวลาเร่งในข้อ 0.5
- **ขั้นตอน:** รอเกินช่วงทดลองแบบเร่ง → สลับแอปออกแล้วกลับเข้ามา (หรือเปิดแอปค้างไว้ข้ามเวลาหมดทดลอง) → รอให้ต่ออายุอีก 1–2 รอบ
- **ผลที่ต้องได้:**
  - ใช้งานต่อได้โดยไม่เด้ง Paywall (ถ้าเปิดค้างข้ามเวลาหมดอายุ อาจเห็นสถานะกำลังโหลดสั้นๆ ระหว่างถามสโตร์ใหม่ D50) · Membership: `"Monthly"` + `"Renews {date}"` · ป้ายบน Today หายไป
  - ไม่มีตัวนับทดลองในแอป — วันที่ทั้งหมดมาจาก `expirationDate` ของสโตร์ (B2) · RevenueCat: period type normal
  - เมื่อ sandbox หยุดต่ออายุเอง → สถานะเป็น `EXPIRED` → ทำ P-04 ข้อ "หลังหมดอายุ" ได้เลย

### P-04 ยกเลิกระหว่างทดลอง และยกเลิกหลังจ่ายแล้ว (J5, B3)

- **เตรียม:** บัญชีสโตร์ใหม่ เริ่มทดลองตาม P-02
- **ขั้นตอน:**
  1. Settings → `"Manage subscription"` (`settings-manage`) → ต้องเปิดหน้าจัดการสมาชิกของสโตร์ (บน iOS sandbox ถ้าไม่เห็นรายการ sandbox ให้ยกเลิกที่ Settings → App Store/Developer → Sandbox Account → Manage)
  2. ยกเลิกการต่ออายุ → กลับเข้าแอป
  3. รอจนหมดช่วงทดลองแบบเร่ง → กลับเข้าแอป
  4. ทำซ้ำกับบัญชีที่เป็นรายเดือนแล้ว (ต่อจาก P-03) เพื่อตรวจ "ยกเลิกหลังจ่าย"
- **ผลที่ต้องได้:**
  - หลังข้อ 2: ยังใช้ได้ทุกฟีเจอร์ · Membership: `"Free trial"` + `"Trial ends {date}"` (ไม่มี "then renews monthly")
  - หลังข้อ 3: ถูกพาไป `/paywall` หัวข้อ `"Welcome back — pick up where you left off"` · **ไม่มีคำว่าทดลองฟรี** · `/account` → `"Expired"` + `"Ended {date}"` · `/account` ยังสำรองข้อมูลได้ (ไฟล์มีข้อมูลครบ)
  - ข้อ 4: ใช้ได้จนสิ้นรอบบิล · Membership: `"Access until {date}"` · Today: ป้าย `"Access until {date}"`
  - **ข้อมูลไม่หาย:** สมัครใหม่ (รายเดือนแบบไม่มีทดลอง ตาม P-09) → "ชุดข้อมูลตรวจ" กลับมาครบ (B3)

### P-05 ซื้อขาด (B1, J1)

- **เตรียม:** บัญชีสโตร์ใหม่ ทำ P-01 จนถึง Paywall
- **ขั้นตอน:** แตะ `plan-lifetime` → ปุ่มเปลี่ยนเป็น `"Buy lifetime for {price}"` → แตะ → ยืนยันในหน้าซื้อของสโตร์ (ซื้อครั้งเดียว ไม่มีทดลอง)
- **ผลที่ต้องได้:** เข้า Today · Membership: `"Lifetime"` + `"Lifetime access"` · Today ไม่มีป้าย · ไม่มีรายการสมาชิกรายเดือนในบัญชีสโตร์

### P-06 เปลี่ยนจากรายเดือน/ทดลอง เป็นซื้อขาด (J5, D61)

- **เตรียม:** บัญชีสโตร์ที่อยู่ใน `TRIALING` (จาก P-02) และอีกบัญชีที่ `SUBSCRIBED_MONTHLY` (จาก P-03)
- **ขั้นตอน:**
  1. Settings → ส่วน Membership → แถว `"Get lifetime"` (`settings-lifetime`)
  2. ต้องเปิด Paywall โหมดอัปเกรด (ปุ่มปิด ✕, หัวข้อ `"Get Fitnese Pro with one payment"`, เฉพาะแผนซื้อขาด) พร้อมคำเตือนว่า **สมาชิกรายเดือน/ช่วงทดลองจะไม่ถูกยกเลิกให้อัตโนมัติ** + `"Open subscription settings"`
  3. ซื้อขาด → กลับเข้าแอป → ดู Settings → Membership
  4. แตะ `"Manage subscription"` → ยกเลิกรายเดือนในสโตร์ → กลับเข้าแอป
- **ผลที่ต้องได้:**
  - หลังข้อ 3: สถานะ `"Lifetime"` (ซื้อขาดชนะ) · Settings แสดงคำเตือนว่ามีแผนรายเดือนที่ยังต่ออายุอยู่ (`settings-monthly-notice`)
  - หลังข้อ 4: คำเตือนหายไป สถานะยังเป็น `"Lifetime"` · ไม่สูญเสียสิทธิ์ ณ จุดใดในขั้นตอน

### P-07 กู้คืนการซื้อ (Restore Purchases) (B3, B11)

- **ขั้นตอน (ก):** ลบแอปแล้วติดตั้งใหม่บนเครื่องที่บัญชีสโตร์เคยซื้อไว้ (บัญชีจาก P-02/P-05) → ขั้น 1 แตะ `"Already purchased? Restore purchases"` (`onboarding-restore`)
- **ผล (ก):** `"Your purchase was restored."` / `"กู้คืนการซื้อเรียบร้อยแล้ว"` → แอปข้ามขั้นตั้งค่าที่มีข้อมูลในเครื่องแล้ว (ติดตั้งใหม่ = ยังไม่มี จึงไปขั้น 2–3) → เข้าแอปได้โดยไม่ต้องซื้อซ้ำ · **ไม่มีหน้าล็อกอิน**
- **ขั้นตอน (ข):** บัญชีสโตร์ที่ไม่เคยซื้อ → Paywall → `"Restore purchases"` (`paywall-restore`)
- **ผล (ข):** `"No previous purchase was found for your store account."` · ยังอยู่ที่ Paywall
- **ขั้นตอน (ค):** ปิดเน็ตแล้วกด Restore
- **ผล (ค):** `"Couldn’t restore purchases. Please try again."` ไม่ค้าง
- ปุ่ม Restore ใน Settings (`settings-restore`) และ `/account` (`account-restore`) ต้องให้ผลเหมือนกัน

### P-08 เปลี่ยนเครื่อง / ติดตั้งใหม่ (B11, J3, C ตาม SPEC_CHANGES)

- **เตรียม:** เครื่อง A มีสิทธิ์และมี "ชุดข้อมูลตรวจ" · เครื่อง B **แพลตฟอร์มเดียวกัน** ลงชื่อบัญชีสโตร์เดิม (ถ้ามีเครื่องต่างแพลตฟอร์ม ใช้ทดสอบข้อ 4)
- **ขั้นตอน:**
  1. เครื่อง A: Settings → `"Back up data"` (`settings-backup`) → หน้าแชร์ของระบบ → บันทึกลง Files/Google Drive หรือส่งอีเมลถึงตัวเอง → บรรทัดรองเป็น `"Last backup: {วันนี้}"`
  2. เครื่อง B: ติดตั้ง → ขั้น 1 → `"Already purchased? Restore purchases"` → ได้สิทธิ์
  3. เครื่อง B: Settings → `"Restore from file"` (`settings-restore-file`) → เลือกไฟล์จากข้อ 1 → สรุป `"Backup from {date} (app version {version})"` + จำนวนโปรแกรม/เซสชัน/เซ็ต/บันทึกรายวัน/ท่าที่สร้างเอง → `"Replace data"` → `"Your data has been restored."`
  4. (ข้ามแพลตฟอร์ม) เครื่องอีกแพลตฟอร์ม: กู้คืนจากไฟล์เดียวกันได้ (ทำได้ก่อนมีสิทธิ์ ผ่าน Paywall → การตั้งค่า) แต่ "กู้คืนการซื้อ" ต้อง **ไม่พบการซื้อ** (การซื้อผูกกับสโตร์เดิม — SPEC_CHANGES B11)
- **ผลที่ต้องได้:**
  - เครื่อง B: สิทธิ์และวันที่ตรงกับเครื่อง A · ข้อมูลครบตาม "ชุดข้อมูลตรวจ" (โปรแกรม, routine, ตารางสัปดาห์, ประวัติ, น้ำหนักตัว, โปรไฟล์)
  - ภาษา ธีม และสีหลักเป็นค่าของแต่ละเครื่อง (ไม่อยู่ในไฟล์สำรอง)
  - RevenueCat: การซื้อถูกย้าย/alias ไปที่รหัสนิรนามของเครื่อง B (restore behavior = transfer — HUMAN_TASKS ข้อ 17)
  - **ตรวจเครื่อง A ซ้ำ** หลังเครื่อง B กู้คืน: ปิด-เปิดแอปบนเครื่อง A (หรือออกแล้วกลับเข้าแอป) → จดว่ายังมีสิทธิ์หรือถูกพาไป Paywall (คาดว่าถูกล็อก — สิทธิ์ย้ายไปรหัสนิรนามของเครื่อง B, Q26, ข้อกำหนดการใช้งานแจ้งไว้แล้ว) → ถ้าถูกล็อก: `"Restore purchases"` บนเครื่อง A ต้องได้สิทธิ์คืน และข้อมูลบนเครื่อง A ต้องไม่หาย

### P-09 บัญชีที่ไม่มีสิทธิ์ทดลอง เห็น "สมัครรายเดือน" ไม่มีคำว่าทดลอง (B6)

- **เตรียม:** iOS: บัญชี sandbox ที่เคยใช้ทดลองแล้ว (จาก P-03/P-04) — สิทธิ์ทดลองของ Apple ผูกกับ Apple ID · Android: license tester ที่เคยมี `fitnese_monthly` แล้ว (offer ตั้งเป็น "Never had this subscription")
- **ขั้นตอน:** เปิด Paywall
- **ผลที่ต้องได้:**
  - การ์ดรายเดือน **ไม่มี** ป้าย `"7-day free trial"` · ปุ่ม `"Subscribe for {price} / month"` · ข้อความเปิดเผย `"{price} per month. No free trial."` + ข้อความยกเลิกก่อนวันต่ออายุ
  - ไม่มีคำว่า "free"/"ฟรี" ที่ใดบน Paywall · ระหว่างโหลดหรือเมื่อตรวจสิทธิ์ทดลองไม่ได้ (`unknown`) ก็ต้องไม่แสดงทดลองฟรี
  - ซื้อแล้วหน้าซื้อของสโตร์ต้องเรียกเก็บทันที (ไม่มีทดลอง) → สถานะ `SUBSCRIBED_MONTHLY`
- **รีเซ็ตสิทธิ์ทดลองเพื่อทดสอบซ้ำ:** iOS ใช้บัญชี sandbox ใหม่ หรือ Clear Purchase History ของผู้ทดสอบ sandbox (ถ้าคอนโซลมี) · Android ใช้ license tester ใหม่

### P-10 ปัญหาการชำระเงิน: grace period / billing retry / account hold (J5, B8)

- **เตรียม:** บัญชีรายเดือน (หลัง P-03) · ตั้ง grace ตาม HUMAN_TASKS ข้อ 25 (Apple) และข้อ 32 (Google)
- **ขั้นตอน Android:** Play Store → Payments & subscriptions → Subscriptions → แอปนี้ → เปลี่ยนวิธีชำระเป็นบัตรทดสอบที่ปฏิเสธเสมอ → รอรอบต่ออายุถัดไป → กลับเข้าแอป → รอจนพ้น grace → เข้า account hold → เปลี่ยนกลับเป็นบัตรที่อนุมัติ
- **ขั้นตอน iOS (ถ้า sandbox รองรับ):** ปิดการอนุญาตต่ออายุของบัญชี sandbox ตามเอกสาร Apple "Testing failing subscription renewals" → รอรอบต่ออายุ → เปิดกลับ
- **ผลที่ต้องได้:**
  - ระหว่าง grace: ยังใช้ได้ · Today ป้าย `"Payment issue"` โทนเตือน · Membership: `"Payment issue"` + `"Update your payment by {date} to keep access"`
  - หลังพ้น grace / account hold: ถูกล็อก → `/paywall` หัวข้อ `"There’s a problem with your payment"` + ปุ่มหลัก `"Fix payment"` พาไปหน้าจัดการสมาชิกของสโตร์ (D62) · ข้อมูลไม่หาย
  - หลังแก้วิธีชำระ: สิทธิ์กลับมา (`SUBSCRIBED_MONTHLY`) และ "ชุดข้อมูลตรวจ" ครบ

### P-11 คืนเงิน (J5, D64)

- **Android:** Play Console → Order management → ค้นหาคำสั่งซื้อทดสอบ → Refund (เลือกเพิกถอนสิทธิ์ด้วย) หรือ RevenueCat → Customers → ธุรกรรม → Refund — ทำทั้งรายเดือนและซื้อขาด
- **iOS:** sandbox อาจไม่มีทางจำลองคืนเงิน — ตรวจเอกสาร Apple ปัจจุบัน ถ้าไม่มี ให้อาศัยผลของ Android + `__tests__/domain/entitlement.test.ts` และบันทึกว่า "ข้าม (sandbox ไม่รองรับ)"
- **ผลที่ต้องได้:** แอปหลังกลับเข้ามา: ถูกล็อก → Paywall `"Welcome back…"` · ข้อมูลยังอยู่
- **จุดที่ต้องจับตา:** หลังคืนเงิน **ซื้อขาด** แอปต้องล็อก ถ้ายังขึ้น `"Lifetime"` ให้บันทึกว่าไม่ผ่าน (แอปใช้ `nonSubscriptionTransactions` เป็นทางสำรองเฉพาะเมื่อไม่มี entitlement เลย — `deriveSnapshot`)

### P-12 ออฟไลน์: ใช้แคชสิทธิ์ + ผ่อนผัน 48 ชม. (B9, D06, D49–D50)

ใช้บัญชีที่ยกเลิกการต่ออายุแล้ว (วันหมดอายุคงที่) เปลี่ยนนาฬิกาเครื่องได้ที่ iOS: Settings → General → Date & Time / Android: Settings → System → Date & time — **คืนค่าอัตโนมัติทุกครั้งหลังทดสอบ**

| # | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|
| ก | ก่อนวันหมดอายุ เปิดโหมดเครื่องบิน → ปิดแอปทั้งหมด → เปิดใหม่ | เข้าแอปได้ทันทีจากแคชสิทธิ์ |
| ข | (ต่อ) บันทึกเซสชันใหม่ → ปิด/เปิดแอปออฟไลน์ | เซสชันอยู่ใน `/history` (ข้อมูลอยู่ในเครื่องเท่านั้น ไม่มีสถานะซิงก์ให้รอ) |
| ค | ออฟไลน์ แล้วให้เวลาเลยวันหมดอายุไปไม่ถึง 48 ชม. → เปิดแอป | ยังใช้ได้ (ช่วงผ่อนผันออฟไลน์) |
| ง | ออฟไลน์ เลื่อนนาฬิกาให้เลยวันหมดอายุเกิน 48 ชม. → ปิด/เปิดแอป | ถูกล็อก → `/paywall` แสดง `"Plans can’t be loaded from the store right now."` + `"Try again"` · `/account`, สำรองข้อมูล, Privacy, Terms, References ยังเปิดได้ |
| จ | คืนนาฬิกาอัตโนมัติ + เปิดเน็ต → กลับเข้าแอป | สโตร์ยืนยัน `EXPIRED` → Paywall `"Welcome back…"` |
| ฉ | ออนไลน์ หลังวันหมดอายุ (ไม่มีการต่ออายุ) | ล็อกทันที — ไม่มีช่วงผ่อนผันเมื่อออนไลน์ |
| ช | เปิดแอปค้างไว้ที่ Today ข้ามเวลาหมดอายุ (ออนไลน์) | แอปถามสโตร์ใหม่เอง (D50) ระหว่างรอแสดงสถานะโหลด ไม่เด้ง Paywall วูบ |
| ซ | บัญชี `LIFETIME` ออฟไลน์ + เลื่อนนาฬิกาไป 1 ปี | ยังใช้ได้ |
| ฌ | ที่ Paywall โหลดแพ็กเกจขณะออนไลน์ แล้วปิดเน็ต → แตะ `paywall-cta` | `"No internet connection. You were not charged — please try again when you’re online."` ไม่ค้าง |
| ญ | "ลบข้อมูลทั้งหมด" ขณะออฟไลน์ (แคชสิทธิ์ถูกลบด้วย) | ถูกล็อกจนกว่าจะออนไลน์หรือกด Restore (ข้อจำกัดที่ทราบ D81.2) |

### P-13 สำรองข้อมูลและกู้คืนจากไฟล์ (SPEC_CHANGES K, D82)

| # | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|
| ก | Settings → `"Back up data"` → บันทึกลง Files (iOS) / Google Drive (Android) | หน้าแชร์ของระบบเปิด ชื่อไฟล์ `fitnese-backup-YYYY-MM-DD.json` · หลังปิดหน้าแชร์ บรรทัดรองเป็น `"Last backup: {date}"` |
| ข | สำรองแล้วส่งผ่าน LINE / อีเมลถึงตัวเอง แล้วกู้คืนจากไฟล์แนบ (บันทึกลงเครื่องก่อนถ้าแอปเปิดไฟล์ไม่ได้) | กู้คืนสำเร็จ หรือได้ `"We couldn’t open this file. Save it to your phone first, then choose it again."` แล้วทำตามได้ |
| ค | แก้ข้อมูล (ลบเซสชัน 1 รายการ เพิ่มโปรแกรม) → `"Restore from file"` → เลือกไฟล์จากข้อ ก → ยืนยัน `"Replace data"` | ข้อมูลกลับเป็นตอนสำรองทั้งหมด (เซสชันที่ลบกลับมา โปรแกรมที่เพิ่มหายไป) · กลับหน้าแรกเอง |
| ง | กู้คืนแล้วกด `"Cancel"` ที่กล่องยืนยัน | ไม่มีอะไรเปลี่ยน |
| จ | เลือกไฟล์ที่ไม่ใช่ไฟล์สำรอง (รูป, CSV ที่ส่งออก, JSON อื่น) | `"Can’t use this file"` + `"This file isn’t a Fitnese backup…"` ข้อมูลไม่เปลี่ยน |
| ฉ | แก้ไฟล์สำรองด้วยมือให้เสีย (ลบวงเล็บ/เปลี่ยนชนิดค่า) | `"This backup is damaged and can’t be restored."` (หรือข้อความไฟล์ไม่ครบ) ข้อมูลไม่เปลี่ยน |
| ช | ไฟล์จากแอปรุ่นใหม่กว่า (แก้ `formatVersion`/`schemaVersion` ในไฟล์ให้มากกว่า) | `"This backup was made by a newer version of Fitnese. Update the app, then try again."` |
| ซ | เครื่องที่ **ไม่มีสิทธิ์** (บัญชีสโตร์ใหม่): Paywall → `"Settings"` → `"Restore from file"` | ทำได้ ข้อมูลเข้าเครื่อง แล้วยังอยู่ที่ Paywall (ข้อมูลรอจนสมัคร/กู้คืนการซื้อ) |
| ฌ | ไฟล์ขนาดใหญ่ (ข้อมูลหลายปี — สร้างด้วยการบันทึกย้อนหลังจำนวนมาก หรือขอไฟล์ตัวอย่างจากผู้พัฒนา) บนเครื่องรุ่นเก่า | สำรอง/กู้คืนเสร็จโดยไม่ค้าง (บันทึกเวลาที่ใช้) |

### P-14 ลบข้อมูลทั้งหมดในเครื่องนี้ (SPEC_CHANGES B12, D81.2)

- **เตรียม:** เครื่องที่มีสิทธิ์ (รายเดือน) และมี "ชุดข้อมูลตรวจ" + เครื่องที่ไม่มีสิทธิ์
- **ขั้นตอน:**
  1. Settings → `"Delete all data on this device"` (`settings-delete`) → `/delete-data`
  2. ตรวจคำเตือน: ข้อมูลไม่มีที่อื่นนอกจากไฟล์สำรอง · กล่อง `delete-subscription-warning`: `"Deleting your data does not cancel your App Store or Google Play subscription…"` → แตะ `"Open subscription settings"` (`delete-manage`) ต้องเปิดหน้าสมาชิกของสโตร์ → กลับมา
  3. ปุ่ม `"Delete all data"` (`delete-confirm`) ต้องกดไม่ได้จนกว่าจะติ๊ก `"I understand that all my data on this device will be deleted"` (`delete-understood`)
  4. ติ๊ก → กด → กล่องยืนยัน `"Delete all data permanently?"` → ยืนยัน
  5. เครื่องที่ไม่มีสิทธิ์: Paywall → `"Settings"` → `"Delete all data on this device"` (`account-delete-data`) ทำได้เช่นกัน
- **ผลที่ต้องได้:**
  - `"All data on this device has been deleted."` → แอปกลับไปขั้นตั้งค่าเริ่มต้น · โปรแกรม/ประวัติ/โปรไฟล์/บันทึกรายวันหายหมด · `"Not backed up yet"` · ภาษา/ธีม/สีหลักยังเป็นค่าเดิม
  - สมาชิกในสโตร์ยังต่ออายุอยู่จริง (ตรงกับคำเตือน) · ผ่านขั้นตั้งค่าแล้วยังมีสิทธิ์ (แอปตรวจกับสโตร์ใหม่) → ยกเลิกเองเพื่อไม่ให้ sandbox ต่ออายุค้าง
  - กู้คืนจากไฟล์สำรองหลังลบ → ข้อมูลกลับมาครบ

### P-15 อัปเดตแอปจาก build ก่อนหน้า (migration รักษาข้อมูล — D81)

- **ขั้นตอน:** ติดตั้ง build ก่อนหน้า (เช่น build TestFlight/internal รุ่นก่อน) สร้าง "ชุดข้อมูลตรวจ" → ติดตั้ง build ใหม่ทับ (ไม่ลบแอป) → เปิดแอป
- **ผลที่ต้องได้:** เปิดได้ไม่มี error · ข้อมูลครบ · สิทธิ์ยังอยู่ (แคชถูกย้ายเป็นของเครื่อง — migration `0006`) · ถ้า build ก่อนหน้าเป็นรุ่นที่มีล็อกอิน: ข้อมูลของบัญชีที่เคยล็อกอินบนเครื่องยังเห็นครบ (migration `0005`)

### P-16 การชำระเงินที่รออนุมัติ (pending) — Android

- **ขั้นตอน:** license tester ซื้อรายเดือนด้วยบัตรทดสอบแบบช้า (เช่น "Slow test card, approves after a few minutes")
- **ผลที่ต้องได้:** ระหว่างรอ แอปไม่ปลดล็อก และเมื่อสโตร์อนุมัติ แอปปลดล็อกเอง (หรือหลังสลับแอปเข้ามาใหม่)
- **จุดที่ต้องจับตา:** ข้อผิดพลาดประเภทอื่นๆ ของ RevenueCat (รวม payment pending) แสดง `"The purchase didn’t go through. You were not charged."` — ถ้าเห็นข้อความนี้ทั้งที่การชำระยังรออนุมัติและต่อมาถูกเรียกเก็บ ให้บันทึกว่าไม่ผ่านและแจ้งผู้พัฒนา

### P-17 สิ่งที่ผู้รีวิวจะเห็น (N1 ตาม SPEC_CHANGES, HUMAN_TASKS ข้อ 48)

- **ขั้นตอน:** เครื่องที่ติดตั้งใหม่ + บัญชีสโตร์ที่ไม่เคยซื้อ → ทำ P-01 → แตะซื้อ → **หยุดที่หน้าซื้อของสโตร์** · ไล่ทุกเส้นทางใน `store-metadata/review-notes.md` (Restore, Manage subscription, Back up / Restore from file, Delete all data, Privacy/Terms/References)
- **ผล:** ไม่มีหน้าล็อกอินหรือการขอบัญชีใดๆ · ทุกเส้นทางในข้อความ App Review Notes ตรงกับแอปจริง (ถ้าไม่ตรง แก้ข้อความก่อนส่ง)

---

## 3. Accessibility (N5)

### 3.1 VoiceOver (iOS) และ TalkBack (Android)

เปิด: iOS Settings → Accessibility → VoiceOver · Android Settings → Accessibility → TalkBack — ทำครบทั้งสองภาษา (อย่างน้อยภาษาไทย 1 รอบเต็ม) ใช้การปัดไปทีละรายการ ห้ามแตะตรงตำแหน่งบนจอ

| flow | ขั้นตอน | ผลที่ต้องได้ |
|---|---|---|
| ตั้งค่าเริ่มต้น | ขั้น 1–3 จนถึง Paywall | อ่าน `"Step 1 of 3"` / `"ขั้นที่ 1 จาก 3"` · ภาษาและสีหลักอ่านเป็นกลุ่มตัวเลือก (radio) พร้อมชื่อ เช่น `"Pink"`, `"Custom color"` และสถานะ "เลือกอยู่" · ช่องโปรไฟล์มีชื่อช่อง · ปุ่ม Next/Skip มีชื่อ |
| Paywall | ปัดทุกองค์ประกอบ | หัวข้ออ่านเป็น header · การ์ดแผนอ่านเป็น radio รวม ชื่อแผน + ป้ายทดลอง + ราคา + เงื่อนไข ในประโยคเดียว และบอกว่าเลือกอยู่หรือไม่ · อ่านข้อความเปิดเผยครบทุกบรรทัด · ปุ่มเฟืองอ่าน `"Settings"` / `"การตั้งค่า"` |
| Today | ปัดทั้งหน้า | หัวข้อ header · ป้ายสมาชิก · ปุ่ม `+` อ่าน `"Start an empty session"` · ปุ่มเมนูอ่าน `"More options"` / `"ตัวเลือกเพิ่มเติม"` · ปุ่มเริ่มอ่าน `"Start {routine}"` |
| ตารางสัปดาห์ `/week` | ปัดแถวจุดวัน | แต่ละวันอ่าน `"{วัน}: scheduled"` / `"{วัน}: not scheduled"` (ตามภาษา) · สวิตช์อ่าน `"{name} in schedule"` |
| เซสชัน | บันทึกน้ำหนัก/ครั้ง → ติ๊ก → พัก → จบ | ช่องอ่าน `"Set 1, Weight: …"` · ปุ่มติ๊กอ่าน `"Mark set 1 done"` / `"Mark set 1 not done"` · แป้นตัวเลขทุกปุ่มมีชื่อ รวม `"Delete digit"` · ความคืบหน้าอ่าน `"{done} of {total} sets"` · ตัวจับเวลาพักและปุ่ม Skip อ่านได้ |
| สรุปเซสชัน | เลือกความหนัก → ยอมรับ/ข้ามเป้า | ตัวเลือก Light/Moderate/Hard อ่านพร้อมสถานะ · ปุ่ม `"Accept"`/`"Skip"` บอกว่าเป็นของท่าไหน |
| สถิติ | สลับช่วง/มุมมอง/ตัวชี้วัด | ตัวสลับอ่านชื่อกลุ่มและตัวเลือก · กราฟอ่านเป็นข้อความสรุป `"{title}. {items}"` พร้อมเปอร์เซ็นต์ (ไม่ต้องดูภาพ) |
| Settings | สวิตช์/ตัวสลับ | สวิตช์ตัวจับเวลาพักอ่าน `"Rest timer between sets"` พร้อมสถานะเปิด/ปิด |
| ลบข้อมูลทั้งหมด `/delete-data` | ติ๊กยืนยัน | อ่านเป็น checkbox พร้อมสถานะ checked/unchecked |
| สำรอง/กู้คืนจากไฟล์ | แตะแถว → หน้าแชร์/ตัวเลือกไฟล์ → กล่องยืนยัน | แถวอ่านชื่อ + วันที่สำรองล่าสุด · กล่องยืนยันอ่านสรุปและปุ่ม `"Replace data"` ได้ |
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
| 9 | ข้อความ error (N8): ปิดเน็ตแล้วลองซื้อ/กู้คืนการซื้อ, เลือกไฟล์ที่ไม่ใช่ไฟล์สำรอง, ใส่ค่าผิดช่วงในโปรไฟล์ | ข้อความภาษาง่ายทั้งสองภาษา ไม่มีรหัส error ดิบ เช่น `"Please enter a value between {min} and {max}"` / `"กรุณากรอกค่าระหว่าง … ถึง …"` |
| 10 | ชื่อแอปบนหน้าจอหลัก | `Fitnese` ทั้งสองภาษา (`src/i18n/native/*.json`) |

### 4.2 โหมดมืด / สว่าง / ตามระบบ

- Settings → `"Theme"` / `"ธีม"` → `"Dark"`, `"Light"`, `"System"` (`segment-dark`, `segment-light`, `segment-system`)
- **ผลที่ต้องได้:** มืด = พื้นดำ + แสงเรืองสีหลักด้านบน · สว่าง = พื้นเทาอ่อน การ์ดขาว แสงเรืองจางลง · `"System"` เปลี่ยนตามการสลับโหมดของเครื่องทันทีขณะเปิดแอป · ไอคอน status bar อ่านออกทั้งสองโหมด · sheet, แป้นตัวเลข, กราฟ, ปุ่มล็อกอิน, หน้า Paywall/ล็อกอินถูกต้องทั้งสองโหมด · ไม่มีจุดที่ข้อความกลืนกับพื้น

### 4.3 จอเล็ก / จอใหญ่

| อุปกรณ์ | สิ่งที่ตรวจ |
|---|---|
| iPhone จอเล็กสุดที่ iOS เป้าหมายรองรับ (เช่น iPhone SE 4.7 นิ้ว หรือ simulator ขนาดเดียวกัน) | การ์ดแผน 2 ใบบน Paywall วางคู่กันโดยราคาไม่ถูกตัด (รวมตอนขยายตัวอักษร) · แถวเซ็ตในเซสชันพอดีจอ · แถบแท็บไม่บังปุ่มล่างสุด · คีย์บอร์ดไม่บังช่องกรอกใน sheet |
| iPhone จอใหญ่ (6.9 นิ้ว) | ระยะห่างไม่ยืดเกิน · แสงเรืองพอดีด้านบน |
| iPad (แอปตั้ง `supportsTablet: false` จึงรันแบบแอป iPhone บน iPad) | เปิดได้ ซื้อ/กู้คืน/สำรองข้อมูลได้ หน้าตาไม่พัง — ผู้รีวิวของ Apple อาจทดสอบบน iPad |
| Android จอเล็ก (~360×640 dp) และจอใหญ่/พับได้/แท็บเล็ต (emulator) | เหมือนข้อ iPhone · ปุ่ม Back ของระบบและแถบ gesture ไม่บังเนื้อหา |
| ทุกเครื่อง | แอปล็อกแนวตั้ง (`orientation: 'portrait'`) · safe area (รอยบาก, home indicator) ถูกต้อง |

---

## 5. เช็กลิสต์ regression ก่อนทุก release

ทำทุกครั้งก่อน `eas build --profile production` / ก่อนกด Submit ใช้คู่กับ HUMAN_TASKS ข้อ 57 (เช็กลิสต์ส่งรีวิว)

### 5.1 อัตโนมัติและค่าคอนฟิก

- [ ] `npm ci && npm run check` ผ่าน (จดจำนวนชุด/ข้อจากบรรทัดสุดท้าย)
- [ ] `RELEASE=1 npm test` ผ่าน (ไม่มี placeholder ในเอกสารกฎหมาย) และหน้า `/legal/privacy`, `/legal/terms` ไม่แสดงป้าย `"Template — the developer must review…"` / `"เทมเพลต — ผู้พัฒนาต้องตรวจ…"` แล้ว
- [ ] `npm run contrast` ผ่าน
- [ ] `node store-metadata/check-limits.js --release` ผ่าน (ข้อความหน้าร้าน/App Review Notes ไม่เกินขีดจำกัดและไม่มี placeholder)
- [ ] ถ้าแก้ `src/db/schema.ts`: มี migration ใหม่ (`npm run db:generate`), เทสต์อัปเกรดใน `db/migrations` และไฟล์สำรองจาก schema เก่าใน `domain/backup` ผ่าน (HUMAN_TASKS ข้อ 61)
- [ ] `npx expo export` ทั้ง iOS/Android และ `npx expo prebuild --clean --no-install` ผ่าน (แล้วลบ `ios/` `android/`)
- [ ] `npx expo config --type introspect`: `ios.privacyManifests.NSPrivacyTracking = false` และ `NSPrivacyCollectedDataTypes` ระบุเฉพาะ User ID และ Purchase History — linked = true, tracking = false, จุดประสงค์ App Functionality (ตรงกับ `store-metadata/privacy-labels.md` และ HUMAN_TASKS ส่วน P) · Android ไม่มีสิทธิ์ที่ถูก block (`SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`)
- [ ] `eas env:list --environment production`: `EXPO_PUBLIC_USE_MOCKS=0` และคีย์ RevenueCat ครบ (ข้อ 19) · `version` ใน `app.config.ts` เป็นเวอร์ชันที่จะปล่อย · `eas.json` มี `ascAppId` จริง
- [ ] `grep -rn "TODO\|FIXME" src scripts` ว่าง หรือทุกรายการบันทึกใน `docs/PROGRESS.md`

### 5.2 สมาชิกและข้อมูลในเครื่อง (build preview/TestFlight/internal ทั้ง iOS และ Android)

- [ ] P-01: Paywall ราคาจากสโตร์ตรงกับตาราง HUMAN_TASKS ข้อ 37, ป้ายทดลองและข้อความเปิดเผยครบ, ปุ่มซื้อมีราคา
- [ ] P-02: แตะซื้อแล้วเปิดหน้าซื้อของสโตร์ทันที (ไม่มีล็อกอิน) → เริ่มทดลอง → Today + ป้าย
- [ ] P-05 ซื้อขาด และ P-06 อัปเกรดเป็นซื้อขาด (มีคำเตือนให้ยกเลิกรายเดือน)
- [ ] P-07 Restore (ก) จากขั้น 1 และ (ข) บัญชีที่ไม่เคยซื้อ
- [ ] P-08 เครื่องใหม่: กู้คืนการซื้อ + กู้คืนจากไฟล์ → ข้อมูลและสิทธิ์กลับมา
- [ ] P-09 บัญชีไม่มีสิทธิ์ทดลองไม่เห็นคำว่าทดลองฟรี
- [ ] P-12 ข้อ ก–ข (ออฟไลน์) และข้อ ฌ (ซื้อตอนออฟไลน์)
- [ ] P-13 สำรอง → กู้คืนจากไฟล์ (ข้อ ก, ค, จ, ซ) ทั้งสองแพลตฟอร์ม
- [ ] P-14 ลบข้อมูลทั้งหมดในเครื่อง + คำเตือนเรื่องสมาชิกในสโตร์
- [ ] P-15 อัปเดตทับ build ก่อนหน้าแล้วข้อมูลอยู่ครบ
- [ ] ปุ่ม `"Manage subscription"`, `"Restore purchases"`, Privacy, Terms, References, `"Back up data"`, `"Restore from file"`, `"Delete all data on this device"` เปิดได้ทั้งจาก Settings และ `/account`
- [ ] ถ้ารุ่นนี้แก้ส่วนสิทธิ์/Paywall/สำรองข้อมูล: ทำส่วนที่ 2 ครบทุกเคส

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
- [ ] **Settings:** หน่วย kg/lb และ cm/ft-in (ค่าที่แสดงแปลงถูก ข้อมูลเก็บเป็น kg), ตัวจับเวลาพัก, วันเริ่มสัปดาห์, ก้าวน้ำหนัก, ส่งออก CSV ทั้ง 2 ไฟล์, สำรองข้อมูล/กู้คืนจากไฟล์, เวอร์ชันแอปตรงกับที่จะปล่อย, คำเตือนเมื่อมีซื้อขาดแต่รายเดือนยังต่ออายุ
- [ ] **`/references`:** มี Mifflin et al. 1990, ISSN Protein and Exercise (2017), Compendium of Physical Activities (2024) และลิงก์เปิดได้
- [ ] ภาษาไทย + อังกฤษ และโหมดมืด + สว่าง อย่างน้อยหน้าละ 1 รอบ (ข้อ 4.1–4.2)
- [ ] VoiceOver/TalkBack flow Paywall → ซื้อ → เซสชัน (ข้อ 3.1) และขยายตัวอักษรสูงสุดบน Paywall + เซสชัน (ข้อ 3.2)

### 5.4 RevenueCat (ไม่มีเซิร์ฟเวอร์ของเราแล้ว)

- [ ] RevenueCat → แอปแต่ละสโตร์: ได้รับ App Store Server Notifications / RTDN ล่าสุด (HUMAN_TASKS ข้อ 27, 35, 60)
- [ ] Project settings → restore/transfer behavior ยังเป็นแบบ transfer (HUMAN_TASKS ข้อ 17)

### 5.5 หลังปล่อย

- [ ] ติดตั้งเวอร์ชันจากสโตร์จริงบนเครื่องที่มีข้อมูลเวอร์ชันก่อน → อัปเดต → ข้อมูลยังอยู่ครบ (migration ในเครื่องทำงาน) และสถานะสมาชิกไม่เปลี่ยน
- [ ] ดู RevenueCat (การแจ้งเหตุการณ์จากสโตร์ และลูกค้า/ธุรกรรมใหม่) วันแรกหลังปล่อย (ข้อ 60)

---

## 6. แบบฟอร์มบันทึกผล

คัดลอกตารางนี้ไปเป็นบันทึกของแต่ละเวอร์ชัน (เช่น สเปรดชีตหรือ issue ของ release) หนึ่งแถวต่อหนึ่งเคสต่อหนึ่งแพลตฟอร์ม ผลที่ "ไม่ผ่าน" ต้องมีภาพหน้าจอหรือวิดีโอ และขั้นตอนทำซ้ำ

| รหัส | แพลตฟอร์ม / เครื่อง / OS | build (โปรไฟล์ + เลข build) | บัญชีสโตร์ | วันที่ | ผล (ผ่าน / ไม่ผ่าน / ข้าม) | หมายเหตุ (ค่าเวลา sandbox ที่เจอจริง, ลิงก์ภาพ, เหตุผลที่ข้าม) |
|---|---|---|---|---|---|---|
| P-01 | | | | | | |
| … | | | | | | |

สรุปท้ายบันทึก: จำนวนผ่าน/ไม่ผ่าน/ข้าม ต่อแพลตฟอร์ม, ราคาที่ Paywall แสดง (ส่งต่อไปตาราง HUMAN_TASKS ข้อ 37), ปัญหาที่ต้องแก้ก่อนส่งรีวิว
