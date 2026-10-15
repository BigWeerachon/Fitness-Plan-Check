# HUMAN_TASKS — งานที่เจ้าของโปรเจกต์ต้องทำเอง (เรียงตามลำดับ)

> โค้ด เทสต์ และเอกสารของแอปทำเสร็จแล้ว (`npm run check` ผ่าน — ดูจำนวนชุดเทสต์/ข้อที่บรรทัดสุดท้ายของผลลัพธ์ เพราะตัวเลขเปลี่ยนทุกครั้งที่ผู้พัฒนาแก้โค้ด) งานในไฟล์นี้ต้องใช้บัญชี บัตรชำระเงิน การยืนยันตัวตน หรือการตัดสินใจทางธุรกิจของเจ้าของ จึงไม่มีใครทำแทนได้
>
> **แอปออฟไลน์ล้วน (D81, เจ้าของตัดสิน 2026-10-14 — ดู [SPEC_CHANGES.md](SPEC_CHANGES.md)):** ไม่มี Supabase, ไม่มี Google Sign-In / Sign in with Apple, ไม่มี Edge Function หรือ webhook ของเราเอง ข้อมูลผู้ใช้อยู่ในเครื่องเท่านั้น งานฝั่งบริการภายนอกเหลือแค่ **RevenueCat + App Store Connect + Google Play Console + EAS + โฮสต์หน้ากฎหมาย** — ไฟล์นี้ถูกเขียนใหม่และ **เรียงเลขข้อใหม่ทั้งหมด** (เลขข้อเดิมก่อน D81 ใช้ไม่ได้แล้ว)
>
> **วิธีใช้:** ทำตามเลขข้อ (ข้อหลังมักใช้ค่าจากข้อก่อน) ติ๊ก `[x]` เมื่อเสร็จ ทุกข้อบอก **ทำไม** · **ที่ไหน** · **ใส่ค่า** · **ผลลัพธ์ →** และจดค่าลงตาราง "สมุดจดค่า" ด้านล่าง
>
> ชื่อเมนูในคอนโซลของ Apple / Google / RevenueCat เปลี่ยนบ่อย ถ้าหาไม่เจอ ให้ค้นด้วยชื่อที่อยู่ในวงเล็บ ระหว่างที่ยังทำไม่ครบ แอปยังรันได้ในโหมด mock (`EXPO_PUBLIC_USE_MOCKS=1` ใน `.env`) โดยไม่ต้องมีคีย์จริง — เฉพาะ development build และพรีวิวเว็บ; **release build บนมือถือไม่ใช้ mock เด็ดขาด** (`src/services/config.ts`)
>
> **เลขข้อคงที่:** เอกสารอื่น (`docs/TEST_PLAN.md`, `store-metadata/*`, `docs/RELEASE_CHECKLIST.md`) อ้างเลขข้อในไฟล์นี้ ถ้าต้องแทรกข้อใหม่ ให้เพิ่มรายการภายในข้อเดิม หรือแก้เลขอ้างอิงในไฟล์เหล่านั้นด้วย

## สารบัญ

| ส่วน | เรื่อง | ข้อ |
|---|---|---|
| A | ตัดสินใจก่อนเริ่ม: ชื่อแอป, bundle id, ไอคอน | 1–3 |
| B | สมัครบัญชีทั้งหมด | 4–9 |
| C | เตรียมเครื่องและ repo | 10 |
| D | กฎหมาย: ตรวจเนื้อหา ส่งออก และโฮสต์ Privacy / Terms | 11–13 |
| E | Expo / EAS: โปรเจกต์และตัวระบุแอป | 14–15 |
| F | Apple: App ID | 16 |
| G | RevenueCat ตอนที่ 1: โปรเจกต์และแอป | 17 |
| H | `.env` และ EAS environment variables | 18–19 |
| I | Development build | 20 |
| J | App Store Connect: แอป, สินค้า, ทดลองฟรี, grace period | 21–27 |
| K | Google Play Console: แอป, สินค้า, ทดลองฟรี, grace / account hold | 28–35 |
| L | ราคา (SPEC J2) และตาราง "ราคาที่ตั้งได้จริง" | 36–37 |
| M | RevenueCat ตอนที่ 2: credential, entitlement, offering, ทดสอบครบวงจร | 38–41 |
| N | Build และ Submit ด้วย EAS | 42–44 |
| O | ทดสอบบนอุปกรณ์จริง (การซื้อ, สำรอง/กู้คืน, ลบข้อมูล) + ข้อมูลสำหรับผู้รีวิว | 45–48 |
| P | ฟอร์มของสโตร์: App Privacy, Data safety, Health apps, เรตติ้ง, ภาพหน้าจอ | 49–56 |
| Q | ส่งรีวิวและเช็กลิสต์สุดท้าย | 57–58 |
| R | งานประจำหลังเปิดตัว | 59–62 |
| — | สิ่งที่โค้ดทำให้แล้ว ไม่ต้องทำเอง | — |

---

## สมุดจดค่า (กรอกระหว่างทำ)

ในเอกสารนี้จะเรียกค่าที่ได้จากคอนโซลด้วยชื่อในวงเล็บมุม เช่น `<BUNDLE_ID>` ให้แทนด้วยค่าจริงทุกครั้ง

**กติกาความลับ:** ไฟล์ลับทั้งหมดเก็บในโฟลเดอร์ `secrets/` ที่รากโปรเจกต์ (`.gitignore` กันไว้แล้วพร้อม `.env`, `*.p8`, `*.p12`, `*.jks`, `*.key`) ห้าม commit และห้ามใส่ความลับในตัวแปรที่ขึ้นต้นด้วย `EXPO_PUBLIC_` (ค่าพวกนี้ถูกฝังในแอปให้ใครก็อ่านได้) — แอปไม่มี secret ฝั่งเซิร์ฟเวอร์อีกแล้ว คีย์ RevenueCat ที่แอปใช้เป็น public SDK key

| ชื่อในเอกสาร | รูปแบบตัวอย่าง | ได้จากข้อ | ไปใส่ที่ | ค่าจริง |
|---|---|---|---|---|
| `<APP_NAME>` | ชื่อที่เลือกจาก 5 ชื่อ | 1 | App Store Connect, Play Console, `app.config.ts` | |
| `<BUNDLE_ID>` | `com.yourname.fitnese` | 2 | `.env`/EAS `APP_BUNDLE_ID`, Apple App ID, Play package, RevenueCat | |
| `<TEAM_ID>` | 10 ตัวอักษร เช่น `AB12CD34EF` | 4 | `.env`/EAS `APPLE_TEAM_ID` | |
| `<EAS_PROJECT_ID>` | UUID | 14 | EAS environment variable `EAS_PROJECT_ID` (หรือค่าคงที่ใน `app.config.ts`) → `extra.eas.projectId` | |
| `<RC_IOS_KEY>` / `<RC_ANDROID_KEY>` | `appl_...` / `goog_...` | 17 | `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` | |
| `<PRIVACY_URL>` / `<TERMS_URL>` | `https://...` | 13 | `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL`, ฟอร์มสโตร์ | |
| `<ASC_APP_ID>` | ตัวเลข 10 หลัก | 21 | `eas.json` → `submit.production.ios.ascAppId` | |
| Google Cloud project ID | `fitnese-123456` | 7 | service account (ข้อ 34), RTDN (ข้อ 35) | |

---

## ส่วน A — ตัดสินใจก่อนเริ่ม (เปลี่ยนภายหลังยากหรือเปลี่ยนไม่ได้)

- [ ] **1. เลือกชื่อแอปจริง**
  - **ทำไม:** "Fitnese" เป็นชื่อชั่วคราว (SPEC A, D03) ชื่อในสโตร์ต้องไม่ซ้ำกับแอปอื่นใน App Store
  - **ที่ไหน:** ดูชื่อทางเลือก 5 ชื่อใน `store-metadata/app-names.md` (มีวิธีตรวจชื่อซ้ำ/เครื่องหมายการค้าและรายการจุดที่ต้องแก้เมื่อเปลี่ยนชื่อ) แล้วตัดสินใจ จากนั้นจองชื่อทันทีโดยสร้าง app record ใน App Store Connect (ข้อ 21) และ Play Console (ข้อ 28) — ชื่อในสโตร์ยาวได้ไม่เกิน 30 ตัวอักษร
  - **ใส่ค่า:** ถ้าเลือกชื่ออื่นที่ไม่ใช่ "Fitnese" ต้องให้ผู้พัฒนา/เอเจนต์แก้ชื่อในโค้ดแล้วรัน `npm run check` จุดที่มีชื่อแอปหาได้ด้วย `grep -rn "Fitnese" app.config.ts src store-metadata docs/legal` (หลักๆ คือ `name` ใน `app.config.ts`, `src/i18n/native/th.json`, `src/i18n/native/en.json`, `src/legal/content.ts`, `src/i18n/locales/{en,th}/*`) **ห้ามเปลี่ยน** `slug: 'fitnese'` และ `scheme: 'fitnese'` และห้ามเปลี่ยนค่า `format: 'fitnese-backup'` ใน `src/domain/backup.ts` (ไฟล์สำรองที่ผู้ใช้เก็บไว้จะกู้คืนไม่ได้ — D82)
  - **ผลลัพธ์ →** `<APP_NAME>`

- [ ] **2. กำหนด bundle id / package name**
  - **ทำไม:** แอปใช้ค่าเดียวกันเป็นทั้ง iOS `bundleIdentifier` และ Android `package` (อ่านจาก `APP_BUNDLE_ID` ใน `app.config.ts`) ค่าเริ่มต้น `com.example.fitnese` ใช้ส่งสโตร์ไม่ได้ (Google Play ไม่รับ package ที่ขึ้นต้นด้วย `com.example`) และ **เปลี่ยนไม่ได้อีกเลย** หลังสร้างแอปในสโตร์
  - **ใส่ค่า:** รูปแบบ reverse-DNS ที่คุณเป็นเจ้าของ เช่น `com.<ชื่อคุณหรือโดเมน>.fitnese` ใช้เฉพาะตัวพิมพ์เล็ก a–z ตัวเลข และจุด ทุกช่วงขึ้นต้นด้วยตัวอักษร ห้ามมีขีด `-` หรือขีดล่าง `_`
  - **ผลลัพธ์ →** `<BUNDLE_ID>` → `APP_BUNDLE_ID` ใน `.env` และ EAS (ข้อ 15, 18–19)

- [ ] **3. ตรวจไอคอนและ splash**
  - **ทำไม:** ไอคอนใน `assets/` สร้างอัตโนมัติด้วย `scripts/generate-icons.py` (พื้นดำ + แสงเรือง + ดัมเบลสีชมพูม่วงตามภาษาภาพ DS) เจ้าของควรยืนยันว่าพอใจก่อนส่งสโตร์
  - **ที่ไหน:** brief และไฟล์ปัจจุบันอยู่ใน `store-metadata/icon.md` · เปิดดู `assets/icon.png` (1024×1024 ไม่มีพื้นโปร่งใส — App Store บังคับ), `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png`, `assets/splash-icon.png`, `assets/favicon.png`
  - **ใส่ค่า:** ถ้าจะสร้างใหม่: `pip install Pillow` แล้ว `python3 scripts/generate-icons.py assets` ถ้าใช้ไอคอนที่ออกแบบเอง ให้ทับไฟล์ชื่อเดิมด้วยขนาดเดิม แล้วรัน `npm run check`
  - **ผลลัพธ์ →** ไฟล์ใน `assets/` (ไอคอน 512×512 สำหรับหน้าร้าน Google Play ทำในข้อ 55)

---

## ส่วน B — สมัครบัญชี (เริ่มให้เร็ว บางอย่างรออนุมัติหลายวัน)

- [ ] **4. Apple Developer Program**
  - **ทำไม:** จำเป็นสำหรับ build iOS, TestFlight, In-App Purchase
  - **ที่ไหน:** https://developer.apple.com/programs/enroll/ (ค่าสมาชิกรายปี) สมัครแบบบุคคล หรือแบบองค์กร (ต้องมีเลข D-U-N-S) — ชื่อที่ลงทะเบียนจะแสดงเป็นผู้ขายในสโตร์ และควรตรงกับชื่อผู้พัฒนาในนโยบายฯ (`src/legal/content.ts`)
  - **ใส่ค่า:** เมื่ออนุมัติแล้ว ไปที่ developer.apple.com → Account → Membership details → **Team ID**
  - **ผลลัพธ์ →** `<TEAM_ID>` → `APPLE_TEAM_ID` ใน `.env`/EAS (ข้อ 15, 18–19)

- [ ] **5. App Store Connect: สัญญาและบัญชีรับเงิน**
  - **ทำไม:** ถ้าสัญญา Paid Apps ยังไม่ Active สินค้าใน sandbox จะโหลดไม่ขึ้น → Paywall แสดง "Plans can't be loaded from the store right now."
  - **ที่ไหน:** https://appstoreconnect.apple.com → Business (เดิมชื่อ Agreements, Tax, and Banking) → **Paid Apps Agreement** → ยอมรับ แล้วกรอก Bank Account และ Tax Forms ให้ครบจนสถานะเป็น Active
  - **ผลลัพธ์ →** สถานะ Active

- [ ] **6. Google Play Console**
  - **ทำไม:** จำเป็นสำหรับเผยแพร่แอป Android และขายสมาชิก/ซื้อขาด
  - **ที่ไหน:** https://play.google.com/console/signup (ค่าธรรมเนียมครั้งเดียว) ยืนยันตัวตนให้ผ่าน แล้วตั้ง **Payments profile** — ถ้ายังไม่มี payments profile จะสร้างสินค้าที่มีราคาไม่ได้
  - **ข้อควรรู้:** บัญชีนักพัฒนา **ส่วนบุคคล** ที่สร้างใหม่ ต้องผ่านการทดสอบแบบ Closed testing กับผู้ทดสอบจำนวนหนึ่งติดต่อกันระยะหนึ่งก่อนขอสิทธิ์เผยแพร่ Production (ตามนโยบายที่ทราบล่าสุดคือ 12 คน 14 วัน — ตรวจตัวเลขปัจจุบันในหน้า Dashboard) บัญชีองค์กรไม่ติดเงื่อนไขนี้ ให้เผื่อเวลาในแผน
  - **ผลลัพธ์ →** บัญชีพร้อม + payments profile พร้อม

- [ ] **7. Google Cloud project**
  - **ทำไม:** ใช้สร้าง service account ให้ RevenueCat และ EAS Submit (ข้อ 34) และ Pub/Sub สำหรับ Real-time developer notifications (ข้อ 35) — **ไม่ต้องตั้ง OAuth consent screen หรือ OAuth client** (ไม่มี Google Sign-In แล้ว)
  - **ที่ไหน:** https://console.cloud.google.com → เลือกโปรเจกต์ → New Project → ชื่อเช่น `fitnese`
  - **ผลลัพธ์ →** Google Cloud project ID (ใช้ในข้อ 34–35)

- [ ] **8. RevenueCat**
  - **ทำไม:** แอปอ่านสถานะสิทธิ์ (ทดลอง/รายเดือน/ซื้อขาด) จาก RevenueCat เท่านั้น (SPEC B2) โดยใช้ app user id **นิรนาม** ที่ SDK สร้างเอง (D81.2)
  - **ที่ไหน:** https://app.revenuecat.com → Sign up
  - **ผลลัพธ์ →** บัญชีพร้อม

- [ ] **9. Expo (EAS)**
  - **ทำไม:** แอปใช้ development build (ไม่ใช้ Expo Go) และ build/submit ด้วย EAS (`eas.json`)
  - **ที่ไหน:** https://expo.dev/signup
  - **ผลลัพธ์ →** ชื่อผู้ใช้/องค์กร Expo (ใช้ใน `eas login` ข้อ 14)

---

## ส่วน C — เตรียมเครื่องและ repo

- [ ] **10. ติดตั้งเครื่องมือและตรวจว่า repo ผ่าน**
  - **ทำไม:** ยืนยันจุดเริ่มต้นก่อนใส่คีย์จริง ถ้าพังภายหลังจะรู้ว่าเกิดจากการตั้งค่า ไม่ใช่โค้ด
  - **คำสั่ง:**
    ```bash
    node --version            # ควรเป็น Node 22 (eas.json ใช้ 22.22.0 บนเครื่อง build)
    npm ci
    npm run check             # typecheck + lint + jest — ต้องผ่านทั้งหมด
    npm run doctor            # npx expo-doctor ตรวจเวอร์ชันแพ็กเกจของ Expo SDK 57
    cp .env.example .env      # ถ้ายังไม่มี .env (ไฟล์นี้ถูก .gitignore)
    mkdir -p secrets          # โฟลเดอร์เก็บไฟล์ลับ (ถูก .gitignore)
    npm install -g eas-cli    # EAS CLI (eas.json ต้องการ >= 16.0.0)
    ```
  - **ไม่บังคับแต่แนะนำ:** Python 3 + Pillow (ข้อ 3, 55), Xcode + iOS Simulator และ Android Studio + emulator (ข้อ 56)
  - **ผลลัพธ์ →** `.env` พร้อมให้กรอก, โฟลเดอร์ `secrets/`

---

## ส่วน D — กฎหมาย: Privacy Policy และ Terms

- [ ] **11. ตรวจเนื้อหาเอกสารกฎหมาย (ฉบับแอปออฟไลน์)**
  - **ทำไม:** SPEC N4 ให้เจ้าของตรวจและรับผิดชอบสุดท้าย สโตร์ทั้งสองบังคับ URL ของ Privacy Policy — เนื้อหาถูกเขียนใหม่สำหรับแอปออฟไลน์ (D83): ข้อมูลการฝึก/สุขภาพอยู่ในเครื่องเท่านั้น ไม่มีบัญชี การซื้อผ่าน Apple/Google + RevenueCat ด้วยรหัสนิรนาม ไฟล์สำรองผู้ใช้เก็บเอง ลบด้วย "ลบข้อมูลทั้งหมดในเครื่องนี้"/ถอนการติดตั้ง และข้อกำหนดให้ผู้ใช้รับผิดชอบการสำรองข้อมูลเอง
  - **ที่ไหน:** `src/legal/content.ts` (แสดงในแอปที่หน้า `/legal/[doc]`)
  - **ใส่ค่า:** กรอกครบแล้ว: `developer`, `contact`, `address` (ตรวจว่าตรงกับข้อมูลที่ลงทะเบียนกับ Apple/Google และอีเมลใช้รับคำขอเรื่องข้อมูลได้จริง) และวันที่มีผล **15 ตุลาคม 2569 / 15 October 2026** (ค่าคงที่ `EFFECTIVE` — ถ้าวันเผยแพร่จริงช้ากว่านี้ ให้แก้ทั้งสองภาษา) · กฎหมายไทย ศาลที่มีเขตอำนาจในกรุงเทพมหานคร (D78) · อ่านทุกหัวข้อทั้งฉบับไทยและอังกฤษ แนะนำให้ผู้เชี่ยวชาญกฎหมายตรวจทาน (OPEN_QUESTIONS Q18, Q21, Q23)
  - **หลังแก้:** รัน `npm run check` และก่อนส่งสโตร์ให้รัน `RELEASE=1 npm test` (เทสต์ยามใน `__tests__/legal.test.ts` ล้มถ้ายังเหลือ placeholder; ป้าย "Template" ในหน้ากฎหมายซ่อนเองเมื่อไม่มี placeholder)
  - **ผลลัพธ์ →** `src/legal/content.ts` ที่ตรวจแล้ว

- [ ] **12. ส่งออกเป็นหน้าเว็บ**
  - **คำสั่ง:** `npm run legal:export` → เขียนทับ `docs/legal/privacy.th.md`, `docs/legal/privacy.en.md`, `docs/legal/terms.th.md`, `docs/legal/terms.en.md`, `docs/legal/references.md`
  - **ใส่ค่า:** สคริปต์ใส่บรรทัดหมายเหตุ "> เทมเพลต — / > Template —" เฉพาะตอนที่ยังมี placeholder เหลือ ตรวจ `head -3 docs/legal/privacy.en.md` ก่อนเผยแพร่
  - **ผลลัพธ์ →** ไฟล์ Markdown พร้อมโฮสต์

- [ ] **13. โฮสต์หน้า Privacy / Terms และจด URL**
  - **ทำไม:** สโตร์ต้องการ URL สาธารณะ ปุ่ม "Open web version" ในหน้า `/legal/[doc]` ของแอปจะแสดงเมื่อมี URL นี้ (ถ้าว่าง แอปแสดงฉบับในแอปอย่างเดียว)
  - **ที่ไหน:** เว็บโฮสต์แบบ static ใดก็ได้ที่คุณควบคุม (เว็บไซต์ของคุณ, GitHub Pages ฯลฯ) ควรมีทั้งไทยและอังกฤษ — นี่เป็น "เว็บ" อย่างเดียวที่แอปต้องมี (ไม่มี backend)
  - **ใส่ค่า:** หน้า Privacy ต้องมีหัวข้อ "การเก็บรักษาและการลบข้อมูล" (มีอยู่แล้ว) — แอปไม่มีบัญชี จึงไม่ต้องมีหน้า "ขอลบบัญชีบนเว็บ" ของ Google Play
  - **ผลลัพธ์ →** `<PRIVACY_URL>`, `<TERMS_URL>` → `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` (ข้อ 18–19), App Store Connect (ข้อ 21, 49), Play Console (ข้อ 50–51)

---

## ส่วน E — Expo / EAS: โปรเจกต์และตัวระบุแอป

- [ ] **14. ผูกโปรเจกต์กับ EAS**
  - **คำสั่ง:**
    ```bash
    eas login
    eas init        # สร้างโปรเจกต์ @<บัญชี Expo>/fitnese และแสดง project ID
    ```
  - **ใส่ค่า:** `app.config.ts` เป็น config แบบ dynamic ซึ่ง `eas init` แก้ให้อัตโนมัติไม่ได้ ให้ตั้ง **EAS environment variable ชื่อ `EAS_PROJECT_ID`** (หรือวางค่าใน `const EAS_PROJECT_ID = '<EAS_PROJECT_ID>'` ที่ต้นไฟล์ `app.config.ts`) ไฟล์จะเพิ่ม `extra.eas.projectId` ให้เอง (ถ้าใช้บัญชีองค์กรของ Expo ให้เพิ่ม `owner: '<ชื่อองค์กร>'` ด้วย) แล้วรัน `npm run check` และ `eas project:info`
  - **ผลลัพธ์ →** `<EAS_PROJECT_ID>`

- [ ] **15. ตั้ง EAS environment variables ชุดแรก (ตัวระบุแอป)**
  - **ทำไม:** `.env` อยู่ใน `.gitignore` จึง **ไม่ถูกอัปโหลด** ไปเครื่อง build ของ EAS โปรไฟล์ใน `eas.json` ใช้ `"environment": "development" | "preview" | "production"` ค่าที่ `app.config.ts` อ่านตอน build จึงต้องอยู่ใน EAS ด้วย (ตารางเต็มในข้อ 18)
  - **คำสั่ง:**
    ```bash
    for E in development preview production; do
      eas env:create --environment $E --name APP_BUNDLE_ID --value <BUNDLE_ID> --visibility plaintext
      eas env:create --environment $E --name APPLE_TEAM_ID --value <TEAM_ID> --visibility plaintext
    done
    ```
    และใส่ค่าเดียวกันใน `.env` ในเครื่อง ตรวจด้วย `npx expo config --type public | grep -iE "bundleIdentifier|package"` ต้องเห็น `<BUNDLE_ID>` (ไม่ใช่ `com.example.fitnese`)
  - **ข้อควรรู้:** keystore ของ Android ให้ EAS สร้างและเก็บให้ตอน build แรก (ไม่ต้องจด SHA-1 อีกแล้ว เพราะไม่มี Google Sign-In)
  - **ผลลัพธ์ →** EAS env ของทั้ง 3 environment

---

## ส่วน F — Apple: App ID

- [ ] **16. ลงทะเบียน App ID**
  - **ทำไม:** App Store Connect (ข้อ 21) และ provisioning profile ต้องใช้ App ID (EAS สร้างให้อัตโนมัติตอน build แรกได้ — ข้อนี้ทำเองเพื่อสร้างแอปใน App Store Connect ได้ก่อน)
  - **ที่ไหน:** developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App
  - **ใส่ค่า:** Description `<APP_NAME>` · Bundle ID: Explicit = `<BUNDLE_ID>` · Capabilities: **ไม่ต้องเปิด Sign In with Apple** (แอปไม่มีล็อกอิน) — In-App Purchase เปิดให้อยู่แล้ว
  - **ผลลัพธ์ →** App ID `<BUNDLE_ID>`

---

## ส่วน G — RevenueCat ตอนที่ 1: โปรเจกต์และแอป

- [ ] **17. สร้างโปรเจกต์และแอปใน RevenueCat แล้วเอา public SDK keys**
  - **ที่ไหน:** RevenueCat → **+ Create new project** ชื่อ `<APP_NAME>` → Apps & providers → **+ New** → App Store → Bundle ID `<BUNDLE_ID>` · **+ New** → Play Store → Package name `<BUNDLE_ID>` (credential ของสโตร์ใส่ในข้อ 38–39 หลังสร้างสินค้า)
  - **ผลลัพธ์ →** Project settings → **API keys** → public app-specific keys:
    - App Store key (ขึ้นต้น `appl_`) → `<RC_IOS_KEY>` → `EXPO_PUBLIC_RC_IOS_KEY`
    - Play Store key (ขึ้นต้น `goog_`) → `<RC_ANDROID_KEY>` → `EXPO_PUBLIC_RC_ANDROID_KEY`
  - **ไม่ต้องตั้ง:** app user id — แอป `configure` โดยไม่ส่ง appUserID และไม่เรียก `logIn`/`logOut` (D81.2) SDK จึงสร้างรหัสนิรนามเอง
  - **ต้องคงค่าเริ่มต้น:** Project settings → **Restore behavior / Transfer behavior = Transfer to new App User ID** (ค่าเริ่มต้น) — เครื่องใหม่/ติดตั้งใหม่ได้รหัสนิรนามใหม่ การกด "กู้คืนการซื้อ" ต้องย้ายการซื้อของบัญชีสโตร์มาที่รหัสใหม่ได้ ถ้าเปลี่ยนเป็น "Keep with original App User ID" ผู้ใช้จะกู้คืนบนเครื่องใหม่ไม่ได้ (ตรวจชื่อตัวเลือกปัจจุบันในคอนโซล — Q24)
  - **ไม่ต้องตั้ง webhook / Integrations ใดๆ:** ไม่มีเซิร์ฟเวอร์ของเราให้รับ webhook แล้ว (J6 ถูกยกเลิก — SPEC_CHANGES)

---

## ส่วน H — `.env` และ EAS environment variables

- [ ] **18. กรอก `.env` ในเครื่องให้ครบ**
  - **ทำไม:** `src/services/config.ts` อ่านค่าเหล่านี้ (`EXPO_PUBLIC_*` ถูกฝังตอน bundle) และ `app.config.ts` อ่าน `APP_BUNDLE_ID`, `APPLE_TEAM_ID`, `EAS_PROJECT_ID` ตอน build
  - **ตารางตัวแปรทั้งหมดใน `.env.example`:**

    | ตัวแปร | ใช้ที่ | ได้มาจาก | ค่าสำหรับ build จริง | ความลับ? |
    |---|---|---|---|---|
    | `EXPO_PUBLIC_USE_MOCKS` | `src/services/config.ts` → `src/services/registry.ts` | ตั้งเอง | **`0`** (ถ้าเป็น `1` ใน dev build / พรีวิวเว็บ จะใช้สโตร์จำลอง; release build บนมือถือไม่ใช้ mock แม้ตั้ง `1` ผิด) | ไม่ |
    | `EXPO_PUBLIC_MOCK_SCENARIO` | `MockPurchasesService` (เฉพาะโหมด mock) | ตั้งเอง: `new` · `trial_used` · `trialing` · `monthly` · `lifetime` · `expired` · `billing_grace` · `billing_retry` | ไม่มีผลเมื่อ mock ปิด (ปล่อย `new`) | ไม่ |
    | `EXPO_PUBLIC_RC_IOS_KEY` | RevenueCat บน iOS | ข้อ 17 | `appl_...` | ไม่ (public SDK key) |
    | `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat บน Android | ข้อ 17 | `goog_...` | ไม่ (public SDK key) |
    | `EXPO_PUBLIC_PRIVACY_URL` | หน้า `/legal/[doc]` ปุ่ม "Open web version" | ข้อ 13 | `<PRIVACY_URL>` | ไม่ |
    | `EXPO_PUBLIC_TERMS_URL` | หน้า `/legal/[doc]` | ข้อ 13 | `<TERMS_URL>` | ไม่ |
    | `APP_BUNDLE_ID` | `app.config.ts` (iOS bundle id + Android package) | ข้อ 2 | `<BUNDLE_ID>` | ไม่ |
    | `APPLE_TEAM_ID` | `app.config.ts` (`ios.appleTeamId`) | ข้อ 4 | `<TEAM_ID>` | ไม่ |
    | `EAS_PROJECT_ID` | `app.config.ts` (`extra.eas.projectId`) | ข้อ 14 | `<EAS_PROJECT_ID>` | ไม่ |

  - **กฎของโค้ดที่ควรรู้:** ถ้า `EXPO_PUBLIC_USE_MOCKS` ไม่ใช่ `1` แต่ไม่มีคีย์ RevenueCat เลย — dev build และพรีวิวเว็บจะสลับไปใช้ mock เอง ส่วน release build บนมือถือ **ไม่ใช้ mock เด็ดขาด** และจะ error แทน (`decideMocks()` / `missingKeys()` ใน `src/services/config.ts`)
  - **ผลลัพธ์ →** `.env` ในเครื่อง (ห้าม commit)

- [ ] **19. ใส่ค่าชุดเดียวกันใน EAS environment variables**
  - **ทำไม:** เครื่อง build ของ EAS ไม่เห็น `.env` (ข้อ 15) โปรไฟล์ `preview` และ `production` ฝัง JS ไว้ในแอป จึงต้องได้ `EXPO_PUBLIC_*` จาก EAS
  - **คำสั่ง:** ทำทุกตัวในตารางข้อ 18 (ยกเว้น `EXPO_PUBLIC_MOCK_SCENARIO`) ทั้ง 3 environment ตัวอย่าง:
    ```bash
    for E in development preview production; do
      eas env:create --environment $E --name EXPO_PUBLIC_USE_MOCKS --value 0 --visibility plaintext
      eas env:create --environment $E --name EXPO_PUBLIC_RC_IOS_KEY --value <RC_IOS_KEY> --visibility plaintext
      # ...ตัวที่เหลือในตารางข้อ 18 แบบเดียวกัน
    done
    eas env:list --environment production   # ตรวจว่าครบ
    ```
  - **ผลลัพธ์ →** EAS env ครบทั้ง development / preview / production โดย **preview และ production ต้องเป็น `EXPO_PUBLIC_USE_MOCKS=0`**

---

## ส่วน I — Development build

- [ ] **20. สร้าง development build**
  - **ทำไม:** แอปมี native module (RevenueCat, SQLite, expo-sharing, expo-document-picker) จึงต้องใช้ development build (SPEC L, D21) สภาพแวดล้อมที่เขียนโค้ดไม่มี Xcode/Android SDK จึงยังไม่เคย build บนเครื่องจริง
  - **คำสั่ง:**
    ```bash
    eas device:create                                          # ลงทะเบียน iPhone สำหรับ internal distribution
    eas build --profile development --platform ios             # iPhone จริง (เปิด Developer Mode ในเครื่อง iOS 16+)
    eas build --profile development-simulator --platform ios   # iOS Simulator (ไม่ต้องลงทะเบียนเครื่อง)
    eas build --profile development --platform android         # APK สำหรับติดตั้งตรง
    ```
  - **ตรวจเบื้องต้น (ยังไม่ต้องมีสินค้า):** `npm start` (= `expo start --dev-client`) ด้วย `EXPO_PUBLIC_USE_MOCKS=1` → ตั้งค่าเริ่มต้น → Paywall → ซื้อจำลอง → บันทึกการฝึก → ตั้งค่า → ข้อมูลของคุณ → สำรองข้อมูล ต้องเปิดหน้าแชร์ของระบบได้ (Simulator/emulator ใช้ "Save to Files"/Drive ได้) การซื้อจริงทดสอบหลังข้อ 40
  - **ผลลัพธ์ →** ไฟล์ติดตั้ง (ลิงก์จากหน้า build ใน expo.dev)

---

## ส่วน J — App Store Connect

- [ ] **21. สร้างแอปใน App Store Connect**
  - **ที่ไหน:** App Store Connect → Apps → **+** → New App
  - **ใส่ค่า:** Platform iOS · Name `<APP_NAME>` · Primary Language (ไทยหรืออังกฤษ) · Bundle ID `<BUNDLE_ID>` · SKU (เช่น `fitnese-ios`) · User Access: Full Access จากนั้นที่ App Information: Category = Health & Fitness, Privacy Policy URL = `<PRIVACY_URL>`, เพิ่ม Localization ไทย + อังกฤษ
  - **ผลลัพธ์ →** App Information → General Information → **Apple ID** (ตัวเลข) = `<ASC_APP_ID>` → แก้ `eas.json` ที่ `submit.production.ios.ascAppId` จาก `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` เป็นค่านี้

- [ ] **22. สร้าง subscription group และสินค้ารายเดือน `fitnese_monthly`**
  - **ทำไม:** SPEC J1/B1: รายเดือนแบบต่ออายุอัตโนมัติ พร้อมทดลองฟรี 7 วัน — product ID ต้องตรงกับที่ RevenueCat และ mock ใช้ (`fitnese_monthly`)
  - **ที่ไหน:** แอป → Monetization → **Subscriptions** → Subscription Groups **+**
  - **ใส่ค่า:**
    - Group: Reference Name `Fitnese Pro` → Localization (ไทย + อังกฤษ): Subscription Group Display Name เช่น `<APP_NAME> Pro`
    - ในกลุ่ม → Create subscription: Reference Name `Monthly` · Product ID **`fitnese_monthly`** · Subscription Duration **1 Month**
    - Availability: ทุกประเทศ/ภูมิภาค · Subscription Prices: ตามข้อ 36 (base country = Thailand)
    - Localization (ไทย + อังกฤษ): Display Name เช่น "รายเดือน" / "Monthly", Description เช่น "ปลดล็อกทุกฟีเจอร์ ต่ออายุทุกเดือน" / "Unlock everything, renews monthly"
    - Review Information: ภาพหน้าจอ Paywall จากเครื่องจริง/simulator + หมายเหตุสั้นๆ
    - Family Sharing: **ไม่เปิด** (เปิดแล้วปิดไม่ได้)
  - **ผลลัพธ์ →** สถานะ "Ready to Submit" (ถ้าเป็น "Missing Metadata" สินค้าจะไม่โหลดใน sandbox)

- [ ] **23. ตั้งทดลองฟรี 7 วัน (introductory offer)**
  - **ทำไม:** SPEC B1 ใช้ระบบทดลองของสโตร์เอง แอปอ่านจำนวนวันจาก intro offer ราคา 0 (`trialDaysOf` ใน `src/services/purchases/mapping.ts`) และตรวจ eligibility ก่อนแสดงข้อความทดลอง (B6)
  - **ที่ไหน:** `fitnese_monthly` → Subscription Prices → **Create Introductory Offer**
  - **ใส่ค่า:** Countries or Regions = ทั้งหมด · Start Date = วันนี้ · End Date = **No End Date** · Type = **Free** · Duration = **1 Week**
  - **ผลลัพธ์ →** บันทึกในตาราง "ช่วงทดลองที่ตั้งจริง" (ข้อ 37)

- [ ] **24. สร้างสินค้าซื้อขาด `fitnese_lifetime`**
  - **ที่ไหน:** แอป → Monetization → **In-App Purchases** → **+** → Type **Non-Consumable**
  - **ใส่ค่า:** Reference Name `Lifetime` · Product ID **`fitnese_lifetime`** (โค้ดถือว่า product ที่มีคำว่า `lifetime` คือซื้อขาด — `isLifetimeProduct` ใน `src/domain/entitlement/machine.ts`) · Availability ทุกประเทศ · Price ตามข้อ 36 · Localization ไทย/อังกฤษ เช่น "ซื้อขาด — ใช้ได้ตลอดอายุการให้บริการ" / "Lifetime access" (ไม่ใช้คำว่า forever — D77) · Review screenshot · Family Sharing ไม่เปิด — **ไม่มีช่วงทดลอง** (B1)
  - **ผลลัพธ์ →** สถานะ "Ready to Submit"

- [ ] **25. เปิด Billing Grace Period**
  - **ทำไม:** SPEC J5 ต้องรองรับ grace period / billing retry แอปมีสถานะ `BILLING_GRACE` ที่ยังให้ใช้งานต่อพร้อมป้ายเตือนให้อัปเดตการชำระเงิน
  - **ที่ไหน:** Monetization → Subscriptions → **Billing Grace Period** → Set Up / Turn On
  - **ใส่ค่า:** Duration ตามตัวเลือกที่คอนโซลมี (แนะนำ 16 วันสำหรับรายเดือน — เป็นการตัดสินใจทางธุรกิจ) · Eligible Subscribers = All Renewals · Server Environments = Sandbox and Production
  - **ผลลัพธ์ →** บันทึกค่าในตาราง grace (ข้อ 37)

- [ ] **26. สร้างคีย์ให้ RevenueCat และ EAS**
  - **ที่ไหน / ใส่ค่า:**
    - **In-App Purchase Key** (RevenueCat ใช้ตรวจธุรกรรม StoreKit 2 — ตรวจในเอกสาร/คอนโซล RevenueCat ปัจจุบันว่าต้องใช้ key ชนิดนี้หรือใช้ shared secret ด้วย): Users and Access → Integrations → **In-App Purchase** → Generate → ดาวน์โหลด `.p8` เก็บที่ `secrets/` + จด Key ID และ **Issuer ID**
    - **App-Specific Shared Secret** (สำหรับใบเสร็จแบบเก่า): App Information → App-Specific Shared Secret → Manage → Generate
    - **App Store Connect API Key** (ให้ RevenueCat นำเข้าสินค้า และให้ `eas submit` ใช้แทนการล็อกอิน Apple ID): Users and Access → Integrations → **App Store Connect API** → Team Keys → **+** → Access = App Manager → ดาวน์โหลด `.p8` เก็บที่ `secrets/` + Key ID + Issuer ID
  - **ผลลัพธ์ →** ไฟล์และ ID เหล่านี้ใช้ในข้อ 38 (RevenueCat) และข้อ 44 (`eas submit`)

- [ ] **27. ตั้ง App Store Server Notifications ไปที่ RevenueCat**
  - **ทำไม:** ให้ RevenueCat รู้เหตุการณ์ (ยกเลิก, คืนเงิน, ต่ออายุ, ปัญหาการชำระเงิน) ทันที แอปจึงเห็นสถานะใหม่ใน customerInfo เร็วขึ้น (ไม่มี webhook ต่อไปที่เซิร์ฟเวอร์ของเราแล้ว)
  - **ที่ไหน:** RevenueCat → แอป App Store → **Apple Server to Server notification settings** → คัดลอก URL → App Store Connect → App Information → **App Store Server Notifications** → Production Server URL และ Sandbox Server URL = URL นั้น · Version 2
  - **ผลลัพธ์ →** ตั้งค่าทั้งสองฝั่ง (ทำหลังข้อ 38 ก็ได้)

---

## ส่วน K — Google Play Console

- [ ] **28. สร้างแอปใน Play Console**
  - **ที่ไหน:** Play Console → All apps → **Create app**
  - **ใส่ค่า:** App name `<APP_NAME>` · Default language (ไทยหรืออังกฤษ แล้วเพิ่มอีกภาษาใน Store listing) · App or game = **App** · Free or paid = **Free** (เงินมาจาก in-app) · ยอมรับ declarations
  - **ผลลัพธ์ →** แอปในคอนโซล (package name จะผูกถาวรเมื่ออัปโหลด build แรก)

- [ ] **29. Build production ของ Android และอัปโหลดครั้งแรกด้วยมือ**
  - **ทำไม:** Play Console ให้สร้างสินค้า in-app ได้หลังมี build ที่มีสิทธิ์ `BILLING` (RevenueCat ใส่ให้ตอน build — D46) และ Google Play API (ที่ `eas submit` ใช้) อัปโหลดให้แอปใหม่ครั้งแรกไม่ได้ ต้องอัปโหลดเองผ่านเว็บ 1 ครั้ง
  - **คำสั่ง:** `eas build --profile production --platform android` (ได้ไฟล์ `.aab`; ครั้งแรก EAS จะถามให้สร้าง keystore — ให้ EAS สร้างและเก็บ)
  - **ที่ไหน:** Play Console → Test and release → Testing → **Internal testing** → Testers: สร้างรายชื่ออีเมลผู้ทดสอบ → Create new release → อัปโหลด `.aab` → Save → Review → Start rollout to Internal testing (ระบบจะให้ใช้ **Play App Signing** — ยอมรับ)
  - **ผลลัพธ์ →** build แรกใน internal testing

- [ ] **30. สร้าง subscription `fitnese_monthly` + base plan รายเดือน**
  - **ที่ไหน:** Monetize with Play → Products → **Subscriptions** → Create subscription
  - **ใส่ค่า:**
    - Product ID **`fitnese_monthly`** · Name เช่น `<APP_NAME> Pro Monthly` · Benefits/description ไทย + อังกฤษ
    - **Add base plan**: Base plan ID **`monthly`** · Type **Auto-renewing** · Billing period **1 month** · Grace period และ Account hold ตามข้อ 32 · Resubscribe = Allow · ราคา: ตามข้อ 36 → **Activate**
  - **ผลลัพธ์ →** สินค้าใน RevenueCat จะชื่อ `fitnese_monthly:monthly`

- [ ] **31. ตั้ง offer ทดลองฟรี 7 วัน (เฉพาะลูกค้าใหม่)**
  - **ทำไม:** SPEC B1/N2: offer free trial 7 วันบน base plan รายเดือน และต้องตรงกับที่แอปแสดง แอปอ่านจาก `defaultOption.freePhase` (P7D = 7 วัน)
  - **ที่ไหน:** `fitnese_monthly` → Base plans and offers → **Add offer** → เลือก base plan `monthly`
  - **ใส่ค่า:** Offer ID เช่น **`free-trial-7d`** · Eligibility = **New customer acquisition** → **Never had this subscription** · Phases → **Free trial** → Duration **7 days** · Tags: ไม่ต้องใส่ (ห้ามใส่แท็ก `rc-ignore-offer`) → **Activate**
  - **ผลลัพธ์ →** บันทึกในตาราง "ช่วงทดลองที่ตั้งจริง" (ข้อ 37)

- [ ] **32. ตั้ง Grace period และ Account hold**
  - **ทำไม:** SPEC J5 — ระหว่าง grace แอปยังให้ใช้ (`BILLING_GRACE`) เมื่อเข้า account hold สิทธิ์หยุดจนกว่าจะชำระสำเร็จ (ข้อมูลไม่หาย)
  - **ที่ไหน:** ในหน้า base plan `monthly` → ส่วน Grace period / Account hold
  - **ใส่ค่า:** แนะนำ grace period 7 วัน และเปิด account hold ตามค่าเริ่มต้น (เป็นการตัดสินใจทางธุรกิจ)
  - **ผลลัพธ์ →** บันทึกในตาราง grace (ข้อ 37)

- [ ] **33. สร้างสินค้าซื้อขาด `fitnese_lifetime`**
  - **ที่ไหน:** Monetize with Play → Products → **One-time products** → Create
  - **ใส่ค่า:** Product ID **`fitnese_lifetime`** · Name/description ไทย + อังกฤษ · purchase option แบบ **Buy** (ไม่ใช่เช่า) · ราคา ตามข้อ 36 → **Activate** — ไม่มีช่วงทดลอง
  - **ผลลัพธ์ →** สินค้าใน RevenueCat ชื่อ `fitnese_lifetime`

- [ ] **34. Service account สำหรับ RevenueCat และ EAS Submit**
  - **ทำไม:** RevenueCat ต้องอ่านการซื้อ/สมาชิกจาก Google Play API และ `eas submit` ต้องอัปโหลด build (`eas.json` → `serviceAccountKeyPath: ./secrets/google-play-service-account.json`) แนะนำแยก 2 บัญชีเพื่อจำกัดสิทธิ์
  - **ที่ไหน (Google Cloud — โปรเจกต์จากข้อ 7):** APIs & Services → Library → เปิด **Google Play Android Developer API** (และ Google Play Developer Reporting API ตามคู่มือ RevenueCat) → IAM & Admin → Service Accounts → Create → (บัญชีของ RevenueCat ให้ role **Pub/Sub Editor** และ **Monitoring Viewer** ตามคู่มือ RevenueCat) → Keys → Add key → JSON
  - **ที่ไหน (Play Console):** Users and permissions → **Invite new users** → อีเมลของ service account → สิทธิ์:
    - บัญชี RevenueCat: View app information and download bulk reports (read-only) · View financial data, orders, and cancellation survey responses · Manage orders and subscriptions
    - บัญชี EAS Submit: Release apps to testing tracks · Release to production, exclude devices, and use Play App Signing · Manage testing tracks and edit tester lists
  - **ผลลัพธ์ →** JSON ของ RevenueCat → อัปโหลดในข้อ 39 · JSON ของ EAS → วางที่ `secrets/google-play-service-account.json`

- [ ] **35. ตั้ง Real-time developer notifications (RTDN)**
  - **ทำไม:** ให้ RevenueCat รู้เหตุการณ์ของ Google Play ทันที (ต่ออายุ, ยกเลิก, grace, account hold)
  - **ที่ไหน:** RevenueCat → แอป Play Store → **Google developer notifications** → เลือก Google Cloud project → ได้ Topic ID → Play Console → Monetize with Play → **Monetization setup** → Real-time developer notifications → Topic name = ค่านั้น → **Send test notification** → RevenueCat ต้องแสดงว่าได้รับแล้ว
  - **ผลลัพธ์ →** ตั้งค่าทั้งสองฝั่ง (ทำหลังข้อ 39)

---

## ส่วน L — ราคา (SPEC J2)

> **สถานะข้อมูล: ยังไม่ได้ยืนยัน — ต้องตรวจในคอนโซลจริง** — ราคาขั้นต่ำ (price floor) และ price point เงินบาทของ App Store กับ Google Play ในวันนี้ **ไม่มีใครตรวจได้นอกคอนโซลของเจ้าของ** แหล่งข้อมูลเดียวที่พบคือโพสต์ Android Developers Blog เดือนพฤศจิกายน 2015 ที่ระบุว่า Google Play ลดราคาขั้นต่ำในประเทศไทยลงเหลือ **10 บาท** (https://android-developers.googleblog.com/2015/11/minimum-purchase-price-for-apps-and-in.html) ข้อมูลนี้เก่าราว 10 ปี **ห้ามถือเป็นค่าปัจจุบัน** ทุกช่อง "ราคาต่ำสุดที่คอนโซลอนุญาต" ในตารางข้อ 37 คือ **"ต้องตรวจในคอนโซลจริง"** จนกว่าเจ้าของจะกรอก ตัวเลข 19 / 99 บาทเป็นแค่ "เป้า" ตาม SPEC J2
>
> แอปไม่ฮาร์ดโค้ดราคา Paywall แสดง `priceString` ที่ได้จากสโตร์ผ่าน RevenueCat เสมอ (ราคา ฿19.00 / ฿99.00 มีเฉพาะในสโตร์จำลองของโหมด mock — D20)

- [ ] **36. ตั้งราคาตามขั้นตอนตรวจสอบนี้ (ทำทั้ง 4 สินค้า)**
  - **กติกา (SPEC J2):** เป้า = รายเดือน **19 บาท**, ซื้อขาด **99 บาท** (ประเทศไทย)
    1. ถ้าคอนโซลมี/ยอมรับราคา 19 (หรือ 99) พอดี → ใช้ค่านั้น
    2. ถ้าไม่มี → เลือก price point ที่ **ใกล้เป้าที่สุด** ถ้าห่างเท่ากันให้เลือกตัวที่ถูกกว่า
    3. ถ้าราคาต่ำสุดที่สโตร์อนุญาต **สูงกว่า** เป้า → ใช้ราคาต่ำสุดนั้น
    4. App Store กับ Google Play ได้ราคาต่างกันได้ ประเทศอื่นให้สโตร์คำนวณอัตโนมัติจากราคาไทย
  - **App Store** (ทำหลังข้อ 22 และ 24):
    1. `fitnese_monthly` → Subscription Prices → Add Subscription Price (หรือ Edit) → **Country or Region = Thailand (THB)** เป็นฐาน
    2. เปิดรายการราคาเงินบาท จด (ก) ราคาต่ำสุดในรายการ (ข) มี 19.00 หรือไม่ (ค) price point ที่อยู่ติดกับ 19 ทั้งสองข้าง
    3. เลือกตามกติกา → Next → ตรวจหน้าราคาประเทศอื่นที่ Apple ปรับเทียบให้อัตโนมัติ → Confirm
    4. `fitnese_lifetime` → Price Schedule → Add Pricing → Base Country = Thailand → ทำแบบเดียวกันกับเป้า 99
  - **Google Play** (ทำหลังข้อ 30 และ 33):
    1. base plan `monthly` → Set prices → ประเทศไทย → พิมพ์ `19` → ถ้าคอนโซลแจ้งว่าอยู่นอกช่วง ข้อความจะบอกช่วงที่อนุญาต — จดราคาต่ำสุด
    2. ประเทศอื่น: ใช้การแปลงอัตราแลกเปลี่ยนอัตโนมัติของคอนโซล → Save
    3. `fitnese_lifetime` → ราคา → ประเทศไทย `99` → ทำแบบเดียวกัน
  - **ตรวจในแอป:** หลังข้อ 41 เปิด Paywall ด้วยบัญชี sandbox (iOS) และ license tester (Android) แล้วจดราคาที่ Paywall แสดง ต้องตรงกับที่ตั้ง
  - **ห้ามเขียนราคาลงข้อความหน้าร้าน/Paywall เอง** — แอปแสดง `priceString` จากสโตร์ และข้อความใน `store-metadata/` ตั้งใจไม่ระบุราคา

- [ ] **37. กรอกตาราง "ราคาที่ตั้งได้จริง" (รายงานตาม SPEC J2)**

  **ราคาที่ตั้งได้จริง** (ประเทศไทย, THB)

  | สโตร์ | สินค้า (Product ID) | เป้า SPEC J2 | ราคาต่ำสุดที่คอนโซลอนุญาต | มีราคาตรงเป้าไหม (ใช่/ไม่) | ราคาที่ตั้งจริง | ราคาที่ Paywall แสดง (sandbox / tester) | หมายเหตุ (เหตุผลถ้าไม่ตรงเป้า, ภาษี) | วันที่ตรวจ | ผู้ตรวจ |
  |---|---|---|---|---|---|---|---|---|---|
  | App Store | `fitnese_monthly` (รายเดือน) | 19 | ต้องตรวจในคอนโซลจริง | | | | | | |
  | App Store | `fitnese_lifetime` (ซื้อขาด) | 99 | ต้องตรวจในคอนโซลจริง | | | | | | |
  | Google Play | `fitnese_monthly` base plan `monthly` | 19 | ต้องตรวจในคอนโซลจริง | | | | | | |
  | Google Play | `fitnese_lifetime` (ซื้อขาด) | 99 | ต้องตรวจในคอนโซลจริง | | | | | | |

  **ช่วงทดลองที่ตั้งจริง**

  | สโตร์ | ตั้งที่ | ค่าที่ต้องเป็น (SPEC B1) | ค่าที่ตั้งจริง | วันที่ตรวจ |
  |---|---|---|---|---|
  | App Store | Introductory offer ของ `fitnese_monthly` | Free · 1 Week · ทุกประเทศ · No End Date | | |
  | Google Play | Offer `free-trial-7d` บน base plan `monthly` | Free trial 7 days · New customer acquisition (Never had this subscription) | | |

  **Grace period ที่ตั้งจริง**

  | สโตร์ | ค่า | ค่าที่ตั้งจริง | วันที่ตรวจ |
  |---|---|---|---|
  | App Store | Billing Grace Period (ระยะเวลา / Eligible Subscribers) | | |
  | Google Play | Grace period / Account hold ของ base plan `monthly` | | |

---

## ส่วน M — RevenueCat ตอนที่ 2: credential, entitlement, offering

- [ ] **38. ใส่ credential ของ App Store ใน RevenueCat**
  - **ที่ไหน:** RevenueCat → Apps & providers → แอป App Store
  - **ใส่ค่า:** In-app purchase key configuration: อัปโหลด `.p8` + Key ID + Issuer ID (ข้อ 26) · App-Specific Shared Secret (ข้อ 26) · App Store Connect API: อัปโหลด `.p8` + Key ID + Issuer ID — จากนั้นทำข้อ 27
  - **ผลลัพธ์ →** สถานะ credential เป็น Valid

- [ ] **39. ใส่ credential ของ Google Play ใน RevenueCat**
  - **ที่ไหน:** RevenueCat → แอป Play Store → **Service Account credentials JSON** → อัปโหลด JSON ของบัญชี RevenueCat (ข้อ 34) — จากนั้นทำข้อ 35
  - **ข้อควรรู้:** สิทธิ์ของ service account ใหม่อาจใช้เวลาหลายชั่วโมงถึงราว 1–2 วันกว่า Google จะยอมรับ ถ้าขึ้น invalid ให้รอแล้วตรวจใหม่
  - **ผลลัพธ์ →** สถานะ credential เป็น Valid

- [ ] **40. นำเข้าสินค้า สร้าง entitlement `pro` และ offering `default`**
  - **ที่ไหน:** RevenueCat → Product catalog
  - **ใส่ค่า:**
    - **Products** → Import (หรือ + New) ให้ได้ 4 รายการ: App Store `fitnese_monthly`, `fitnese_lifetime` · Play Store `fitnese_monthly:monthly`, `fitnese_lifetime`
    - **Entitlements** → + New → Identifier **`pro`** (ต้องตรงกับ `ENTITLEMENT_ID = 'pro'` ใน `src/domain/entitlement/machine.ts`) → Attach ทั้ง 4 สินค้า (ทดลองและจ่ายเงินได้สิทธิ์เท่ากัน J3)
    - **Offerings** → offering identifier **`default`** → ต้องเป็น **Current** → Packages:
      - **`$rc_monthly`** (Monthly) → App Store `fitnese_monthly` + Play Store `fitnese_monthly:monthly`
      - **`$rc_lifetime`** (Lifetime) → App Store `fitnese_lifetime` + Play Store `fitnese_lifetime`
  - **ทำไม:** แอปอ่าน `offerings.current` แล้วหาแพ็กเกจรายเดือน/ซื้อขาดจากชนิดแพ็กเกจ (`plansFromOffering` ใน `src/services/purchases/mapping.ts`) ถ้าไม่มี offering ปัจจุบัน Paywall จะแสดง "Plans can't be loaded from the store right now."
  - **ผลลัพธ์ →** โครงสร้างสินค้าครบ

- [ ] **41. ตรวจครบวงจรด้วยการซื้อทดสอบ (ทดลอง → "Get lifetime" → กู้คืนบนเครื่องที่สอง)**
  - **ก. ซื้อทดลองครั้งแรก:** development build (ข้อ 20) + `.env` คีย์จริง + `EXPO_PUBLIC_USE_MOCKS=0` → บัญชี sandbox (ข้อ 45) หรือ license tester (ข้อ 46) → เปิดแอป → ตั้งค่าเริ่มต้น → Paywall ต้องแสดงราคาจากสโตร์ (บรรทัดยอดเรียกเก็บ `"7 days free, then {price}/month"` และปุ่มหลัก `"Start free trial, then {price}/month"`; ข้อความจริงอยู่ที่ `src/i18n/locales/en/paywall.ts`) → แตะซื้อ → หน้าต่างของสโตร์เปิด **ทันที** (ไม่มีหน้าล็อกอิน) → ยืนยัน → เข้าหน้าแรก
  - **ตรวจ:** RevenueCat → Customers → ค้นด้วย Transaction ID หรือดู Customers ล่าสุด → ลูกค้าที่มี id แบบ `$RCAnonymousID:…` และ entitlement `pro` active · ในแอป ตั้งค่า → สมาชิก แสดงวันสิ้นสุดทดลอง
  - **ข. เส้นทางอัปเกรด Settings → "Get lifetime" (SPEC J5):** ด้วยเครื่องเดิมที่เป็น `TRIALING` (หรือ `SUBSCRIBED_MONTHLY` / `BILLING_GRACE`) → แท็บตั้งค่า → ส่วนสมาชิก → แถว **"Get lifetime"** (`settings-lifetime`) ต้องเห็นเฉพาะสามสถานะนี้ → แตะแล้วต้องเปิด Paywall โหมดอัปเกรด (ปุ่มปิด ✕, หัวข้อ `"Keep Fitnese Pro forever"`, มีแผนซื้อขาดแผนเดียว, ไม่มีทดลองฟรี) พร้อมกล่องเตือนว่า **ซื้อขาดไม่ยกเลิกสมาชิกรายเดือน/ช่วงทดลองให้อัตโนมัติ** → ซื้อ → สถานะต้องเป็น `Lifetime` → ตั้งค่าต้องมีคำเตือนว่ารายเดือนยังต่ออายุอยู่ — รายละเอียดดู `docs/TEST_PLAN.md` P-06
  - **ค. กู้คืนบนเครื่องที่สอง:** ติดตั้งบนอีกเครื่องที่ใช้บัญชีสโตร์เดียวกัน → ขั้น 1 แตะ "เคยซื้อแล้ว? กู้คืนการซื้อ" (หรือ Paywall → กู้คืนการซื้อ) → ต้องได้สิทธิ์ → ตั้งค่า → ข้อมูลของคุณ → กู้คืนจากไฟล์ ด้วยไฟล์สำรองจากเครื่องแรก → ข้อมูลต้องครบ (TEST_PLAN P-13)
  - **ผลลัพธ์ →** ระบบสมาชิกทำงานครบ แล้วจดราคาที่ Paywall แสดงลงตารางข้อ 37

---

## ส่วน N — Build และ Submit ด้วย EAS

- [ ] **42. Preview build (ทดสอบภายในก่อนส่งสโตร์)**
  - **คำสั่ง:** `eas build --profile preview --platform android` (APK ติดตั้งตรง) และ `eas build --profile preview --platform ios` (internal distribution ไปยังเครื่องที่ลงทะเบียนในข้อ 20)
  - **ตรวจ:** โปรไฟล์ `preview` ใช้ EAS environment `preview` → ต้องเป็น `EXPO_PUBLIC_USE_MOCKS=0` และคีย์จริง (ข้อ 19)
  - **ผลลัพธ์ →** build ที่พฤติกรรมเหมือน release

- [ ] **43. Production build**
  - **คำสั่ง:** `eas build --profile production --platform all` (`autoIncrement` + `appVersionSource: remote` ใน `eas.json` ให้ EAS เพิ่ม build number ให้เอง ส่วน `version: '1.0.0'` ใน `app.config.ts` คือเวอร์ชันที่ผู้ใช้เห็น)
  - **ข้อควรรู้:** แอปไม่มี OTA update (ไม่มี `expo-updates`) ทุกการแก้โค้ดหรือแก้ค่า `EXPO_PUBLIC_*` ต้อง build และส่งใหม่
  - **ผลลัพธ์ →** `.ipa` และ `.aab`

- [ ] **44. Submit**
  - **คำสั่ง:**
    ```bash
    eas submit --platform ios --profile production --latest       # ต้องแก้ ascAppId ใน eas.json แล้ว (ข้อ 21)
    eas submit --platform android --profile production --latest   # ใช้ ./secrets/google-play-service-account.json (ข้อ 34)
    ```
  - **ผลลัพธ์ →** iOS ขึ้น TestFlight · Android ขึ้น track `internal` แบบ `draft` (ตาม `eas.json`) ต้องเข้า Play Console กด rollout เอง และย้ายไป Closed testing / Production เมื่อพร้อม

---

## ส่วน O — ทดสอบบนอุปกรณ์จริง (ทำตาม `docs/TEST_PLAN.md`)

- [ ] **45. Apple sandbox testers + TestFlight**
  - **ที่ไหน:** App Store Connect → Users and Access → **Sandbox** → Test Accounts → **+** (ใช้อีเมลที่ไม่เคยเป็น Apple ID; สร้างหลายบัญชีเพื่อทดสอบ "ลูกค้าใหม่" ซ้ำได้) · บน iPhone: Settings → App Store → Sandbox Account → ลงชื่อบัญชี sandbox · TestFlight: แอป → TestFlight → Internal Testing → เพิ่มผู้ทดสอบ
  - **ทดสอบ:** ทุกสถานะตาม SPEC N3 ใน `docs/TEST_PLAN.md` (เริ่มทดลอง, ทดลองหมดแล้วแปลงเป็นจ่าย, ยกเลิกระหว่างทดลอง, ซื้อขาด, อัปเกรดผ่าน "Get lifetime" (P-06), กู้คืนการซื้อ, เปลี่ยนเครื่อง + กู้คืนจากไฟล์) — sandbox เร่งเวลาต่ออายุให้สั้นลงมาก
  - **ผลลัพธ์ →** ผลทดสอบ iOS บันทึกตาม `docs/TEST_PLAN.md` (กรอก `<APPLE_SANDBOX_EMAIL>` ใน `store-metadata/review-notes.md` ตารางของคุณเอง)

- [ ] **46. Google Play license testers + internal testing**
  - **ที่ไหน:** Play Console → Settings (ระดับบัญชี) → **License testing** → เพิ่มอีเมล Gmail ผู้ทดสอบ · License response = RESPOND_NORMALLY · ผู้ทดสอบต้องอยู่ในรายชื่อ Internal testing (ข้อ 29) กดลิงก์ opt-in แล้วติดตั้งจาก Play Store และใช้บัญชีนั้นเป็นบัญชีหลักของ Play Store ในเครื่อง
  - **ทดสอบ:** ชุดเดียวกับข้อ 45 + grace period / account hold (Play Console มีตัวเลือกบัตรทดสอบที่ถูกปฏิเสธ)
  - **ผลลัพธ์ →** ผลทดสอบ Android บันทึกตาม `docs/TEST_PLAN.md`

- [ ] **47. ทดสอบข้อมูลในเครื่อง: สำรอง/กู้คืน, ลบข้อมูล, ออฟไลน์, อัปเดตแอป**
  - **ทำไม:** ข้อมูลอยู่ในเครื่องเท่านั้น (D81) ถ้าสำรอง/กู้คืนพังบนเครื่องจริง ผู้ใช้เสียข้อมูลถาวร — เทสต์อัตโนมัติใช้ SQLite จริงแต่ไม่ได้ทดสอบหน้าแชร์/ตัวเลือกไฟล์ของระบบ
  - **ตรวจ (ทั้ง iOS และ Android):**
    - ตั้งค่า → ข้อมูลของคุณ → **สำรองข้อมูล** → บันทึกลง Files / Google Drive / ส่ง LINE หรืออีเมลถึงตัวเอง → แถวต้องแสดง "สำรองล่าสุด: <วันที่ของวันนี้>"
    - **กู้คืนจากไฟล์** ด้วยไฟล์นั้น (ทั้งจาก Files/Drive และจากไฟล์แนบอีเมล) → สรุปวันที่/เวอร์ชัน/จำนวน → ยืนยัน → ข้อมูลตรงกับตอนสำรอง · ลองไฟล์ที่ไม่ใช่ไฟล์สำรอง (เช่น CSV หรือรูป) → ต้องขึ้น "ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Fitnese" และข้อมูลไม่เปลี่ยน
    - เครื่องที่ **ไม่มีสิทธิ์** (บัญชีสโตร์ใหม่): Paywall → การตั้งค่า → กู้คืนจากไฟล์ ต้องทำได้ก่อนซื้อ/กู้คืนการซื้อ
    - **ลบข้อมูลทั้งหมดในเครื่องนี้** → ยืนยัน 2 ขั้น → แอปกลับไปขั้นตั้งค่าเริ่มต้น ข้อมูลหายหมด ภาษา/ธีมยังอยู่ → ปุ่มไปหน้าจัดการสมาชิกเปิดหน้าของสโตร์ได้
    - โหมดเครื่องบิน: บันทึกการฝึกได้ปกติ; สิทธิ์ใช้แคช + ผ่อนผัน 48 ชม. (B9)
    - **อัปเดตจาก build ก่อนหน้า** (ติดตั้ง build เก่าที่มีข้อมูล แล้วติดตั้ง build ใหม่ทับ): ข้อมูลยังอยู่ครบ (migration `0004`–`0006` — D81)
  - **ผลลัพธ์ →** ผ่านตาม `docs/TEST_PLAN.md` (P-12, P-13, P-14, P-15)

- [ ] **48. ข้อมูลสำหรับผู้รีวิว (ไม่มีบัญชีทดสอบ)**
  - **ทำไม:** แอปไม่มีล็อกอิน จึง **ไม่ต้องสร้างบัญชี demo** (SPEC_CHANGES N1) ผู้รีวิวของ Apple ซื้อใน sandbox ด้วยบัญชีของตัวเอง ผู้รีวิวของ Google ใช้บัญชีของตัวเอง
  - **ใส่ค่า:** เตรียม `<CONTACT_NAME>`, `<CONTACT_PHONE>`, `<CONTACT_EMAIL>` สำหรับ App Review Information และอ่านข้อความใน `store-metadata/review-notes.md` ให้ตรงกับ build ที่ส่ง · ถ้า Play Console บังคับให้ใส่ข้อมูลเข้าใช้สำหรับเนื้อหาที่ต้องซื้อ ดู OPEN_QUESTIONS Q22
  - **ผลลัพธ์ →** ข้อมูลสำหรับข้อ 53

---

## ส่วน P — ฟอร์มของสโตร์

ข้อมูลที่ออกจากเครื่องมีแค่การซื้อผ่าน RevenueCat (รหัสนิรนาม + ประวัติการซื้อ) — ข้อมูลการฝึก โปรไฟล์ และสุขภาพอยู่ในเครื่องเท่านั้นจึง **ไม่ประกาศ** แอปไม่มี SDK โฆษณา/analytics/crash reporting ไม่ติดตามข้ามแอป

> **คำตอบทีละช่องและถือเป็นหลัก:** `store-metadata/privacy-labels.md` (Apple + Google และจุดที่ต้องตรวจกับคู่มือ RevenueCat) · `store-metadata/play-declarations.md` (Health apps, Target audience, Content rating, Ads, การลบข้อมูล, free trial offer) · `store-metadata/review-notes.md` (App Review Notes / App access)

| ข้อมูล | ตัวอย่างในแอป | Apple App Privacy | Google Data safety | วัตถุประสงค์ |
|---|---|---|---|---|
| ประวัติการซื้อ/สถานะสมาชิก | ผ่าน RevenueCat | Purchases → Purchase History | Financial info → Purchase history | App functionality |
| รหัสนิรนามของ RevenueCat | `$RCAnonymousID:…` | Identifiers → User ID | Device or other IDs | App functionality |

- [ ] **49. App Store Connect → App Privacy (Privacy Nutrition Labels)**
  - **ที่ไหน:** แอป → **App Privacy** → Get Started → Data Collection = Yes → เลือก 2 ประเภทตามตาราง → แต่ละประเภท: App Functionality · Linked to the user = Yes · Used for tracking = No → Publish · Privacy Policy URL = `<PRIVACY_URL>`
  - **ให้ตรงกับ privacy manifest:** `app.config.ts` → `ios.privacyManifests` ตั้ง `NSPrivacyTracking: false` และประกาศ 2 ประเภท (User ID, Purchase History — linked, ไม่ติดตาม, App Functionality) ป้ายในสโตร์ต้องติ๊กชุดเดียวกันพอดี (SPEC N1) · **ก่อนส่งรีวิว** ตรวจด้วย `npx expo config --type introspect` และ Privacy Report ของ archive (Xcode → Generate Privacy Report) เทียบกับ manifest ของ RevenueCat (privacy-labels.md ข้อ 2)
  - **ผลลัพธ์ →** ป้ายความเป็นส่วนตัวเผยแพร่แล้ว

- [ ] **50. Google Play → Data safety**
  - **คำตอบทีละช่อง:** `store-metadata/privacy-labels.md` ข้อ 4 (ต้องตรงกับป้าย Apple ในข้อ 49)
  - **ที่ไหน:** Play Console → Policy and programs → **App content** → Data safety
  - **ใส่ค่า:** Collects data = Yes · Shares data = **No** (RevenueCat เป็นผู้ให้บริการที่ประมวลผลแทนเรา) · Encrypted in transit = Yes · Account creation = **My app does not allow users to create an account** · ขอให้ลบข้อมูลได้ = Yes (ทางอีเมล — ข้อ 62)
  - **ผลลัพธ์ →** Data safety ส่งแล้ว

- [ ] **51. Google Play → Health apps declaration และ App content อื่นๆ**
  - **คำตอบทีละหัวข้อ:** `store-metadata/play-declarations.md`
  - **ที่ไหน:** App content → **Health apps** → Activity and fitness, Nutrition and weight management · ไม่ใช่อุปกรณ์การแพทย์ · ไม่ใช้ Health Connect
  - **ส่วนอื่นใน App content:** Privacy policy = `<PRIVACY_URL>` · Ads = ไม่มีโฆษณา · App access = ตาม `store-metadata/review-notes.md` ข้อ 2 (ไม่มีบัญชี) · Advertising ID = ไม่ใช้ (ถ้าคอนโซลแจ้งว่า manifest มีสิทธิ์ `com.google.android.gms.permission.AD_ID` ให้แจ้งผู้พัฒนา) · Target audience = ไม่เลือกกลุ่มอายุต่ำกว่า 13 ปี · Government apps / Financial features / News = ไม่ใช่
  - **คำอธิบายในหน้าร้าน:** ต้องมีข้อความว่าแอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัย/รักษาโรค (SPEC N2) — ใช้ข้อความจาก `store-metadata/listing.*.md`
  - **ผลลัพธ์ →** App content ทุกหัวข้อเป็นสีเขียว

- [ ] **52. Content rating / Age rating**
  - **คำตอบทีละข้อ:** `store-metadata/play-declarations.md` ข้อ 3
  - **Google Play:** App content → Content rating → Start questionnaire → ตอบตามจริง: ไม่มีความรุนแรง เนื้อหาทางเพศ การพนัน ยาเสพติด ไม่มีการแชร์เนื้อหาระหว่างผู้ใช้ ไม่แชร์ตำแหน่ง มีการซื้อสินค้าดิจิทัล = ใช่
  - **App Store:** App Information → **Age Rating** → Edit → ตอบตามจริงแบบเดียวกัน · Unrestricted web access = No
  - **ผลลัพธ์ →** ได้เรตติ้ง (คาดว่าเป็นเรตสำหรับทุกวัย)

- [ ] **53. App Review Information / App access**
  - **App Store:** หน้าเวอร์ชัน → **App Review Information** → Sign-in required = **No** → Notes = ข้อความจาก `store-metadata/review-notes.md` (ไม่มีบัญชี ข้อมูลอยู่ในเครื่อง วิธีทดสอบการซื้อ/กู้คืนการซื้อ/สำรองและกู้คืนจากไฟล์/ลบข้อมูล) + ช่องทางติดต่อ (ข้อ 48)
  - **Google Play:** App content → **App access** → ตาม `store-metadata/review-notes.md` ข้อ 2 (ไม่มีชื่อผู้ใช้/รหัสผ่าน) · placeholder ทั้งหมดใน `store-metadata/` ต้องแทนด้วยค่าจริงก่อนวาง — รายการรวมอยู่ใน `store-metadata/README.md`
  - **ผลลัพธ์ →** ข้อมูลสำหรับผู้รีวิวครบ

- [ ] **54. ข้อความหน้าร้าน (ไทย + อังกฤษ)**
  - **ที่ไหน:** App Store Connect → หน้าเวอร์ชัน (Promotional Text, Description, Keywords, Support URL, Marketing URL) + App Information (Name, Subtitle) · Play Console → Grow users → Store presence → **Main store listing** + Store settings (Category = Health & Fitness, อีเมลติดต่อ)
  - **ใส่ค่า:** คัดลอกจาก `store-metadata/listing.th.md` และ `store-metadata/listing.en.md` (เฉพาะข้อความในกล่องโค้ด แล้วแทน placeholder ให้ครบ) · Support URL ต้องเป็นหน้าเว็บที่ติดต่อคุณได้
  - **ผลลัพธ์ →** หน้าร้านทั้งสองภาษา

- [ ] **55. ไอคอนหน้าร้าน Google Play และ feature graphic**
  - **คำสั่ง:** `python3 -c "from PIL import Image; Image.open('assets/icon.png').resize((512, 512), Image.LANCZOS).save('play-icon-512.png')"` → อัปโหลดเป็น App icon (512×512) แล้วลบไฟล์ออกจาก repo
  - **ใส่ค่า:** Feature graphic 1024×500 ต้องออกแบบเอง (brief ใน `store-metadata/screenshots.md` ข้อ 5) — App Store ใช้ `assets/icon.png` จาก build อัตโนมัติ
  - **ผลลัพธ์ →** กราฟิกหน้าร้าน Play ครบ

- [ ] **56. ภาพหน้าจอสโตร์**
  - **ทำไม:** ภาพใน `docs/screenshots/` มาจากพรีวิวเว็บ (D43) ใช้เป็นแนวทางเท่านั้น ห้ามส่งสโตร์
  - **ที่ไหน/คำสั่ง:** ใช้ไอเดียภาพ 5 รูปใน `store-metadata/screenshots.md` ถ่ายจาก build จริง:
    - iOS Simulator (build `development-simulator`) ขนาด iPhone 6.9 นิ้ว → `xcrun simctl io booted screenshot shot.png` — แอปตั้ง `supportsTablet: false` จึงไม่ต้องมีภาพ iPad
    - Android emulator/เครื่องจริง → `adb exec-out screencap -p > shot.png`
    - จะใช้โหมด mock เพื่อจัดฉากข้อมูลก็ได้ (`EXPO_PUBLIC_USE_MOCKS=1`, `EXPO_PUBLIC_MOCK_SCENARIO=lifetime`) แต่ภาพ Paywall ต้องถ่ายจากโหมดจริง เพราะราคาในโหมด mock อาจไม่ตรงกับราคาที่ตั้งจริง
  - **ผลลัพธ์ →** ภาพหน้าจอ 2 ภาษาอัปโหลดทั้งสองสโตร์

---

## ส่วน Q — ส่งรีวิวและเช็กลิสต์สุดท้าย

- [ ] **57. ไล่เช็กลิสต์ก่อนส่ง**
  - **ที่ไหน:** `docs/RELEASE_CHECKLIST.md` — ทำครบทุกข้อ และตรวจว่าตารางในข้อ 37 กรอกครบแล้ว
  - **ตรวจซ้ำสั้นๆ:** EAS production env มี `EXPO_PUBLIC_USE_MOCKS=0` · `npm run check` และ `RELEASE=1 npm test` ผ่าน · ทดลองฟรีและราคาบน Paywall ตรงกับที่ตั้งในสโตร์ · เส้นทาง "Get lifetime" และกู้คืนบนเครื่องที่สองผ่าน (ข้อ 41) · สำรอง/กู้คืน/ลบข้อมูลผ่าน (ข้อ 47) · privacy manifest ประกาศ 2 ประเภทตรงกับป้ายสโตร์ (ข้อ 49) · ปุ่ม Restore / จัดการสมาชิก / Privacy / Terms / แหล่งอ้างอิง / สำรอง / กู้คืนจากไฟล์ / ลบข้อมูลทั้งหมด ใช้ได้
  - **ผลลัพธ์ →** พร้อมส่ง

- [ ] **58. ส่งรีวิว**
  - **App Store:** หน้าเวอร์ชัน → Build = build จากข้อ 44 → ส่วน **In-App Purchases and Subscriptions** → เลือก `fitnese_monthly` และ `fitnese_lifetime` (สินค้าชุดแรกต้องส่งพร้อมเวอร์ชันแอป) → Add for Review → Submit
  - **Google Play:** โปรโมต release ไป Closed testing (ถ้าบัญชีต้องผ่านเงื่อนไขข้อ 6) แล้วไป **Production** → Send for review
  - **ผลลัพธ์ →** สถานะ Waiting for Review / In review

---

## ส่วน R — งานประจำหลังเปิดตัว

- [ ] **59. ต่ออายุ Apple Developer Program รายปี** — ถ้าหมด แอปจะถูกถอดจาก App Store
- [ ] **60. เฝ้าดูการซื้อใน RevenueCat** — RevenueCat → แอปแต่ละสโตร์ ต้องเห็นว่าได้รับ App Store Server Notifications / RTDN ล่าสุด (ข้อ 27, 35) ถ้าการแจ้งเหตุการณ์ล้ม สถานะในแอปจะอัปเดตช้าลง (แอปยังตรวจ customerInfo เมื่อเปิดแอปและเมื่อถึงวันหมดอายุ) — ไม่มีเซิร์ฟเวอร์ของเราให้เฝ้า
- [ ] **61. เมื่อผู้พัฒนาแก้โค้ด** — แก้ JS/ค่า `EXPO_PUBLIC_*` → build และ submit ใหม่ (ข้อ 43–44) · ถ้าแก้ schema (`src/db/schema.ts`) ผู้พัฒนาต้องสร้าง migration (`npm run db:generate`) และคงความเข้ากันได้ของไฟล์สำรองตามกฎใน D82 (`introducedIn` สำหรับตารางใหม่) — ทดสอบข้อ 47 ซ้ำก่อนส่ง · ถ้าโค้ดเริ่มส่งข้อมูลใหม่ออกจากเครื่อง ต้องแก้ป้ายสโตร์/manifest/นโยบายฯ พร้อมกัน (privacy-labels.md ข้อ 5)
- [ ] **62. ตอบคำขอเรื่องข้อมูลส่วนบุคคล** — ข้อมูลการฝึก/สุขภาพ: ผู้พัฒนาไม่มี ให้แนะนำผู้ใช้ใช้ "สำรองข้อมูล" (ขอสำเนา) หรือ "ลบข้อมูลทั้งหมดในเครื่องนี้" (ขอลบ) · ข้อมูลการซื้อ: ขอหมายเลขคำสั่งซื้อจากใบเสร็จของสโตร์ (Apple: เริ่มด้วย `M…`, Google: `GPA.…`) → RevenueCat → Customers → ค้นด้วย Transaction/Order ID → ส่งออกข้อมูลหรือ **Delete customer** ตามคำขอ → ตอบภายใน 30 วัน (นโยบายฯ หัวข้อ "สิทธิ์ของคุณ") — ตรวจในคอนโซลว่าค้นด้วย order ID ได้จริง (Q23)

---

## สิ่งที่โค้ดทำให้แล้ว ไม่ต้องทำเอง

- **ซื้อโดยไม่ล็อกอิน (D81.2):** RevenueCat `configure` แบบนิรนาม ไม่เรียก `logIn`/`logOut` · Paywall → เลือกแพ็กเกจ → ซื้อทันที · "กู้คืนการซื้อ" อยู่ที่ขั้น 1 ของตั้งค่าเริ่มต้น, Paywall, ตั้งค่า และหน้าการตั้งค่าที่เปิดจาก Paywall
- **Paywall ตามกฎสโตร์ (B5–B6, J2):** หัวข้อนำด้วยประโยชน์ของแอป ยอดที่เรียกเก็บจริงเด่นเหนือปุ่มซื้อ แสดงราคาจากสโตร์ผ่าน RevenueCat ไม่ฮาร์ดโค้ด เส้นทางอัปเกรดเป็นซื้อขาด ("Get lifetime") พร้อมคำเตือนว่าไม่ยกเลิกรายเดือนให้ ตรวจ eligibility ทดลองฟรีก่อนโฆษณา ข้อความต่ออายุอัตโนมัติ/ยกเลิก/ซื้อขาดไม่มีทดลอง ลิงก์จัดการสมาชิกของทั้งสองสโตร์
- **สถานะสิทธิ์ (B8–B9):** state machine ตัวเดียว (`src/domain/entitlement/machine.ts`), แคชสิทธิ์ในเครื่อง + ผ่อนผัน 48 ชม. ตอนออฟไลน์ (D06), ไม่มีตัวนับทดลองในแอป
- **ข้อมูลในเครื่อง (D81, D82):** SQLite + migration ที่รักษาข้อมูลเดิมตอนอัปเดต, สำรองเป็นไฟล์ JSON ผ่านหน้าแชร์ของระบบ, กู้คืนจากไฟล์ที่ตรวจความถูกต้องและแทนที่ข้อมูลในทรานแซกชันเดียว, ลบข้อมูลทั้งหมดในเครื่อง (ยืนยัน 2 ขั้น + เตือนว่าไม่ยกเลิกสมาชิก), ส่งออก CSV
- **Native config ใน `app.config.ts`:** bundle id/package จาก `APP_BUNDLE_ID`, `ITSAppUsesNonExemptEncryption: false`, privacy manifest แบบไม่ติดตามที่ประกาศเฉพาะข้อมูลการซื้อ, ตัดสิทธิ์ Android ที่ไม่ใช้, ชื่อแอปแยกภาษาไทย/อังกฤษ
- **โหมด mock:** รันและทดสอบได้ครบโดยไม่มีคีย์ (`EXPO_PUBLIC_USE_MOCKS=1` + `EXPO_PUBLIC_MOCK_SCENARIO`) และ release build จะไม่แอบใช้ mock เมื่อคีย์ขาด
- **เนื้อหาและคุณภาพ:** i18n ไทย/อังกฤษครบ, contrast WCAG AA ทุกสีหลัก (`npm run contrast`), ปุ่ม ≥ 48, นโยบายฯ/ข้อกำหนดฉบับออฟไลน์ + หน้าแหล่งอ้างอิง (H6) + `npm run legal:export`, ไอคอน/splash, โปรไฟล์ build ใน `eas.json`
- **เทสต์อัตโนมัติ:** `npm run check` = typecheck + lint + jest ครอบคลุมสูตร, state machine ทุกสถานะ, Paywall, การซื้อ/กู้คืนแบบนิรนาม, การแคชสิทธิ์ออฟไลน์, สำรอง/กู้คืน (รวมไฟล์เสียและ schema เก่า), ลบข้อมูลทั้งหมด, migration
