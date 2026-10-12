# HUMAN_TASKS — งานที่เจ้าของโปรเจกต์ต้องทำเอง (เรียงตามลำดับ)

> โค้ด เทสต์ และเอกสารของแอปทำเสร็จแล้ว (`npm run check` ผ่าน — ดูจำนวนชุดเทสต์/ข้อที่บรรทัดสุดท้ายของผลลัพธ์ เพราะตัวเลขเปลี่ยนทุกครั้งที่ผู้พัฒนาแก้โค้ด จึงไม่ระบุตัวเลขในเอกสารนี้) งานในไฟล์นี้ต้องใช้บัญชี บัตรชำระเงิน การยืนยันตัวตน หรือการตัดสินใจทางธุรกิจของเจ้าของ จึงไม่มีใครทำแทนได้
>
> **วิธีใช้:** ทำตามเลขข้อ (ข้อหลังมักใช้ค่าจากข้อก่อน) ติ๊ก `[x]` เมื่อเสร็จ ทุกข้อบอก **ทำไม** · **ที่ไหน** · **ใส่ค่า** · **ผลลัพธ์ →** (ค่าที่ได้ต้องไปใส่ที่ไหน) และจดค่าลงตาราง "สมุดจดค่า" ด้านล่าง
>
> ชื่อเมนูในคอนโซลของ Apple / Google / Supabase / RevenueCat เปลี่ยนบ่อย ถ้าหาไม่เจอ ให้ค้นด้วยชื่อที่อยู่ในวงเล็บ ระหว่างที่ยังทำไม่ครบ แอปยังรันได้ในโหมด mock (`EXPO_PUBLIC_USE_MOCKS=1` ใน `.env`) โดยไม่ต้องมีคีย์จริง — เฉพาะ development build และพรีวิวเว็บ; **release build บนมือถือไม่ใช้ mock เด็ดขาด** (`src/services/config.ts`)
>
> **เลขข้อคงที่:** เอกสารอื่น (`docs/TEST_PLAN.md`, `store-metadata/*`, `docs/RELEASE_CHECKLIST.md`) อ้างเลขข้อในไฟล์นี้ ผู้พัฒนาจึงเพิ่มรายการใหม่ภายในข้อเดิมแทนการแทรกเลขข้อใหม่ — ถ้าต้องแทรกข้อใหม่จริง ต้องแก้เลขอ้างอิงในไฟล์เหล่านั้นด้วย

## สารบัญ

| ส่วน | เรื่อง | ข้อ |
|---|---|---|
| A | ตัดสินใจก่อนเริ่ม: ชื่อแอป, bundle id, ไอคอน | 1–3 |
| B | สมัครบัญชีทั้งหมด | 4–10 |
| C | เตรียมเครื่องและ repo | 11 |
| D | กฎหมาย: กรอกเทมเพลตและโฮสต์ Privacy / Terms | 12–14 |
| E | Supabase: โปรเจกต์, migrations ทั้งหมด, Edge Functions (`revenuecat-webhook`, `delete-account`), URL | 15–20 |
| F | Expo / EAS: โปรเจกต์และ keystore | 21–23 |
| G | Apple: App ID, Sign in with Apple, คีย์ .p8 | 24–29 |
| H | Google Sign-In (Google Cloud OAuth) | 30–34 |
| I | RevenueCat ตอนที่ 1: โปรเจกต์และแอป | 35 |
| J | ตาราง `.env` ครบทุกตัว + EAS environment variables + secret ฝั่งเซิร์ฟเวอร์ | 36–38 |
| K | Development build และทดสอบล็อกอินจริง | 39–40 |
| L | App Store Connect: แอป, สินค้า, ทดลองฟรี, grace period | 41–47 |
| M | Google Play Console: แอป, สินค้า, ทดลองฟรี, grace / account hold | 48–56 |
| N | ราคา (SPEC J2) และตาราง "ราคาที่ตั้งได้จริง" (ราคาขั้นต่ำเงินบาทต้องตรวจในคอนโซลจริง) | 57–58 |
| O | RevenueCat ตอนที่ 2: สินค้า, entitlement, offering, webhook | 59–64 |
| P | Build และ Submit ด้วย EAS | 65–67 |
| Q | ทดสอบบนอุปกรณ์จริง (รวมเส้นทาง "Get lifetime" และการลบบัญชี) + บัญชีสำหรับผู้รีวิว | 68–71 |
| R | ฟอร์มของสโตร์: App Privacy, Data safety, Health apps, เรตติ้ง, ภาพหน้าจอ | 72–79 |
| S | ส่งรีวิวและเช็กลิสต์สุดท้าย | 80–81 |
| T | งานประจำหลังเปิดตัว | 82–85 |
| — | สิ่งที่โค้ดทำให้แล้ว ไม่ต้องทำเอง | — |

---

## สมุดจดค่า (กรอกระหว่างทำ)

ในเอกสารนี้จะเรียกค่าที่ได้จากคอนโซลด้วยชื่อในวงเล็บมุม เช่น `<BUNDLE_ID>` ให้แทนด้วยค่าจริงทุกครั้ง

**กติกาความลับ:** ไฟล์ลับทั้งหมดเก็บในโฟลเดอร์ `secrets/` ที่รากโปรเจกต์ (`.gitignore` กันไว้แล้วพร้อม `.env`, `*.p8`, `*.p12`, `*.jks`, `*.key`) ห้าม commit และห้ามใส่ความลับในตัวแปรที่ขึ้นต้นด้วย `EXPO_PUBLIC_` (ค่าพวกนี้ถูกฝังในแอปให้ใครก็อ่านได้)

| ชื่อในเอกสาร | รูปแบบตัวอย่าง | ได้จากข้อ | ไปใส่ที่ | ค่าจริง |
|---|---|---|---|---|
| `<APP_NAME>` | ชื่อที่เลือกจาก 5 ชื่อ | 1 | App Store Connect, Play Console, `app.config.ts` | |
| `<BUNDLE_ID>` | `com.yourname.fitnese` | 2 | `.env`/EAS `APP_BUNDLE_ID`, Apple App ID, Play package, Google iOS/Android client, Supabase Apple Client IDs, secret `APPLE_CLIENT_ID`, RevenueCat | |
| `<TEAM_ID>` | 10 ตัวอักษร เช่น `AB12CD34EF` | 4 | `.env`/EAS `APPLE_TEAM_ID`, secret `APPLE_TEAM_ID`, JWT ของ Apple | |
| `<PROJECT_REF>` | 20 ตัวอักษร | 15 | URL ทั้งหมดของ Supabase | |
| `<SUPABASE_URL>` | `https://<PROJECT_REF>.supabase.co` | 15 | `EXPO_PUBLIC_SUPABASE_URL` | |
| `<SUPABASE_ANON_KEY>` | `eyJ...` หรือ `sb_publishable_...` | 15 | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | |
| `<WEBHOOK_SECRET>` | สตริงสุ่ม 64 ตัว (hex) | 18 | secret `REVENUECAT_WEBHOOK_SECRET` + RevenueCat webhook Authorization | |
| `<EAS_PROJECT_ID>` | UUID | 21 | `app.config.ts` → `extra.eas.projectId` | |
| `<ANDROID_SHA1_EAS>` | `AA:BB:...` (20 ไบต์) | 23 | Google Android OAuth client #1 | |
| `<SERVICES_ID>` | `<BUNDLE_ID>.signin` | 25 | Supabase Apple Client IDs, JWT ของ Apple | |
| `<SIWA_KEY_ID>` | 10 ตัวอักษร | 26 | secret `APPLE_KEY_ID`, JWT ของ Apple | |
| ไฟล์ `.p8` ของ Sign in with Apple | `secrets/AuthKey_<SIWA_KEY_ID>.p8` | 26 | secret `APPLE_PRIVATE_KEY`, JWT ของ Apple | (เก็บไฟล์ ไม่จดเนื้อหา) |
| `<APPLE_OAUTH_SECRET>` + วันหมดอายุ | JWT `eyJ...` อายุ ≤ 6 เดือน | 27 | Supabase → Apple → Secret Key (for OAuth) | วันหมดอายุ: |
| `<WEB_CLIENT_ID>` / `<WEB_CLIENT_SECRET>` | `123-abc.apps.googleusercontent.com` / `GOCSPX-...` | 31 | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, Supabase Google | |
| `<IOS_CLIENT_ID>` | `123-def.apps.googleusercontent.com` | 32 | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, Supabase Google | |
| `<IOS_URL_SCHEME>` | `com.googleusercontent.apps.123-def` | 32 | `GOOGLE_IOS_URL_SCHEME` | |
| `<RC_IOS_KEY>` / `<RC_ANDROID_KEY>` | `appl_...` / `goog_...` | 35 | `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` | |
| `<PRIVACY_URL>` / `<TERMS_URL>` | `https://...` | 14 | `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL`, ฟอร์มสโตร์, OAuth consent | |
| `<ASC_APP_ID>` | ตัวเลข 10 หลัก | 41 | `eas.json` → `submit.production.ios.ascAppId` | |
| `<ANDROID_SHA1_PLAY>` | `AA:BB:...` | 50 | Google Android OAuth client #2 | |
| `<RC_SECRET_KEY>` | `sk_...` | 63 | secret `REVENUECAT_SECRET_API_KEY` | |

---

## ส่วน A — ตัดสินใจก่อนเริ่ม (เปลี่ยนภายหลังยากหรือเปลี่ยนไม่ได้)

- [ ] **1. เลือกชื่อแอปจริง**
  - **ทำไม:** "Fitnese" เป็นชื่อชั่วคราว (SPEC A, D03) ชื่อในสโตร์ต้องไม่ซ้ำกับแอปอื่นใน App Store
  - **ที่ไหน:** ดูชื่อทางเลือก 5 ชื่อใน `store-metadata/app-names.md` (มีวิธีตรวจชื่อซ้ำ/เครื่องหมายการค้าและรายการจุดที่ต้องแก้เมื่อเปลี่ยนชื่อ) แล้วตัดสินใจ จากนั้นจองชื่อทันทีโดยสร้าง app record ใน App Store Connect (ข้อ 41) และ Play Console (ข้อ 48) — ชื่อในสโตร์ยาวได้ไม่เกิน 30 ตัวอักษร
  - **ใส่ค่า:** ถ้าเลือกชื่ออื่นที่ไม่ใช่ "Fitnese" ต้องให้ผู้พัฒนา/เอเจนต์แก้ชื่อในโค้ดแล้วรัน `npm run check` จุดที่มีชื่อแอปหาได้ด้วย `grep -rn "Fitnese" app.config.ts src store-metadata docs/legal` (หลักๆ คือ `name` ใน `app.config.ts`, `src/i18n/native/th.json`, `src/i18n/native/en.json`, `src/legal/content.ts`, `src/i18n/locales/{en,th}/{common,settings,legal,paywall}.ts`) **ห้ามเปลี่ยน** `slug: 'fitnese'` และ `scheme: 'fitnese'` (scheme ผูกกับ redirect URL `fitnese://auth-callback` ในข้อ 19)
  - **ผลลัพธ์ →** `<APP_NAME>`

- [ ] **2. กำหนด bundle id / package name**
  - **ทำไม:** แอปใช้ค่าเดียวกันเป็นทั้ง iOS `bundleIdentifier` และ Android `package` (อ่านจาก `APP_BUNDLE_ID` ใน `app.config.ts`) ค่าเริ่มต้น `com.example.fitnese` ใช้ส่งสโตร์ไม่ได้ (Google Play ไม่รับ package ที่ขึ้นต้นด้วย `com.example`) และ **เปลี่ยนไม่ได้อีกเลย** หลังสร้างแอปในสโตร์
  - **ใส่ค่า:** รูปแบบ reverse-DNS ที่คุณเป็นเจ้าของ เช่น `com.<ชื่อคุณหรือโดเมน>.fitnese` ใช้เฉพาะตัวพิมพ์เล็ก a–z ตัวเลข และจุด ทุกช่วงขึ้นต้นด้วยตัวอักษร ห้ามมีขีด `-` หรือขีดล่าง `_` (เป็นชุดอักขระที่ทั้ง iOS และ Android ยอมรับพร้อมกัน)
  - **ผลลัพธ์ →** `<BUNDLE_ID>` → `APP_BUNDLE_ID` ใน `.env` และ EAS (ข้อ 36–37)

- [ ] **3. ตรวจไอคอนและ splash**
  - **ทำไม:** ไอคอนใน `assets/` สร้างอัตโนมัติด้วย `scripts/generate-icons.py` (พื้นดำ + แสงเรือง + ดัมเบลสีชมพูม่วงตามภาษาภาพ DS) เจ้าของควรยืนยันว่าพอใจก่อนส่งสโตร์
  - **ที่ไหน:** brief และไฟล์ปัจจุบันอยู่ใน `store-metadata/icon.md` · เปิดดู `assets/icon.png` (1024×1024 ไม่มีพื้นโปร่งใส — App Store บังคับ), `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png` (1024×1024), `assets/splash-icon.png`, `assets/favicon.png`
  - **ใส่ค่า:** ถ้าจะสร้างใหม่: `pip install Pillow` แล้ว `python3 scripts/generate-icons.py assets` ถ้าใช้ไอคอนที่ออกแบบเอง ให้ทับไฟล์ชื่อเดิมด้วยขนาดเดิม (foreground ของ Android ให้วางรูปไว้กลางภาพในพื้นที่ปลอดภัยราว 2/3) แล้วรัน `npm run check`
  - **ผลลัพธ์ →** ไฟล์ใน `assets/` (ไอคอน 512×512 สำหรับหน้าร้าน Google Play ทำในข้อ 78)

---

## ส่วน B — สมัครบัญชี (เริ่มให้เร็ว บางอย่างรออนุมัติหลายวัน)

- [ ] **4. Apple Developer Program**
  - **ทำไม:** จำเป็นสำหรับ build iOS, TestFlight, Sign in with Apple, In-App Purchase
  - **ที่ไหน:** https://developer.apple.com/programs/enroll/ (ค่าสมาชิกรายปี) สมัครแบบบุคคล หรือแบบองค์กร (ต้องมีเลข D-U-N-S และใช้เวลานานกว่า) — ชื่อที่ลงทะเบียนจะแสดงเป็นผู้ขายในสโตร์
  - **ใส่ค่า:** เมื่ออนุมัติแล้ว ไปที่ developer.apple.com → Account → Membership details → **Team ID**
  - **ผลลัพธ์ →** `<TEAM_ID>` → `APPLE_TEAM_ID` ใน `.env`/EAS (ข้อ 36–37) และ Supabase secret `APPLE_TEAM_ID` (ข้อ 29)

- [ ] **5. App Store Connect: สัญญาและบัญชีรับเงิน**
  - **ทำไม:** ถ้าสัญญา Paid Apps ยังไม่ Active สินค้าใน sandbox จะโหลดไม่ขึ้น → Paywall แสดง "Plans can't be loaded from the store right now."
  - **ที่ไหน:** https://appstoreconnect.apple.com → Business (เดิมชื่อ Agreements, Tax, and Banking) → **Paid Apps Agreement** → ยอมรับ แล้วกรอก Bank Account และ Tax Forms ให้ครบจนสถานะเป็น Active
  - **ผลลัพธ์ →** สถานะ Active (ไม่มีค่าให้จด)

- [ ] **6. Google Play Console**
  - **ทำไม:** จำเป็นสำหรับเผยแพร่แอป Android และขายสมาชิก/ซื้อขาด
  - **ที่ไหน:** https://play.google.com/console/signup (ค่าธรรมเนียมครั้งเดียว) ยืนยันตัวตนให้ผ่าน แล้วตั้ง **Payments profile** (Setup → Payments profile / บัญชีผู้ขาย) — ถ้ายังไม่มี payments profile จะสร้างสินค้าที่มีราคาไม่ได้
  - **ข้อควรรู้:** บัญชีนักพัฒนา **ส่วนบุคคล** ที่สร้างใหม่ ต้องผ่านการทดสอบแบบ Closed testing กับผู้ทดสอบจำนวนหนึ่งติดต่อกันระยะหนึ่ง ก่อนขอสิทธิ์เผยแพร่ Production (ตามนโยบายที่ทราบล่าสุดคือ 12 คน 14 วัน — ตรวจตัวเลขปัจจุบันในหน้า Dashboard ของ Play Console) บัญชีองค์กรไม่ติดเงื่อนไขนี้ ให้เผื่อเวลาในแผน
  - **ผลลัพธ์ →** บัญชีพร้อม + payments profile พร้อม

- [ ] **7. Google Cloud project**
  - **ทำไม:** ใช้สร้าง OAuth client ของ Google Sign-In (ข้อ 30–33), service account ให้ RevenueCat และ EAS Submit (ข้อ 55), และ Pub/Sub สำหรับ Real-time developer notifications (ข้อ 56) — ใช้โปรเจกต์เดียวกันทั้งหมด
  - **ที่ไหน:** https://console.cloud.google.com → เลือกโปรเจกต์ → New Project → ชื่อเช่น `fitnese`
  - **ผลลัพธ์ →** Google Cloud project ID (จดไว้ ใช้ในข้อ 55–56)

- [ ] **8. Supabase**
  - **ทำไม:** Auth (Google/Apple), Postgres + RLS สำหรับซิงก์, Edge Functions (`revenuecat-webhook`, `delete-account`)
  - **ที่ไหน:** https://supabase.com/dashboard → Sign up → สร้าง Organization
  - **ข้อควรรู้:** แผนฟรีของ Supabase จะหยุดโปรเจกต์ที่ไม่มีการใช้งานต่อเนื่องระยะหนึ่ง ถ้าโปรเจกต์ถูกหยุด ผู้ใช้จะล็อกอิน/ซิงก์ไม่ได้ (ข้อมูลในเครื่องยังอยู่) — พิจารณาแผนเสียเงินก่อนเปิดตัวจริง
  - **ผลลัพธ์ →** บัญชีพร้อม

- [ ] **9. RevenueCat**
  - **ทำไม:** แอปอ่านสถานะสิทธิ์ (ทดลอง/รายเดือน/ซื้อขาด) จาก RevenueCat เท่านั้น (SPEC B2) และ RevenueCat ส่ง webhook ไปยัง Supabase (J6)
  - **ที่ไหน:** https://app.revenuecat.com → Sign up
  - **ผลลัพธ์ →** บัญชีพร้อม

- [ ] **10. Expo (EAS)**
  - **ทำไม:** แอปใช้ development build (ไม่ใช้ Expo Go) และ build/submit ด้วย EAS (`eas.json`)
  - **ที่ไหน:** https://expo.dev/signup
  - **ผลลัพธ์ →** ชื่อผู้ใช้/องค์กร Expo (ใช้ใน `eas login` ข้อ 21)

---

## ส่วน C — เตรียมเครื่องและ repo

- [ ] **11. ติดตั้งเครื่องมือและตรวจว่า repo ผ่าน**
  - **ทำไม:** ยืนยันจุดเริ่มต้นก่อนใส่คีย์จริง ถ้าพังภายหลังจะรู้ว่าเกิดจากการตั้งค่า ไม่ใช่โค้ด
  - **คำสั่ง:**
    ```bash
    node --version            # ควรเป็น Node 22 (eas.json ใช้ 22.22.0 บนเครื่อง build)
    npm ci
    npm run check             # typecheck + lint + jest — ต้องผ่านทั้งหมด (ดูบรรทัดสุดท้ายของผลลัพธ์สำหรับจำนวนชุด/ข้อเทสต์)
    npm run doctor            # npx expo-doctor ตรวจเวอร์ชันแพ็กเกจของ Expo SDK 57
    cp .env.example .env      # ถ้ายังไม่มี .env (ไฟล์นี้ถูก .gitignore)
    mkdir -p secrets          # โฟลเดอร์เก็บไฟล์ลับ (ถูก .gitignore)
    npm install -g eas-cli    # EAS CLI (eas.json ต้องการ >= 16.0.0)
    npx supabase --version    # Supabase CLI ผ่าน npx (ไม่ต้องติดตั้งถาวร)
    ```
  - **ไม่บังคับแต่แนะนำ:** PostgreSQL 15 ขึ้นไป (สำหรับ `npm run supabase:verify` ข้อ 16), Deno (สำหรับ `deno check` ข้อ 16), Python 3 + Pillow (ข้อ 3, 78), Xcode + iOS Simulator และ Android Studio + emulator (ข้อ 79)
  - **ผลลัพธ์ →** `.env` พร้อมให้กรอก, โฟลเดอร์ `secrets/`

---

## ส่วน D — กฎหมาย: Privacy Policy และ Terms

- [ ] **12. กรอกข้อมูลจริงในเทมเพลตกฎหมาย**
  - **ทำไม:** SPEC N4 ให้ร่างเป็นเทมเพลต เจ้าของต้องตรวจและรับผิดชอบสุดท้าย สโตร์ทั้งสองบังคับ URL ของ Privacy Policy และ Google OAuth consent screen (ข้อ 30) ก็ต้องใช้
  - **ที่ไหน:** `src/legal/content.ts` → ออบเจ็กต์ `PLACEHOLDERS` (เนื้อหาเดียวกันนี้แสดงในแอปที่หน้า `/legal/[doc]`)
  - **ใส่ค่า:** แทนค่าทั้ง 5 ตัว: `developer` (ชื่อผู้พัฒนา/บริษัท), `contact` (อีเมลติดต่อที่ใช้งานได้จริง — ใช้รับคำขอลบข้อมูลด้วย), `address` (ที่อยู่), `effective` (วันที่มีผล), `law` (ประเทศ/กฎหมายที่ใช้บังคับ) แล้วอ่านทุกหัวข้อทั้งฉบับไทยและอังกฤษให้ตรงกับธุรกิจจริง แนะนำให้ผู้เชี่ยวชาญกฎหมายตรวจทาน (โดยเฉพาะ PDPA ของไทยและ GDPR ถ้าขายในยุโรป)
  - **หลังแก้:** รัน `npm run check` — **ไม่ต้องขอให้ผู้พัฒนาลบป้ายเทมเพลต**: ป้าย "Template — the developer must review…" (คีย์ i18n `legal.templateNotice` ที่หน้า `src/app/legal/[doc].tsx`) ถูกออกแบบให้ซ่อนเองเมื่อ placeholder ทั้ง 5 ตัวถูกแทนที่ครบ และก่อนส่งสโตร์ให้รัน `RELEASE=1 npm test` — เทสต์ยามนี้จะล้มถ้ายังเหลือ placeholder ใน `src/legal/content.ts` (ตรวจ ณ วันที่เขียน: โค้ดชุดนี้เป็นส่วนของการแก้ที่กำลัง merge — ถ้าเปิด `src/app/legal/[doc].tsx` แล้วยังเห็นป้ายแสดงเสมอแบบไม่มีเงื่อนไข หรือ `RELEASE=1 npm test` ไม่มีการตรวจนี้ แปลว่ายังไม่รวม ให้แจ้งผู้พัฒนาก่อนส่งสโตร์)
  - **ผลลัพธ์ →** `src/legal/content.ts` ที่กรอกครบ

- [ ] **13. ส่งออกเป็นหน้าเว็บ**
  - **คำสั่ง:** `npm run legal:export` → เขียนทับ `docs/legal/privacy.th.md`, `docs/legal/privacy.en.md`, `docs/legal/terms.th.md`, `docs/legal/terms.en.md`, `docs/legal/references.md`
  - **ใส่ค่า:** สคริปต์ใส่บรรทัดหมายเหตุ "> เทมเพลต — / > Template —" เฉพาะตอนที่ยังมี placeholder เหลือ เมื่อกรอกครบ (ข้อ 12) ไฟล์ที่ส่งออกจะไม่มีหมายเหตุ พร้อมโฮสต์ทันที ตรวจ `head -3 docs/legal/privacy.en.md` ก่อนเผยแพร่
  - **ผลลัพธ์ →** ไฟล์ Markdown พร้อมโฮสต์

- [ ] **14. โฮสต์หน้า Privacy / Terms และจด URL**
  - **ทำไม:** สโตร์และ Google OAuth ต้องการ URL สาธารณะที่เปิดได้โดยไม่ต้องล็อกอิน ปุ่ม "Open web version" ในหน้า `/legal/[doc]` ของแอปจะแสดงเมื่อมี URL นี้ (ถ้าว่าง แอปแสดงฉบับในแอปอย่างเดียว)
  - **ที่ไหน:** เว็บโฮสต์แบบ static ใดก็ได้ที่คุณควบคุม (เว็บไซต์ของคุณ, GitHub Pages ฯลฯ) ควรมีทั้งไทยและอังกฤษ
  - **ใส่ค่า:** หน้า Privacy ต้องมีหัวข้ออธิบายวิธีลบบัญชีและข้อมูล (มีอยู่แล้วในเทมเพลต: บัญชี → ลบบัญชีและข้อมูล + อีเมลติดต่อ) เพราะ Google Play ต้องการ "ลิงก์ขอลบบัญชีบนเว็บ" ที่ผู้ใช้ทำได้โดยไม่ต้องติดตั้งแอป (ข้อ 73) · ต้องคงประโยคที่บอกว่าผู้ที่ล็อกอินด้วย Apple บน **Android** ต้องถอนสิทธิ์แอปเองที่ appleid.apple.com → Sign in with Apple เพราะการลบบัญชีจากฝั่ง Android เพิกถอนโทเค็น Apple ให้ไม่ได้ (D40, ดูข้อ 29) — มีอยู่ในเทมเพลต `src/legal/content.ts` แล้ว อย่าตัดออกตอนปรับถ้อยคำ
  - **ผลลัพธ์ →** `<PRIVACY_URL>`, `<TERMS_URL>` → `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` (ข้อ 36–37), App Store Connect (ข้อ 41, 72), Play Console (ข้อ 73), Google OAuth consent (ข้อ 30)

---

## ส่วน E — Supabase

- [ ] **15. สร้างโปรเจกต์ Supabase**
  - **ที่ไหน:** Supabase Dashboard → New project
  - **ใส่ค่า:** Name `fitnese`, Database Password (สุ่มยาวๆ แล้วเก็บในตัวจัดการรหัสผ่าน — ใช้ตอน `supabase link`), Region ที่ใกล้ผู้ใช้หลัก (เช่น Southeast Asia (Singapore) ถ้าผู้ใช้ส่วนใหญ่อยู่ไทย)
  - **ผลลัพธ์ →** จาก Project Settings → API (แดชบอร์ดรุ่นใหม่: ปุ่ม **Connect** ด้านบน หรือ Project Settings → Data API / API Keys):
    - Project URL → `<SUPABASE_URL>` → `EXPO_PUBLIC_SUPABASE_URL`
    - anon public key (หรือ Publishable key) → `<SUPABASE_ANON_KEY>` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
    - Project ref (ส่วนหน้าของ URL) → `<PROJECT_REF>`
    - **ห้าม** นำ `service_role` / secret key ไปใส่ใน `.env` หรือแอป (Edge Function ได้ค่า `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` จาก Supabase อัตโนมัติ ไม่ต้องตั้งเอง)

- [ ] **16. ตรวจ SQL และ Edge Functions ในเครื่องก่อน deploy**
  - **ทำไม:** `npm run supabase:verify` (`scripts/verify-supabase.sh`) รัน `supabase/migrations/*.sql` บน Postgres ชั่วคราวพร้อมตัวแทนของ Supabase (`supabase/tests/supabase_stubs.sql`) แล้วรัน `supabase/tests/rls_test.sql` ตรวจ RLS / last-write-wins / การจำกัดซิงก์ / การลบบัญชี (D41) — ไม่ต้องมีบัญชี Supabase
  - **คำสั่ง:**
    ```bash
    npm run supabase:verify
    # macOS (Homebrew) ถ้าสคริปต์หา pg_ctl ไม่เจอ:
    PGBIN=/opt/homebrew/opt/postgresql@16/bin npm run supabase:verify
    # ตรวจชนิดของ Edge Functions (ต้องติดตั้ง Deno):
    deno check supabase/functions/revenuecat-webhook/index.ts supabase/functions/delete-account/index.ts
    ```
  - **ผลลัพธ์ →** ทั้งสองคำสั่งจบโดยไม่มี error

- [ ] **17. สร้างตารางบนคลาวด์ (`supabase db push` — ต้องรัน migration ทุกไฟล์)**
  - **ไฟล์ที่มีใน `supabase/migrations/` ตอนนี้ (รันตามลำดับชื่อ):**
    1. `20261009000000_init.sql` — ตารางทั้งหมด + RLS + ฟังก์ชัน `has_sync_access` + last-write-wins
    2. `20261010000000_session_progression.sql` — เพิ่มคอลัมน์ `progression` (jsonb) ที่ `workout_session` (D53) — **แอปรุ่นปัจจุบันซิงก์คอลัมน์นี้ ถ้าไม่รันไฟล์นี้ การซิงก์เซสชันจะล้ม**
    - ไฟล์ migration ใหม่อาจถูกเพิ่มโดยผู้พัฒนาก่อนส่งสโตร์ (เช่น ลบบันทึก webhook เก่าอัตโนมัติ ตาม `store-metadata/privacy-labels.md`) — `ls supabase/migrations` คือรายการที่เชื่อถือได้ ให้ **push ให้ครบทุกไฟล์ก่อนปล่อยแอป** และรัน `npm run supabase:verify` (ข้อ 16) ทุกครั้งที่มีไฟล์ใหม่
  - **คำสั่ง:**
    ```bash
    npx supabase login
    npx supabase link --project-ref <PROJECT_REF>    # ถามรหัสผ่านฐานข้อมูลจากข้อ 15
    npx supabase db push                              # รันทุกไฟล์ใน supabase/migrations/ ที่ยังไม่เคยรัน
    npx supabase migration list                       # ทุกไฟล์ต้องมีค่าทั้งคอลัมน์ Local และ Remote
    ```
  - **ตรวจ:** Dashboard → Table Editor (schema `public`) ต้องเห็นตาราง `user_entitlements`, `revenuecat_events`, `profile`, `custom_exercise`, `program`, `routine`, `routine_exercise`, `week_plan`, `day_override`, `workout_session`, `session_exercise`, `session_set`, `daily_log` (13 ตาราง) และทุกตารางมีป้าย RLS enabled · `workout_session` ต้องมีคอลัมน์ `progression`
  - **หมายเหตุ:** `supabase/config.toml` ใช้กับ `supabase start` ในเครื่องเท่านั้น อย่าใช้ `supabase config push` กับโปรเจกต์จริง เพราะค่า OAuth ในไฟล์อ้างอิง `env(...)` ที่ยังไม่มี — ตั้งค่า Auth ผ่านแดชบอร์ดตามข้อ 19, 28, 34
  - **ผลลัพธ์ →** ฐานข้อมูลพร้อม (ทุก migration ถูกรันแล้ว)

- [ ] **18. Deploy Edge Functions และตั้ง secret ของ webhook**
  - **ทำไม:** `revenuecat-webhook` อัปเดต `user_entitlements` เมื่อ RevenueCat แจ้งเหตุการณ์ (J6) ส่วน `delete-account` ลบบัญชีและข้อมูลทั้งหมด (B12)
  - **คำสั่ง:**
    ```bash
    openssl rand -hex 32        # → <WEBHOOK_SECRET> จดไว้ ใช้อีกครั้งใน RevenueCat (ข้อ 62)
    npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<WEBHOOK_SECRET>
    # RevenueCat ไม่มี JWT ของ Supabase จึงต้องปิดการตรวจ JWT (config.toml ตั้ง verify_jwt = false ไว้แล้ว ใส่ flag ซ้ำเพื่อความชัวร์)
    npx supabase functions deploy revenuecat-webhook --no-verify-jwt
    # delete-account ต้องตรวจ JWT ของผู้ใช้ (verify_jwt = true)
    npx supabase functions deploy delete-account
    ```
    ถ้าเครื่องไม่มี Docker และ CLI แจ้งว่า bundle ไม่ได้ ให้เติม `--use-api` ท้ายคำสั่ง deploy (Supabase CLI รุ่นใหม่ bundle บนเซิร์ฟเวอร์ได้)
  - **ตรวจในแดชบอร์ด:** Edge Functions → `revenuecat-webhook` → Details → **Enforce JWT verification = ปิด**; `delete-account` = เปิด
  - **ทดสอบเร็ว (smoke test):**
    ```bash
    # ต้องได้ 401 {"error":"unauthorized"} (ถ้าได้ข้อความ "Invalid JWT" แปลว่ายังเปิด JWT verification อยู่)
    curl -i -X POST https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook \
      -H "Authorization: Bearer wrong" -H "Content-Type: application/json" -d '{}'
    # ต้องได้ 200 {"ignored":true} และมีแถว id = manual-smoke-1 ในตาราง revenuecat_events
    curl -i -X POST https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook \
      -H "Authorization: Bearer <WEBHOOK_SECRET>" -H "Content-Type: application/json" \
      -d '{"event":{"id":"manual-smoke-1","type":"TEST"}}'
    ```
    `delete-account` ต้องส่ง JWT ของผู้ใช้จริง (ทดสอบผ่านแอปในข้อ 70 ไม่ใช่ด้วย curl) — ถ้าเรียกโดยไม่มี `Authorization` จะถูกปฏิเสธ (401) ซึ่งถือว่าปกติ
  - **ผลลัพธ์ →** URL webhook `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook` (ใช้ในข้อ 62) — secret ของ Apple/RevenueCat สำหรับ `delete-account` ตั้งในข้อ 29 และ 63 · รายชื่อ secret ทั้งหมดอยู่ที่ข้อ 38

- [ ] **19. ตั้ง URL ของ Auth**
  - **ทำไม:** Sign in with Apple บน Android ใช้ OAuth บนเว็บของ Supabase แล้วเด้งกลับแอปด้วย `Linking.createURL('auth-callback')` = `fitnese://auth-callback` (D11, `src/services/auth/supabaseAuth.ts`)
  - **ที่ไหน:** Authentication → URL Configuration
  - **ใส่ค่า:** Site URL = `fitnese://` · Redirect URLs → Add URL = `fitnese://auth-callback` (ตรงกับ `supabase/config.toml`)
  - **ถ้าทดสอบแล้วเด้ง error เรื่อง redirect:** ดู URL ที่แอปส่งจริงใน Authentication → Logs (หรือ Logs → Auth) แล้วเพิ่ม URL นั้นในรายการ
  - **ผลลัพธ์ →** ตั้งค่าในแดชบอร์ด

- [ ] **20. ปิดการล็อกอินด้วยอีเมล**
  - **ทำไม:** SPEC B10 ให้ล็อกอินด้วย Google และ Apple เท่านั้น การปิด Email provider กันคนสมัครบัญชีด้วยอีเมล/รหัสผ่านผ่าน API ตรงๆ
  - **ที่ไหน:** Authentication → Sign In / Providers → **Email** → ปิด (Enable Email provider = off) — ผู้ใช้ Google/Apple ยังเก็บอีเมลตามปกติ
  - **ผลลัพธ์ →** ตั้งค่าในแดชบอร์ด

---

## ส่วน F — Expo / EAS: โปรเจกต์และ keystore

- [ ] **21. ผูกโปรเจกต์กับ EAS**
  - **คำสั่ง:**
    ```bash
    eas login
    eas init        # สร้างโปรเจกต์ @<บัญชี Expo>/fitnese และแสดง project ID
    ```
  - **ใส่ค่า:** `app.config.ts` เป็น config แบบ dynamic ซึ่ง `eas init` แก้ให้อัตโนมัติไม่ได้ CLI จะบอกให้เพิ่มค่าเอง — ให้เพิ่มในออบเจ็กต์ที่ return:
    ```ts
    extra: { eas: { projectId: '<EAS_PROJECT_ID>' } },
    ```
    (ถ้าใช้บัญชีองค์กรของ Expo ให้เพิ่ม `owner: '<ชื่อองค์กร>'` ด้วย) แล้วรัน `npm run check` และ `eas project:info` ต้องแสดงโปรเจกต์ที่ถูกต้อง
  - **ผลลัพธ์ →** `<EAS_PROJECT_ID>` ใน `app.config.ts`

- [ ] **22. ตั้ง EAS environment variables ชุดแรก (ตัวระบุแอป)**
  - **ทำไม:** `.env` อยู่ใน `.gitignore` จึง **ไม่ถูกอัปโหลด** ไปเครื่อง build ของ EAS โปรไฟล์ใน `eas.json` ใช้ `"environment": "development" | "preview" | "production"` ค่าที่ `app.config.ts` อ่านตอน build (`APP_BUNDLE_ID`, `APPLE_TEAM_ID`, `GOOGLE_IOS_URL_SCHEME`) และ `EXPO_PUBLIC_*` จึงต้องอยู่ใน EAS ด้วย (ตารางเต็มในข้อ 36–37)
  - **คำสั่ง:** (ตอนนี้ตั้งแค่ 2 ตัวที่ต้องใช้กับ credentials ก่อน)
    ```bash
    for E in development preview production; do
      eas env:create --environment $E --name APP_BUNDLE_ID --value <BUNDLE_ID> --visibility plaintext
      eas env:create --environment $E --name APPLE_TEAM_ID --value <TEAM_ID> --visibility plaintext
    done
    ```
    และใส่ค่าเดียวกันใน `.env` ในเครื่อง ตรวจด้วย `npx expo config --type public | grep -iE "bundleIdentifier|package"` ต้องเห็น `<BUNDLE_ID>` (ไม่ใช่ `com.example.fitnese`)
  - **ผลลัพธ์ →** EAS env ของทั้ง 3 environment

- [ ] **23. สร้าง keystore ของ Android และอ่าน SHA-1**
  - **ทำไม:** Google Sign-In บน Android ตรวจลายเซ็นของแอป ต้องลงทะเบียน SHA-1 ของ keystore ที่ EAS ใช้เซ็น (ข้อ 33)
  - **คำสั่ง:** `eas credentials -p android` → เลือก build profile `production` → Keystore → **Set up a new keystore** (ให้ EAS สร้างและเก็บ) → เมนูเดียวกันแสดง **SHA1 Fingerprint** — ตรวจโปรไฟล์ `development` และ `preview` ด้วยว่าใช้ keystore เดียวกัน ถ้าต่างกันให้จด SHA-1 ทุกตัว
  - **ข้อควรระวัง:** ถ้า CLI แสดง package เป็น `com.example.fitnese` แปลว่าไม่ได้อ่าน `APP_BUNDLE_ID` ให้รันแบบ `APP_BUNDLE_ID=<BUNDLE_ID> APPLE_TEAM_ID=<TEAM_ID> eas credentials -p android`
  - **ผลลัพธ์ →** `<ANDROID_SHA1_EAS>` → Google Android OAuth client (ข้อ 33)

---

## ส่วน G — Apple: App ID, Sign in with Apple, คีย์ .p8

- [ ] **24. ลงทะเบียน App ID**
  - **ทำไม:** Services ID (ข้อ 25) และคีย์ (ข้อ 26) ต้องผูกกับ App ID หลัก (EAS สร้างให้อัตโนมัติตอน build ครั้งแรกได้ แต่ต้องมีก่อนทำข้อ 25)
  - **ที่ไหน:** developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App
  - **ใส่ค่า:** Description `<APP_NAME>` · Bundle ID: Explicit = `<BUNDLE_ID>` · Capabilities: ติ๊ก **Sign In with Apple** (Enable as a primary App ID) — In-App Purchase เปิดให้อยู่แล้ว (`app.config.ts` ตั้ง `usesAppleSignIn: true` ไว้ EAS จะซิงก์ capability ให้ตรงตอน build)
  - **ผลลัพธ์ →** App ID `<BUNDLE_ID>`

- [ ] **25. สร้าง Services ID สำหรับ Sign in with Apple บน Android (D11)**
  - **ทำไม:** Apple ไม่มี SDK บน Android แอปจึงเปิดหน้า OAuth ของ Supabase ซึ่งต้องใช้ Services ID + Return URL
  - **ที่ไหน:** Identifiers → **+** → Services IDs → Continue
  - **ใส่ค่า:** Description `<APP_NAME> Sign in (Android)` · Identifier `<BUNDLE_ID>.signin` → Register → เปิด Services ID ที่สร้าง → ติ๊ก Sign In with Apple → **Configure**: Primary App ID = `<BUNDLE_ID>` · Domains and Subdomains = `<PROJECT_REF>.supabase.co` · Return URLs = `https://<PROJECT_REF>.supabase.co/auth/v1/callback` → Save
  - **ผลลัพธ์ →** `<SERVICES_ID>`
  - **ไม่ต้องทำ:** การลงทะเบียนอีเมลสำหรับ private relay (แอปไม่ส่งอีเมลหาผู้ใช้)

- [ ] **26. สร้างคีย์ Sign in with Apple (.p8)**
  - **ทำไม:** ใช้ 2 ที่: (1) เซ็น client secret ของ OAuth ให้ Supabase (ข้อ 27) (2) ให้ `delete-account` แลก authorization code และเพิกถอนโทเค็น Apple ตอนลบบัญชี (B12, D40)
  - **ที่ไหน:** Certificates, Identifiers & Profiles → Keys → **+** → Key Name `<APP_NAME> SIWA` → ติ๊ก Sign in with Apple → Configure → Primary App ID `<BUNDLE_ID>` → Save → Continue → Register → **Download** (ดาวน์โหลดได้ครั้งเดียว)
  - **ใส่ค่า:** ย้ายไฟล์ไปไว้ที่ `secrets/AuthKey_<SIWA_KEY_ID>.p8`
  - **ผลลัพธ์ →** `<SIWA_KEY_ID>` + ไฟล์ .p8

- [ ] **27. สร้าง Apple OAuth client secret (JWT) ให้ Supabase**
  - **ทำไม:** Supabase ต้องใช้ secret นี้ใน OAuth flow (Sign in with Apple บน Android) — Apple กำหนดอายุสูงสุด 6 เดือน **หมดอายุเมื่อไร Apple บน Android ล็อกอินไม่ได้** (iOS ใช้ ID token แบบ native จึงไม่กระทบ)
  - **ที่ไหน:** ใช้เครื่องมือสร้าง secret ในหน้าเอกสาร "Login with Apple" ของ Supabase หรือเครื่องมือสร้าง JWT แบบ ES256 ที่ไว้ใจได้ (ห้ามใช้เว็บที่ส่งคีย์ขึ้นเซิร์ฟเวอร์)
  - **ใส่ค่า:** header `{"alg":"ES256","kid":"<SIWA_KEY_ID>"}` · payload `{"iss":"<TEAM_ID>","iat":<เวลาปัจจุบัน epoch วินาที>,"exp":<ไม่เกิน iat + 15777000>,"aud":"https://appleid.apple.com","sub":"<SERVICES_ID>"}` · เซ็นด้วยไฟล์ .p8 จากข้อ 26
  - **ผลลัพธ์ →** `<APPLE_OAUTH_SECRET>` + **วันหมดอายุ** (จดในสมุดจดค่า และตั้งปฏิทินเตือนต่ออายุ ข้อ 82)

- [ ] **28. เปิด Apple provider ใน Supabase**
  - **ที่ไหน:** Supabase → Authentication → Sign In / Providers → **Apple** → Enable
  - **ใส่ค่า:** Client IDs = `<SERVICES_ID>,<BUNDLE_ID>` (Services ID ไว้ตัวแรก ใช้กับ OAuth บน Android; Bundle ID ใช้ตรวจ ID token จาก iOS native) · Secret Key (for OAuth) = `<APPLE_OAUTH_SECRET>` → Save
  - **ผลลัพธ์ →** ตั้งค่าในแดชบอร์ด

- [ ] **29. ตั้ง secret ของ Apple ให้ `delete-account`**
  - **ทำไม:** `supabase/functions/delete-account/index.ts` เพิกถอนโทเค็น Apple ได้เฉพาะเมื่อมีครบ 4 ค่า `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CLIENT_ID` (ถ้าขาด จะลบข้อมูลได้แต่ไม่เพิกถอน — ผิดข้อกำหนด Apple B12)
  - **ใส่ค่า:** สร้างไฟล์ `secrets/supabase-functions.env` (อยู่ในโฟลเดอร์ที่ถูก .gitignore):
    ```bash
    APPLE_TEAM_ID=<TEAM_ID>
    APPLE_KEY_ID=<SIWA_KEY_ID>
    APPLE_CLIENT_ID=<BUNDLE_ID>
    APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...บรรทัดที่2...\n...\n-----END PRIVATE KEY-----"
    ```
    `APPLE_CLIENT_ID` ต้องเป็น **Bundle ID** (ไม่ใช่ Services ID) เพราะ authorization code ที่ลบบัญชีมาจาก Sign in with Apple แบบ native บน iOS · `APPLE_PRIVATE_KEY` คือเนื้อหาไฟล์ .p8 ทั้งไฟล์ในบรรทัดเดียว โดยแทนการขึ้นบรรทัดใหม่ด้วย `\n` (โค้ดแปลง `\n` กลับเป็นบรรทัดใหม่ให้) สร้างได้ด้วย `awk 'NF {printf "%s\\n", $0}' secrets/AuthKey_<SIWA_KEY_ID>.p8`
  - **คำสั่ง:** `npx supabase secrets set --env-file secrets/supabase-functions.env` แล้ว `npx supabase secrets list` ต้องเห็นชื่อทั้ง 4 ตัว + `REVENUECAT_WEBHOOK_SECRET`
  - **ข้อจำกัดที่ต้องรู้ (D40):** การเพิกถอนโทเค็น Apple ทำได้เฉพาะเมื่อลบบัญชีจาก **iPhone/iPad** (แอปขอ authorization code ใหม่จาก Apple แล้วส่งให้ `delete-account` — ฟิลด์ `appleAuthorizationCode`) ผู้ที่ล็อกอินด้วย **Apple บน Android** (OAuth เว็บ) ไม่มี code จึง **เพิกถอนโทเค็นให้ไม่ได้** — ข้อมูลถูกลบครบ แต่ผู้ใช้ต้องถอนสิทธิ์แอปเองที่ appleid.apple.com → Sign in with Apple หน้า Privacy ในแอปบอกไว้แล้ว (ข้อ 14) ห้ามตอบแบบฟอร์ม/ผู้รีวิวว่าเพิกถอนครบทุกกรณี ถ้าเจ้าของไม่ยอมรับข้อจำกัดนี้ ต้องตัดสินใจเรื่องการปรับ flow (งานของผู้พัฒนา ไม่ใช่งานตั้งค่า)
  - **ผลลัพธ์ →** Supabase Edge Function secrets

---

## ส่วน H — Google Sign-In (Google Cloud OAuth)

- [ ] **30. ตั้ง OAuth consent screen**
  - **ที่ไหน:** Google Cloud Console (โปรเจกต์จากข้อ 7) → APIs & Services → OAuth consent screen (คอนโซลรุ่นใหม่เรียก **Google Auth Platform** → Branding / Audience / Data Access)
  - **ใส่ค่า:** User type = External · App name `<APP_NAME>` · User support email · Developer contact email · App domain: Privacy policy = `<PRIVACY_URL>`, Terms = `<TERMS_URL>` · Authorized domains: โดเมนของหน้า Privacy และ `<PROJECT_REF>.supabase.co` · Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` เท่านั้น (ไม่ใช่ sensitive scope) · Publishing status → **Publish app / In production** (ถ้าค้างเป็น Testing จะล็อกอินได้เฉพาะ test users)
  - **ข้อควรรู้:** ถ้าอัปโหลดโลโก้ Google จะขอตรวจแบรนด์ก่อนแสดง ถ้าไม่อยากรอ ให้ข้ามโลโก้
  - **ผลลัพธ์ →** consent screen แบบ In production

- [ ] **31. สร้าง OAuth client แบบ Web application**
  - **ทำไม:** แอปส่ง `webClientId` ให้ `GoogleSignin.configure` เพื่อให้ได้ ID token ที่ Supabase ตรวจได้ (`src/services/auth/supabaseAuth.ts`) และ Supabase ใช้ client secret ของตัวนี้
  - **ที่ไหน:** APIs & Services → Credentials → Create credentials → OAuth client ID → Application type **Web application**
  - **ใส่ค่า:** Name `<APP_NAME> (Supabase)` · Authorized redirect URIs = `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (แอปนี้ใช้ ID token จึงไม่บังคับ แต่ใส่ไว้ตามแนวทางของ Supabase)
  - **ผลลัพธ์ →** `<WEB_CLIENT_ID>` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` + Supabase (ข้อ 34) · `<WEB_CLIENT_SECRET>` → Supabase (ข้อ 34) เท่านั้น ห้ามใส่ใน `.env`

- [ ] **32. สร้าง OAuth client แบบ iOS**
  - **ใส่ค่า:** Create credentials → OAuth client ID → **iOS** → Bundle ID = `<BUNDLE_ID>` (Team ID / App Store ID ใส่ภายหลังได้)
  - **ผลลัพธ์ →**
    - `<IOS_CLIENT_ID>` (เช่น `123-def.apps.googleusercontent.com`) → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + Supabase (ข้อ 34)
    - `<IOS_URL_SCHEME>` = กลับลำดับ client ID เป็น `com.googleusercontent.apps.123-def` (หน้า client แสดงเป็น "iOS URL scheme") → `GOOGLE_IOS_URL_SCHEME` (ปลั๊กอิน `@react-native-google-signin/google-signin` ใน `app.config.ts` ฝังค่านี้ตอน build ถ้าไม่ตั้ง จะใช้ค่าชั่วคราว `com.googleusercontent.apps.placeholder` และ Google Sign-In บน iOS จะใช้ไม่ได้)

- [ ] **33. สร้าง OAuth client แบบ Android**
  - **ทำไม:** Google ตรวจคู่ package + SHA-1 ของแอปที่ขอล็อกอิน ต้องมี client ใน **โปรเจกต์เดียวกับ Web client** (แอปไม่ได้ใช้ client ID ของ Android ในโค้ด แต่ถ้าไม่มี จะได้ error `DEVELOPER_ERROR`)
  - **ใส่ค่า:** Create credentials → OAuth client ID → **Android** → Package name = `<BUNDLE_ID>` · SHA-1 = `<ANDROID_SHA1_EAS>` (ข้อ 23) — สร้างเพิ่มอีก 1 client ด้วย `<ANDROID_SHA1_PLAY>` หลังข้อ 50 (แอปที่ติดตั้งจาก Play ถูก Google เซ็นใหม่ด้วยคีย์ของ Play) ถ้าโปรไฟล์ EAS ใช้ keystore ต่างกันหรือ build ในเครื่องด้วย `npm run android` ให้เพิ่ม client ต่อ SHA-1 แต่ละตัว
  - **ผลลัพธ์ →** Android client(s) (ไม่ต้องใส่ค่าใดในแอป)

- [ ] **34. เปิด Google provider ใน Supabase**
  - **ที่ไหน:** Supabase → Authentication → Sign In / Providers → **Google** → Enable
  - **ใส่ค่า:** Client IDs = `<WEB_CLIENT_ID>,<IOS_CLIENT_ID>` (Web ไว้ตัวแรก จะใส่ client ID ของ Android ต่อท้ายด้วยก็ได้) · Client Secret (for OAuth) = `<WEB_CLIENT_SECRET>` · **Skip nonce checks = เปิด** (SDK ของ Google บน iOS ใส่ nonce ใน ID token โดยที่แอปไม่รู้ค่า — ตรงกับ `skip_nonce_check = true` ใน `supabase/config.toml`) → Save
  - **ผลลัพธ์ →** ตั้งค่าในแดชบอร์ด

---

## ส่วน I — RevenueCat ตอนที่ 1: โปรเจกต์และแอป

- [ ] **35. สร้างโปรเจกต์และแอปใน RevenueCat แล้วเอา public SDK keys**
  - **ที่ไหน:** RevenueCat → **+ Create new project** ชื่อ `<APP_NAME>` → Apps & providers (เดิมชื่อ Apps) → **+ New** → App Store → Bundle ID `<BUNDLE_ID>` · **+ New** → Play Store → Package name `<BUNDLE_ID>` (credential ของสโตร์ใส่ในข้อ 59–60 หลังสร้างสินค้า)
  - **ผลลัพธ์ →** Project settings → **API keys** → public app-specific keys:
    - App Store key (ขึ้นต้น `appl_`) → `<RC_IOS_KEY>` → `EXPO_PUBLIC_RC_IOS_KEY`
    - Play Store key (ขึ้นต้น `goog_`) → `<RC_ANDROID_KEY>` → `EXPO_PUBLIC_RC_ANDROID_KEY`
  - **ไม่ต้องตั้ง:** app user id — โค้ดเรียก `Purchases.logIn(<id ผู้ใช้ Supabase>)` หลังล็อกอินเอง (SPEC B4, J3) · Project settings → Transfer behavior ใช้ค่าเริ่มต้น (Transfer to new App User ID) webhook รองรับเหตุการณ์ `TRANSFER` แล้ว

---

## ส่วน J — `.env` และ EAS environment variables

- [ ] **36. กรอก `.env` ในเครื่องให้ครบ**
  - **ทำไม:** `src/services/config.ts` อ่านค่าเหล่านี้ (`EXPO_PUBLIC_*` ถูกฝังตอน bundle) และ `app.config.ts` อ่าน `APP_BUNDLE_ID`, `APPLE_TEAM_ID`, `GOOGLE_IOS_URL_SCHEME` ตอน build ไฟล์ `.env` ในเครื่องใช้ตอนรัน `npm start` (Metro ของ development build) และตอน `npx expo config`
  - **ตารางตัวแปรทั้งหมดใน `.env.example`:**

    | ตัวแปร | ใช้ที่ | ได้มาจาก | ค่าสำหรับ build จริง | ความลับ? |
    |---|---|---|---|---|
    | `EXPO_PUBLIC_USE_MOCKS` | `src/services/config.ts` → `src/services/registry.ts` | ตั้งเอง | **`0`** (ถ้าเป็น `1` ใน dev build / พรีวิวเว็บ จะใช้ล็อกอิน/สโตร์จำลอง; release build บนมือถือไม่ใช้ mock แม้ตั้ง `1` ผิด แต่ควรตั้ง `0` ให้ชัด) | ไม่ |
    | `EXPO_PUBLIC_MOCK_SCENARIO` | `MockPurchasesService` (เฉพาะโหมด mock) | ตั้งเอง: `new` · `trial_used` · `trialing` · `monthly` · `lifetime` · `expired` · `billing_grace` (ตรงกับ `.env.example`) | ไม่มีผลเมื่อ mock ปิด (ปล่อย `new`) | ไม่ |
    | `EXPO_PUBLIC_SUPABASE_URL` | Supabase client | ข้อ 15 | `<SUPABASE_URL>` | ไม่ |
    | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase client | ข้อ 15 | `<SUPABASE_ANON_KEY>` (ห้ามใช้ service_role) | ไม่ (เป็นคีย์สาธารณะ ป้องกันด้วย RLS) |
    | `EXPO_PUBLIC_RC_IOS_KEY` | RevenueCat บน iOS | ข้อ 35 | `appl_...` | ไม่ |
    | `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat บน Android | ข้อ 35 | `goog_...` | ไม่ |
    | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `GoogleSignin.configure({ webClientId })` | ข้อ 31 | `<WEB_CLIENT_ID>` | ไม่ |
    | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `GoogleSignin.configure({ iosClientId })` | ข้อ 32 | `<IOS_CLIENT_ID>` | ไม่ |
    | `GOOGLE_IOS_URL_SCHEME` | `app.config.ts` (ปลั๊กอิน Google Sign-In, ตอน build เท่านั้น) | ข้อ 32 | `<IOS_URL_SCHEME>` | ไม่ |
    | `EXPO_PUBLIC_PRIVACY_URL` | หน้า `/legal/[doc]` ปุ่ม "Open web version" | ข้อ 14 | `<PRIVACY_URL>` | ไม่ |
    | `EXPO_PUBLIC_TERMS_URL` | หน้า `/legal/[doc]` | ข้อ 14 | `<TERMS_URL>` | ไม่ |
    | `APP_BUNDLE_ID` | `app.config.ts` (iOS bundle id + Android package) | ข้อ 2 | `<BUNDLE_ID>` | ไม่ |
    | `APPLE_TEAM_ID` | `app.config.ts` (`ios.appleTeamId`) | ข้อ 4 | `<TEAM_ID>` | ไม่ |

  - **กฎของโค้ดที่ควรรู้:** ถ้า `EXPO_PUBLIC_USE_MOCKS` ไม่ใช่ `1` แต่คีย์ขาด — dev build และพรีวิวเว็บจะสลับไปใช้ mock เอง ส่วน release build บนมือถือ **ไม่ใช้ mock เด็ดขาด** (ต่อให้ตั้ง `1`) และจะ error แทน (`decideMocks()` / `shouldUseMocks()` ใน `src/services/config.ts`) ตัวที่ถือว่า "ขาด" คือ Supabase URL/anon key, RevenueCat key (อย่างน้อย 1 แพลตฟอร์ม) และ Google web client ID
  - **ผลลัพธ์ →** `.env` ในเครื่อง (ห้าม commit)

- [ ] **37. ใส่ค่าชุดเดียวกันใน EAS environment variables**
  - **ทำไม:** เครื่อง build ของ EAS ไม่เห็น `.env` (ข้อ 22) โปรไฟล์ `preview` และ `production` ฝัง JS ไว้ในแอป จึงต้องได้ `EXPO_PUBLIC_*` จาก EAS ส่วน `development` ต้องการค่า build-time (`APP_BUNDLE_ID`, `APPLE_TEAM_ID`, `GOOGLE_IOS_URL_SCHEME`)
  - **คำสั่ง:** ทำทุกตัวในตารางข้อ 36 (ยกเว้น `EXPO_PUBLIC_MOCK_SCENARIO` ที่ไม่จำเป็น) ทั้ง 3 environment ตัวอย่าง:
    ```bash
    for E in development preview production; do
      eas env:create --environment $E --name EXPO_PUBLIC_USE_MOCKS --value 0 --visibility plaintext
      eas env:create --environment $E --name EXPO_PUBLIC_SUPABASE_URL --value <SUPABASE_URL> --visibility plaintext
      eas env:create --environment $E --name GOOGLE_IOS_URL_SCHEME --value <IOS_URL_SCHEME> --visibility plaintext
      # ...ตัวที่เหลือในตารางข้อ 36 แบบเดียวกัน
    done
    eas env:list --environment production   # ตรวจว่าครบ
    ```
    ใช้ `--visibility plaintext` (หรือ `sensitive`) เท่านั้น — ทุกค่าเป็นค่าสาธารณะที่ถูกฝังในแอปอยู่แล้ว ถ้าภายหลังต้องแก้ค่า ใช้ `eas env:update` (หรือลบด้วย `eas env:delete` แล้วสร้างใหม่)
  - **ผลลัพธ์ →** EAS env ครบทั้ง development / preview / production โดย **preview และ production ต้องเป็น `EXPO_PUBLIC_USE_MOCKS=0`**

- [ ] **38. ตาราง secret ฝั่งเซิร์ฟเวอร์ (ตรวจทาน)**

  | ชื่อ | อยู่ที่ | ใช้โดย | ตั้งในข้อ |
  |---|---|---|---|
  | `REVENUECAT_WEBHOOK_SECRET` | Supabase Edge Function secrets | `revenuecat-webhook` (ตรวจ header `Authorization`) | 18 |
  | `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CLIENT_ID` | Supabase Edge Function secrets | `delete-account` (เพิกถอนโทเค็น Apple) | 29 |
  | `REVENUECAT_SECRET_API_KEY` (ไม่บังคับ แต่แนะนำ — `Deno.env.get` ใน `delete-account/index.ts`) | Supabase Edge Function secrets | `delete-account` (ลบลูกค้าใน RevenueCat ด้วย) | 63 |
  | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase ใส่ให้อัตโนมัติ | ทั้งสองฟังก์ชัน | ไม่ต้องตั้ง (CLI ไม่ยอมให้ตั้งชื่อที่ขึ้นต้น `SUPABASE_`) |
  | Google web client secret, Apple OAuth secret | Supabase Dashboard → Auth Providers | Supabase Auth | 28, 34 |
  | `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET`, `APPLE_SERVICES_ID`, `APPLE_OAUTH_SECRET` | env ของเครื่องคุณ (เฉพาะถ้ารัน `supabase start` ในเครื่อง) | `supabase/config.toml` | ไม่จำเป็นสำหรับโปรเจกต์จริง |
  | ไฟล์ service account ของ Play | `secrets/google-play-service-account.json` | `eas submit` (`eas.json`) | 55 |

  - **ตรวจครบ:** `npx supabase secrets list` ต้องเห็นอย่างน้อย `REVENUECAT_WEBHOOK_SECRET`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CLIENT_ID` และ (แนะนำ) `REVENUECAT_SECRET_API_KEY` — ชื่อเหล่านี้ตรงกับ `Deno.env.get(...)` ใน `supabase/functions/revenuecat-webhook/index.ts` และ `supabase/functions/delete-account/index.ts` (ฟังก์ชันอื่นอ่านเฉพาะ `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` ที่ Supabase ใส่ให้) ถ้าชื่อไม่ตรง ฟังก์ชันจะข้ามขั้นนั้นแบบเงียบๆ (เช่น ไม่เพิกถอน Apple)

---

## ส่วน K — Development build และทดสอบล็อกอินจริง

- [ ] **39. สร้าง development build**
  - **ทำไม:** แอปมี native module (RevenueCat, Google Sign-In, Apple) จึงต้องใช้ development build (SPEC L, D21) สภาพแวดล้อมที่เขียนโค้ดไม่มี Xcode/Android SDK จึงยังไม่เคย build บนเครื่องจริง
  - **คำสั่ง:**
    ```bash
    eas device:create                                          # ลงทะเบียน iPhone สำหรับ internal distribution
    eas build --profile development --platform ios             # iPhone จริง (เปิด Developer Mode ในเครื่อง iOS 16+)
    eas build --profile development-simulator --platform ios   # iOS Simulator (ไม่ต้องลงทะเบียนเครื่อง)
    eas build --profile development --platform android         # APK สำหรับติดตั้งตรง
    ```
    ครั้งแรกของ iOS, EAS จะถามให้ล็อกอิน Apple ID เพื่อสร้าง certificate / provisioning profile และซิงก์ capability (Sign in with Apple) ให้เอง
  - **ผลลัพธ์ →** ไฟล์ติดตั้ง (ลิงก์จากหน้า build ใน expo.dev)

- [ ] **40. ทดสอบล็อกอินกับบริการจริง**
  - **คำสั่ง:** ใน `.env` ตั้ง `EXPO_PUBLIC_USE_MOCKS=0` และคีย์จริงครบ แล้ว `npm start` (= `expo start --dev-client`) เปิดแอปบนเครื่อง
  - **ตรวจ:** "Continue with Google" ต้องเปิดหน้าเลือกบัญชี Google จริง (ถ้าล็อกอินผ่านทันทีโดยไม่มีหน้าใดๆ แปลว่ายังอยู่ในโหมด mock) · "Sign in with Apple" บน iPhone ใช้หน้าต่าง native บน Android เปิดเบราว์เซอร์แล้วเด้งกลับแอป · Supabase → Authentication → Users ต้องมีผู้ใช้ใหม่
  - **ถ้าล้ม:** Google บน Android `DEVELOPER_ERROR` → SHA-1/package ใน ข้อ 33 ไม่ตรง · Google บน iOS ปิดตัว/error URL scheme → `GOOGLE_IOS_URL_SCHEME` ผิดหรือ build ก่อนตั้งค่า (ต้อง build ใหม่) · Supabase ตอบ "audience" ไม่ตรง → Client IDs ในข้อ 28/34 · Apple บน Android ค้างที่เบราว์เซอร์ → Return URL (ข้อ 25) / Redirect URL (ข้อ 19) / secret หมดอายุ (ข้อ 27)
  - **ผลลัพธ์ →** ล็อกอินได้ทั้งสองผู้ให้บริการบนทั้งสองแพลตฟอร์ม (การซื้อทดสอบหลังข้อ 64)

---

## ส่วน L — App Store Connect

- [ ] **41. สร้างแอปใน App Store Connect**
  - **ที่ไหน:** App Store Connect → Apps → **+** → New App
  - **ใส่ค่า:** Platform iOS · Name `<APP_NAME>` · Primary Language (ไทยหรืออังกฤษ) · Bundle ID `<BUNDLE_ID>` · SKU (ตั้งเอง เช่น `fitnese-ios`) · User Access: Full Access จากนั้นที่ App Information: Category = Health & Fitness, Privacy Policy URL = `<PRIVACY_URL>`, เพิ่ม Localization ไทย + อังกฤษ
  - **ผลลัพธ์ →** App Information → General Information → **Apple ID** (ตัวเลข) = `<ASC_APP_ID>` → แก้ `eas.json` ที่ `submit.production.ios.ascAppId` จาก `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` เป็นค่านี้

- [ ] **42. สร้าง subscription group และสินค้ารายเดือน `fitnese_monthly`**
  - **ทำไม:** SPEC J1/B1: รายเดือนแบบต่ออายุอัตโนมัติ พร้อมทดลองฟรี 7 วัน (introductory offer) — product ID ต้องตรงกับที่ RevenueCat และ mock ใช้ (`fitnese_monthly`)
  - **ที่ไหน:** แอป → Monetization → **Subscriptions** (คอนโซลรุ่นเก่า: Features → Subscriptions) → Subscription Groups **+**
  - **ใส่ค่า:**
    - Group: Reference Name `Fitnese Pro` → Localization (ไทย + อังกฤษ): Subscription Group Display Name เช่น `<APP_NAME> Pro`
    - ในกลุ่ม → Create subscription: Reference Name `Monthly` · Product ID **`fitnese_monthly`** · Subscription Duration **1 Month**
    - Availability: ทุกประเทศ/ภูมิภาค · Subscription Prices: ตามข้อ 57 (base country = Thailand)
    - Localization (ไทย + อังกฤษ): Display Name เช่น "รายเดือน" / "Monthly", Description เช่น "ปลดล็อกทุกฟีเจอร์ ต่ออายุทุกเดือน" / "Unlock everything, renews monthly"
    - Review Information: ภาพหน้าจอ Paywall จากเครื่องจริง/simulator + หมายเหตุสั้นๆ
    - Family Sharing: **ไม่เปิด** (SPEC ไม่ได้กำหนด และเปิดแล้วปิดไม่ได้)
  - **ผลลัพธ์ →** สถานะ "Ready to Submit" (ถ้าเป็น "Missing Metadata" สินค้าจะไม่โหลดใน sandbox)

- [ ] **43. ตั้งทดลองฟรี 7 วัน (introductory offer)**
  - **ทำไม:** SPEC B1 ใช้ระบบทดลองของสโตร์เอง แอปอ่านจำนวนวันจาก intro offer ราคา 0 (`trialDaysOf` ใน `src/services/purchases/mapping.ts`: 1 week = 7 วัน) Apple ให้ intro offer เฉพาะผู้ที่ยังไม่เคยใช้ intro offer ในกลุ่มนี้ (= ลูกค้าใหม่) อัตโนมัติ และแอปตรวจ eligibility ก่อนแสดงข้อความทดลอง (B6)
  - **ที่ไหน:** `fitnese_monthly` → Subscription Prices → **+** (หรือ View all Subscription Pricing) → **Create Introductory Offer**
  - **ใส่ค่า:** Countries or Regions = ทั้งหมด · Start Date = วันนี้ · End Date = **No End Date** · Type = **Free** · Duration = **1 Week**
  - **ผลลัพธ์ →** บันทึกในตาราง "ช่วงทดลองที่ตั้งจริง" (ข้อ 58)

- [ ] **44. สร้างสินค้าซื้อขาด `fitnese_lifetime`**
  - **ที่ไหน:** แอป → Monetization → **In-App Purchases** → **+** → Type **Non-Consumable**
  - **ใส่ค่า:** Reference Name `Lifetime` · Product ID **`fitnese_lifetime`** (โค้ดถือว่า product ที่มีคำว่า `lifetime` คือซื้อขาด — `isLifetimeProduct` ใน `src/domain/entitlement/machine.ts`) · Availability ทุกประเทศ · Price ตามข้อ 57 · Localization ไทย/อังกฤษ เช่น "ซื้อขาด — ปลดล็อกถาวร" / "Lifetime — unlock forever" · Review screenshot · Family Sharing ไม่เปิด — **ไม่มีช่วงทดลอง** (B1)
  - **ผลลัพธ์ →** สถานะ "Ready to Submit"

- [ ] **45. เปิด Billing Grace Period**
  - **ทำไม:** SPEC J5 ต้องรองรับ grace period / billing retry แอปมีสถานะ `BILLING_GRACE` ที่ยังให้ใช้งานต่อพร้อมป้ายเตือนให้อัปเดตการชำระเงิน
  - **ที่ไหน:** Monetization → Subscriptions (หน้ารวมของแอป) → **Billing Grace Period** → Set Up / Turn On
  - **ใส่ค่า:** Duration ตามตัวเลือกที่คอนโซลมี (แนะนำ 16 วันสำหรับรายเดือน — เป็นการตัดสินใจทางธุรกิจ) · Eligible Subscribers = All Renewals (รวมการแปลงจากทดลองเป็นจ่าย) · Server Environments = Sandbox and Production
  - **ผลลัพธ์ →** บันทึกค่าในตาราง grace (ข้อ 58)

- [ ] **46. สร้างคีย์ให้ RevenueCat และ EAS**
  - **ที่ไหน / ใส่ค่า:**
    - **In-App Purchase Key** (RevenueCat ใช้ตรวจธุรกรรม StoreKit 2 — แอปใช้ `react-native-purchases` ^10.12 ตาม `package.json`; ต้องตรวจในเอกสาร/คอนโซล RevenueCat ปัจจุบันว่าต้องใช้ key ชนิดนี้เท่านั้นหรือใช้ shared secret ด้วย): Users and Access → Integrations → **In-App Purchase** → Generate → ดาวน์โหลด `.p8` เก็บที่ `secrets/` + จด Key ID และ **Issuer ID**
    - **App-Specific Shared Secret** (สำหรับใบเสร็จแบบเก่า): App Information → App-Specific Shared Secret → Manage → Generate
    - **App Store Connect API Key** (ให้ RevenueCat นำเข้าสินค้า และให้ `eas submit` ใช้แทนการล็อกอิน Apple ID): Users and Access → Integrations → **App Store Connect API** → Team Keys → **+** → Access = App Manager → ดาวน์โหลด `.p8` เก็บที่ `secrets/` + Key ID + Issuer ID
  - **ผลลัพธ์ →** ไฟล์และ ID เหล่านี้ใช้ในข้อ 59 (RevenueCat) และข้อ 67 (`eas submit` ถามหรือเลือกผ่าน `eas credentials` → iOS → App Store Connect API Key)

- [ ] **47. ตั้ง App Store Server Notifications ไปที่ RevenueCat**
  - **ทำไม:** ให้ RevenueCat รู้เหตุการณ์ (ยกเลิก, คืนเงิน, ต่ออายุ, ปัญหาการชำระเงิน) ทันที แล้วส่งต่อ webhook มาที่ Supabase (J6)
  - **ที่ไหน:** RevenueCat → แอป App Store → **Apple Server to Server notification settings** → คัดลอก URL → App Store Connect → App Information → **App Store Server Notifications** → Production Server URL และ Sandbox Server URL = URL นั้น · Version 2
  - **ผลลัพธ์ →** ตั้งค่าทั้งสองฝั่ง (ทำหลังข้อ 59 ก็ได้)

---

## ส่วน M — Google Play Console

- [ ] **48. สร้างแอปใน Play Console**
  - **ที่ไหน:** Play Console → All apps → **Create app**
  - **ใส่ค่า:** App name `<APP_NAME>` · Default language (ไทยหรืออังกฤษ แล้วเพิ่มอีกภาษาใน Store listing) · App or game = **App** · Free or paid = **Free** (เงินมาจาก in-app) · ยอมรับ declarations
  - **ผลลัพธ์ →** แอปในคอนโซล (package name จะผูกถาวรเมื่ออัปโหลด build แรก)

- [ ] **49. Build production ของ Android และอัปโหลดครั้งแรกด้วยมือ**
  - **ทำไม:** Play Console ให้สร้างสินค้า in-app ได้หลังมี build ที่มีสิทธิ์ `BILLING` (RevenueCat ใส่ให้ตอน build — D46) และ Google Play API (ที่ `eas submit` ใช้) อัปโหลดให้แอปใหม่ครั้งแรกไม่ได้ ต้องอัปโหลดเองผ่านเว็บ 1 ครั้ง
  - **คำสั่ง:** `eas build --profile production --platform android` (ได้ไฟล์ `.aab`) → ดาวน์โหลดจากหน้า build
  - **ที่ไหน:** Play Console → Test and release → Testing → **Internal testing** → Testers: สร้างรายชื่ออีเมลผู้ทดสอบ → Create new release → อัปโหลด `.aab` → ตั้งชื่อ release → Save → Review → Start rollout to Internal testing (ระบบจะให้ใช้ **Play App Signing** — ยอมรับ)
  - **ผลลัพธ์ →** build แรกใน internal testing

- [ ] **50. อ่าน SHA-1 ของ Play App Signing แล้วเพิ่ม Android OAuth client ตัวที่ 2**
  - **ที่ไหน:** Play Console → Test and release → Setup → **App signing** (หรือ App integrity → Play app signing → Settings) → App signing key certificate → **SHA-1 certificate fingerprint** (ส่วน Upload key certificate ต้องตรงกับ `<ANDROID_SHA1_EAS>`)
  - **ผลลัพธ์ →** `<ANDROID_SHA1_PLAY>` → Google Cloud → สร้าง Android OAuth client ใหม่ (package `<BUNDLE_ID>` + SHA-1 นี้) ตามข้อ 33 — ถ้าไม่ทำ ผู้ใช้ที่ติดตั้งจาก Play จะล็อกอิน Google ไม่ได้

- [ ] **51. สร้าง subscription `fitnese_monthly` + base plan รายเดือน**
  - **ที่ไหน:** Monetize with Play → Products → **Subscriptions** → Create subscription
  - **ใส่ค่า:**
    - Product ID **`fitnese_monthly`** · Name เช่น `<APP_NAME> Pro Monthly` · Benefits/description ไทย + อังกฤษ
    - **Add base plan**: Base plan ID **`monthly`** · Type **Auto-renewing** · Billing period **1 month** · Grace period และ Account hold ตามข้อ 53 · Resubscribe = Allow · ราคา: ตามข้อ 57 → **Activate**
  - **ผลลัพธ์ →** สินค้าใน RevenueCat จะชื่อ `fitnese_monthly:monthly` (รูปแบบ subscription ID : base plan ID)

- [ ] **52. ตั้ง offer ทดลองฟรี 7 วัน (เฉพาะลูกค้าใหม่)**
  - **ทำไม:** SPEC B1/N2: offer free trial 7 วันบน base plan รายเดือน และต้องตรงกับที่แอปแสดง แอปอ่านจาก `defaultOption.freePhase` (P7D = 7 วัน) Google ส่ง offer มาให้เฉพาะผู้ที่มีสิทธิ์ ผู้ไม่มีสิทธิ์จะเห็นปุ่มสมัครรายเดือนแบบไม่มีทดลอง (B6)
  - **ที่ไหน:** `fitnese_monthly` → Base plans and offers → **Add offer** → เลือก base plan `monthly`
  - **ใส่ค่า:** Offer ID เช่น **`free-trial-7d`** · Eligibility = **New customer acquisition** → **Never had this subscription** · Phases → Add phase → **Free trial** → Duration **7 days** · Tags: ไม่ต้องใส่ (ห้ามใส่แท็ก `rc-ignore-offer`) → **Activate**
  - **ผลลัพธ์ →** บันทึกในตาราง "ช่วงทดลองที่ตั้งจริง" (ข้อ 58)

- [ ] **53. ตั้ง Grace period และ Account hold**
  - **ทำไม:** SPEC J5 (grace period / billing retry ของ Google Play) — ระหว่าง grace แอปยังให้ใช้ (`BILLING_GRACE`) เมื่อเข้า account hold สิทธิ์หยุดจนกว่าจะชำระสำเร็จ (ข้อมูลไม่หาย)
  - **ที่ไหน:** ในหน้า base plan `monthly` → ส่วน Grace period / Account hold
  - **ใส่ค่า:** เลือกจากตัวเลือกที่คอนโซลมี — แนะนำ grace period 7 วัน และเปิด account hold ตามค่าเริ่มต้น (เป็นการตัดสินใจทางธุรกิจ)
  - **ผลลัพธ์ →** บันทึกในตาราง grace (ข้อ 58)

- [ ] **54. สร้างสินค้าซื้อขาด `fitnese_lifetime`**
  - **ที่ไหน:** Monetize with Play → Products → **One-time products** (คอนโซลรุ่นเก่า: In-app products) → Create
  - **ใส่ค่า:** Product ID **`fitnese_lifetime`** · Name/description ไทย + อังกฤษ · ถ้าคอนโซลให้สร้าง purchase option ให้เลือกแบบ **Buy** (ซื้อครั้งเดียว ไม่ใช่เช่า) · ราคา ตามข้อ 57 → **Activate** — ไม่มีช่วงทดลอง
  - **ผลลัพธ์ →** สินค้าใน RevenueCat ชื่อ `fitnese_lifetime`

- [ ] **55. Service account สำหรับ RevenueCat และ EAS Submit**
  - **ทำไม:** RevenueCat ต้องอ่านการซื้อ/สมาชิกจาก Google Play API และ `eas submit` ต้องอัปโหลด build (`eas.json` → `serviceAccountKeyPath: ./secrets/google-play-service-account.json`) แนะนำแยก 2 บัญชีเพื่อจำกัดสิทธิ์
  - **ที่ไหน (Google Cloud):** APIs & Services → Library → เปิด **Google Play Android Developer API** (และ Google Play Developer Reporting API ตามคู่มือ RevenueCat) → IAM & Admin → Service Accounts → Create → (บัญชีของ RevenueCat ให้ role **Pub/Sub Editor** และ **Monitoring Viewer** ตามคู่มือ RevenueCat) → Keys → Add key → JSON
  - **ที่ไหน (Play Console):** Users and permissions → **Invite new users** → อีเมลของ service account → สิทธิ์:
    - บัญชี RevenueCat: View app information and download bulk reports (read-only) · View financial data, orders, and cancellation survey responses · Manage orders and subscriptions
    - บัญชี EAS Submit: Release apps to testing tracks · Release to production, exclude devices, and use Play App Signing · Manage testing tracks and edit tester lists
  - **ผลลัพธ์ →** JSON ของ RevenueCat → อัปโหลดในข้อ 60 · JSON ของ EAS → วางที่ `secrets/google-play-service-account.json` (ตรงกับ `eas.json`)

- [ ] **56. ตั้ง Real-time developer notifications (RTDN)**
  - **ทำไม:** ให้ RevenueCat รู้เหตุการณ์ของ Google Play ทันที (ต่ออายุ, ยกเลิก, grace, account hold) แล้วส่ง webhook ต่อ (J6)
  - **ที่ไหน:** RevenueCat → แอป Play Store → **Google developer notifications** → เลือก Google Cloud project → ได้ Topic ID (`projects/<project>/topics/...`) → Play Console → Monetize with Play → **Monetization setup** → Real-time developer notifications → Topic name = ค่านั้น → **Send test notification** → RevenueCat ต้องแสดงว่าได้รับแล้ว
  - **ผลลัพธ์ →** ตั้งค่าทั้งสองฝั่ง (ทำหลังข้อ 60)

---

## ส่วน N — ราคา (SPEC J2)

> **สถานะข้อมูล: ยังไม่ได้ยืนยัน — ต้องตรวจในคอนโซลจริง** — ราคาขั้นต่ำ (price floor) และ price point เงินบาทของ App Store กับ Google Play ในวันนี้ **ไม่มีใครตรวจได้นอกคอนโซลของเจ้าของ** (เปิดหน้าทางการของทั้งสองสโตร์ไม่ได้ในสภาพแวดล้อมที่เขียนเอกสารนี้) แหล่งข้อมูลเดียวที่พบคือโพสต์ Android Developers Blog เดือนพฤศจิกายน 2015 ที่ระบุว่า Google Play ลดราคาขั้นต่ำในประเทศไทยลงเหลือ **10 บาท** (https://android-developers.googleblog.com/2015/11/minimum-purchase-price-for-apps-and-in.html — ไม่ได้เปิดตรวจซ้ำในรอบนี้) ข้อมูลนี้เก่าราว 10 ปี **ห้ามถือเป็นค่าปัจจุบัน** ดังนั้นทุกช่อง "ราคาต่ำสุดที่คอนโซลอนุญาต" ในตารางข้อ 58 คือ **"ต้องตรวจในคอนโซลจริง"** จนกว่าเจ้าของจะกรอก ตัวเลข 19 / 99 บาทเป็นแค่ "เป้า" ตาม SPEC J2 ไม่ใช่ราคาที่ยืนยันว่าตั้งได้
>
> แอปไม่ฮาร์ดโค้ดราคา Paywall แสดง `priceString` ที่ได้จากสโตร์ผ่าน RevenueCat เสมอ (ราคา ฿19.00 / ฿99.00 มีเฉพาะในสโตร์จำลองของโหมด mock — D20)

- [ ] **57. ตั้งราคาตามขั้นตอนตรวจสอบนี้ (ทำทั้ง 4 สินค้า)**
  - **กติกา (SPEC J2):** เป้า = รายเดือน **19 บาท**, ซื้อขาด **99 บาท** (ประเทศไทย)
    1. ถ้าคอนโซลมี/ยอมรับราคา 19 (หรือ 99) พอดี → ใช้ค่านั้น
    2. ถ้าไม่มี → เลือก price point ที่ **ใกล้เป้าที่สุด** ถ้าห่างเท่ากันให้เลือกตัวที่ถูกกว่า
    3. ถ้าราคาต่ำสุดที่สโตร์อนุญาต **สูงกว่า** เป้า → ใช้ราคาต่ำสุดนั้น
    4. App Store กับ Google Play ได้ราคาต่างกันได้ ประเทศอื่นให้สโตร์คำนวณอัตโนมัติจากราคาไทย
  - **App Store** (ทำหลังข้อ 42 และ 44):
    1. `fitnese_monthly` → Subscription Prices → Add Subscription Price (หรือ Edit) → **Country or Region = Thailand (THB)** เป็นฐาน
    2. เปิดรายการราคาเงินบาท จด (ก) ราคาต่ำสุดในรายการ (ข) มี 19.00 หรือไม่ (ค) price point ที่อยู่ติดกับ 19 ทั้งสองข้าง
    3. เลือกตามกติกา → Next → ตรวจหน้าราคาประเทศอื่นที่ Apple ปรับเทียบให้อัตโนมัติ (ไม่ต้องแก้ทีละประเทศ) → Confirm
    4. `fitnese_lifetime` → Price Schedule → Add Pricing → Base Country = Thailand → ทำแบบเดียวกันกับเป้า 99
  - **Google Play** (ทำหลังข้อ 51 และ 54):
    1. base plan `monthly` → Set prices (หรือ Edit price) → ประเทศไทย → พิมพ์ `19` → ถ้าคอนโซลแจ้งว่าอยู่นอกช่วง ข้อความจะบอกช่วงที่อนุญาต — จดราคาต่ำสุด
    2. ประเทศอื่น: ใช้การแปลงอัตราแลกเปลี่ยนอัตโนมัติของคอนโซล (ปุ่ม Update exchange rates / ตั้งราคาจากราคาเริ่มต้น) → Save
    3. `fitnese_lifetime` → ราคา → ประเทศไทย `99` → ทำแบบเดียวกัน
  - **ตรวจในแอป:** หลังข้อ 64 เปิด Paywall ด้วยบัญชี sandbox (iOS) และ license tester (Android) แล้วจดราคาที่ Paywall แสดง ต้องตรงกับที่ตั้ง
  - **ถ้าคอนโซลระบุว่าราคารวม/ไม่รวมภาษี** ให้จดตามที่คอนโซลแสดงในคอลัมน์หมายเหตุ
  - **ห้ามเขียนราคาลงข้อความหน้าร้าน/Paywall เอง** — แอปแสดง `priceString` จากสโตร์ และข้อความใน `store-metadata/` ตั้งใจไม่ระบุราคา

- [ ] **58. กรอกตาราง "ราคาที่ตั้งได้จริง" (รายงานตาม SPEC J2)**

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

## ส่วน O — RevenueCat ตอนที่ 2: สินค้า, entitlement, offering, webhook

- [ ] **59. ใส่ credential ของ App Store ใน RevenueCat**
  - **ที่ไหน:** RevenueCat → Apps & providers → แอป App Store
  - **ใส่ค่า:** In-app purchase key configuration: อัปโหลด `.p8` + Key ID + Issuer ID (ข้อ 46) · App-Specific Shared Secret (ข้อ 46) · App Store Connect API: อัปโหลด `.p8` + Key ID + Issuer ID (สำหรับนำเข้าสินค้า) — จากนั้นทำข้อ 47
  - **ผลลัพธ์ →** สถานะ credential เป็น Valid

- [ ] **60. ใส่ credential ของ Google Play ใน RevenueCat**
  - **ที่ไหน:** RevenueCat → แอป Play Store → **Service Account credentials JSON** → อัปโหลด JSON ของบัญชี RevenueCat (ข้อ 55) — จากนั้นทำข้อ 56
  - **ข้อควรรู้:** สิทธิ์ของ service account ใหม่อาจใช้เวลาหลายชั่วโมงถึงราว 1–2 วันกว่า Google จะยอมรับ ถ้าขึ้น invalid ให้รอแล้วตรวจใหม่
  - **ผลลัพธ์ →** สถานะ credential เป็น Valid

- [ ] **61. นำเข้าสินค้า สร้าง entitlement `pro` และ offering `default`**
  - **ที่ไหน:** RevenueCat → Product catalog
  - **ใส่ค่า:**
    - **Products** → Import (หรือ + New) ให้ได้ 4 รายการ: App Store `fitnese_monthly`, `fitnese_lifetime` · Play Store `fitnese_monthly:monthly`, `fitnese_lifetime`
    - **Entitlements** → + New → Identifier **`pro`** (ต้องตรงกับ `ENTITLEMENT_ID = 'pro'` ใน `src/domain/entitlement/machine.ts`) → Attach ทั้ง 4 สินค้า (ทดลองและจ่ายเงินได้สิทธิ์เท่ากัน J3)
    - **Offerings** → offering identifier **`default`** (สร้างใหม่ถ้ายังไม่มี) → ต้องเป็น **Current** → Packages:
      - **`$rc_monthly`** (Monthly) → App Store `fitnese_monthly` + Play Store `fitnese_monthly:monthly`
      - **`$rc_lifetime`** (Lifetime) → App Store `fitnese_lifetime` + Play Store `fitnese_lifetime`
  - **ทำไม:** แอปอ่าน `offerings.current` แล้วหาแพ็กเกจรายเดือน/ซื้อขาดจากชนิดแพ็กเกจ (`plansFromOffering` ใน `src/services/purchases/mapping.ts`) ถ้าไม่มี offering ปัจจุบัน Paywall จะแสดง "Plans can't be loaded from the store right now."
  - **ผลลัพธ์ →** โครงสร้างสินค้าครบ

- [ ] **62. ตั้ง webhook ไปที่ Supabase**
  - **ที่ไหน:** RevenueCat → Project → Integrations → **Webhooks** → + Add (new webhook)
  - **ใส่ค่า:** Name `supabase` · Webhook URL = `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook` · **Authorization header value** = `Bearer <WEBHOOK_SECRET>` (ค่าเดียวกับ secret `REVENUECAT_WEBHOOK_SECRET` ในข้อ 18 — โค้ดรับได้ทั้งแบบมีและไม่มีคำว่า `Bearer `) · Environment = **Production and Sandbox** (ผู้รีวิวของ Apple และผู้ทดสอบซื้อแบบ sandbox ถ้าส่งเฉพาะ production บัญชีพวกนี้จะซิงก์คลาวด์ไม่ได้) · Events = ทั้งหมด · Apps = ทั้งหมด
  - **ทดสอบ:** กด **Send test event** → ต้องได้ HTTP 200 และ Supabase → Table Editor → `revenuecat_events` มีแถว `type = TEST` (ถ้าได้ 401 = secret ไม่ตรง; 500 `webhook secret is not configured` = ยังไม่ได้ตั้ง secret)
  - **ผลลัพธ์ →** webhook ทำงาน

- [ ] **63. (แนะนำ) Secret API key ให้ `delete-account` ลบข้อมูลลูกค้าใน RevenueCat**
  - **ทำไม:** เมื่อผู้ใช้ลบบัญชี ฟังก์ชันจะเรียก `DELETE https://api.revenuecat.com/v1/subscribers/{id}` เพื่อลบข้อมูลใน RevenueCat ด้วย (B12, B13) ถ้าไม่ตั้ง ฟังก์ชันข้ามขั้นนี้
  - **ที่ไหน:** RevenueCat → Project settings → API keys → **+ New secret API key** → ชื่อ `supabase-delete-account` → เลือกแบบที่ใช้กับ REST API **v1** ได้
  - **คำสั่ง:** `npx supabase secrets set REVENUECAT_SECRET_API_KEY=<RC_SECRET_KEY>` (ห้ามใส่คีย์นี้ใน `.env`)
  - **ผลลัพธ์ →** Supabase Edge Function secret

- [ ] **64. ตรวจครบวงจรด้วยการซื้อทดสอบ (ทดลอง → ซื้อขายผ่าน "Get lifetime")**
  - **ก. ซื้อทดลองครั้งแรก:** development build (ข้อ 39) + `.env` คีย์จริง → ตั้งบัญชี sandbox (ข้อ 68) หรือ license tester (ข้อ 69) → เปิดแอป → ตั้งค่าเริ่มต้น → Paywall ต้องแสดงราคาจากสโตร์ (บรรทัดยอดเรียกเก็บ `"7 days free, then {price}/month"` และปุ่มหลัก `"Start free trial, then {price}/month"` — หัวข้อ Paywall ปัจจุบันนำด้วยประโยชน์ เช่น `"Unlock your full training plan"` ไม่ใช่คำว่า "ฟรี"; ข้อความจริงอยู่ที่ `src/i18n/locales/en/paywall.ts`) → ล็อกอิน → ซื้อ
  - **ตรวจ:** RevenueCat → Customers → ค้นหา id ผู้ใช้ Supabase → entitlement `pro` active · Supabase → `user_entitlements` มีแถวของผู้ใช้ state = `TRIALING` · ในแอป หน้า Account → สถานะสมาชิกแสดงวันสิ้นสุดทดลอง และสถานะซิงก์ไม่ค้างที่ `"Waiting for your membership to be confirmed"` / `"รอยืนยันสถานะสมาชิก"`
  - **ข. เส้นทางอัปเกรด Settings → "Get lifetime" (SPEC J5):** ด้วยบัญชีเดิมที่เป็น `TRIALING` (หรือ `SUBSCRIBED_MONTHLY` / `BILLING_GRACE`) → แท็บ Settings → ส่วน Membership → แถว **"Get lifetime"** (`settings-lifetime`) ต้องเห็นเฉพาะสามสถานะนี้ (บัญชีที่ `LIFETIME`/`EXPIRED`/ไม่มีสิทธิ์ต้องไม่เห็นแถวนี้) → แตะแล้วต้องเปิด Paywall โหมดอัปเกรด (ปุ่มปิด ✕ แทนไอคอนตั้งค่า, หัวข้อ `"Keep Fitnese Pro forever"`, มีแผนซื้อขาดแผนเดียว, ไม่มีทดลองฟรี) พร้อมกล่องเตือนว่า **ซื้อขาดไม่ยกเลิกสมาชิกรายเดือน/ช่วงทดลองให้อัตโนมัติ** และปุ่ม `"Open subscription settings"` → ซื้อ → สถานะต้องเป็น `Lifetime` (Supabase `state = LIFETIME`) → กลับไป Settings ต้องมีคำเตือนว่ารายเดือนยังต่ออายุอยู่จนกว่าจะยกเลิกในสโตร์ รายละเอียดทุกขั้นดู `docs/TEST_PLAN.md` P-06
  - **ผลลัพธ์ →** ระบบสมาชิกทำงานครบทั้งสองเส้นทาง แล้วจดราคาที่ Paywall แสดงลงตารางข้อ 58

---

## ส่วน P — Build และ Submit ด้วย EAS

- [ ] **65. Preview build (ทดสอบภายในก่อนส่งสโตร์)**
  - **คำสั่ง:** `eas build --profile preview --platform android` (APK ติดตั้งตรง) และ `eas build --profile preview --platform ios` (internal distribution ไปยังเครื่องที่ลงทะเบียนในข้อ 39)
  - **ตรวจ:** โปรไฟล์ `preview` ใช้ EAS environment `preview` → ต้องเป็น `EXPO_PUBLIC_USE_MOCKS=0` และคีย์จริง (ข้อ 37)
  - **ผลลัพธ์ →** build ที่พฤติกรรมเหมือน release

- [ ] **66. Production build**
  - **คำสั่ง:** `eas build --profile production --platform all` (`autoIncrement` + `appVersionSource: remote` ใน `eas.json` ให้ EAS เพิ่ม build number ให้เอง ส่วน `version: '1.0.0'` ใน `app.config.ts` คือเวอร์ชันที่ผู้ใช้เห็น)
  - **ข้อควรรู้:** แอปไม่มี OTA update (ไม่มี `expo-updates`) ทุกการแก้โค้ดหรือแก้ค่า `EXPO_PUBLIC_*` ต้อง build และส่งใหม่
  - **ผลลัพธ์ →** `.ipa` และ `.aab`

- [ ] **67. Submit**
  - **คำสั่ง:**
    ```bash
    eas submit --platform ios --profile production --latest       # ต้องแก้ ascAppId ใน eas.json แล้ว (ข้อ 41)
    eas submit --platform android --profile production --latest   # ใช้ ./secrets/google-play-service-account.json (ข้อ 55)
    ```
  - **ผลลัพธ์ →** iOS ขึ้น TestFlight (รอ processing) · Android ขึ้น track `internal` แบบ `draft` (ตาม `eas.json`) ต้องเข้า Play Console กด rollout เอง และย้ายไป Closed testing / Production เมื่อพร้อม

---

## ส่วน Q — ทดสอบบนอุปกรณ์จริง (ทำตาม `docs/TEST_PLAN.md`)

- [ ] **68. Apple sandbox testers + TestFlight**
  - **ที่ไหน:** App Store Connect → Users and Access → **Sandbox** → Test Accounts → **+** (ใช้อีเมลที่ไม่เคยเป็น Apple ID; สร้างหลายบัญชีเพื่อทดสอบ "ลูกค้าใหม่" ซ้ำได้) · บน iPhone: Settings → App Store → Sandbox Account → ล็อกอินบัญชี sandbox · TestFlight: แอป → TestFlight → Internal Testing → เพิ่มผู้ทดสอบ
  - **ทดสอบ:** ทุกสถานะตาม SPEC N3 ใน `docs/TEST_PLAN.md` (เริ่มทดลอง, ทดลองหมดแล้วแปลงเป็นจ่าย, ยกเลิกระหว่างทดลอง, ซื้อขาด, **อัปเกรดจากรายเดือน/ทดลองเป็นซื้อขาดผ่านแถว "Get lifetime" (P-06)**, restore, เปลี่ยนเครื่อง, ลบบัญชี) — sandbox เร่งเวลาต่ออายุให้สั้นลงมาก
  - **ผลลัพธ์ →** ผลทดสอบ iOS บันทึกตาม `docs/TEST_PLAN.md`

- [ ] **69. Google Play license testers + internal testing**
  - **ที่ไหน:** Play Console → Settings (ระดับบัญชี ไม่ใช่ในแอป) → **License testing** → เพิ่มอีเมล Gmail ผู้ทดสอบ · License response = RESPOND_NORMALLY · ผู้ทดสอบต้องอยู่ในรายชื่อ Internal testing (ข้อ 49) กดลิงก์ opt-in แล้วติดตั้งจาก Play Store และใช้บัญชีนั้นเป็นบัญชีหลักของ Play Store ในเครื่อง
  - **ทดสอบ:** ชุดเดียวกับข้อ 68 (รวมเส้นทาง "Get lifetime") + grace period / account hold (Play Console มีตัวเลือกบัตรทดสอบที่ถูกปฏิเสธ)
  - **ผลลัพธ์ →** ผลทดสอบ Android บันทึกตาม `docs/TEST_PLAN.md`

- [ ] **70. ทดสอบซ้ำฝั่งเซิร์ฟเวอร์หลัง deploy**
  - **ทำไม:** `npm run supabase:verify` ใช้ตัวแทนของ Supabase อาจต่างจากของจริงเล็กน้อย (D41)
  - **ตรวจ:** ล็อกอิน 2 บัญชีบน 2 เครื่อง → ข้อมูลไม่ปนกัน · ปิดเน็ตแล้วบันทึกเซสชัน → เปิดเน็ตแล้วซิงก์ขึ้น · ลบบัญชี (ด้วยบัญชี Apple บน iPhone) → Supabase ไม่มีผู้ใช้และข้อมูลแล้ว และ log ของ `delete-account` ไม่มี error ตอนเพิกถอน Apple · ลบบัญชี Apple บน **Android** อีกบัญชี → ข้อมูลหายครบ แต่ **ไม่มีการเพิกถอนโทเค็น Apple** (เป็นข้อจำกัดที่ทราบ D40 — บันทึกผลตามจริงและตรวจว่าหน้า Privacy บอกผู้ใช้ให้ถอนเองที่ appleid.apple.com) · ดู Edge Functions → Logs ของทั้งสองฟังก์ชัน (`revenuecat-webhook`, `delete-account`)
  - **ผลลัพธ์ →** ผ่านตาม `docs/TEST_PLAN.md`

- [ ] **71. บัญชีทดสอบสำหรับผู้รีวิว (App Review / Play review)**
  - **ทำไม:** SPEC N1: ต้องมีบัญชีทดสอบให้ผู้รีวิว แอปล็อกอินด้วย Google/Apple เท่านั้น (ไม่มีอีเมล/รหัสผ่าน) จึงต้องให้บัญชี Google สำหรับรีวิว
  - **ใส่ค่า:** สร้างบัญชี Google ใหม่ที่ใช้สำหรับรีวิวเท่านั้น · ปิด 2-Step Verification และล็อกอินครั้งแรกบนเครื่องใหม่ให้ผ่านขั้นยืนยันก่อน (ลดโอกาสที่ Google ถามยืนยันตอนผู้รีวิวล็อกอิน) · เพิ่มบัญชีนี้เป็น License tester (ข้อ 69) เพื่อให้ผู้รีวิว Google ซื้อแบบทดสอบได้โดยไม่เสียเงิน · **อย่า** ซื้อหรือเริ่มทดลองด้วยบัญชีนี้ก่อนส่งรีวิว (ให้ผู้รีวิวเห็น flow ทดลองฟรีตั้งแต่ต้น) · ผู้รีวิวของ Apple ซื้อใน sandbox อัตโนมัติ และใช้ Sign in with Apple ด้วย Apple ID ของตัวเองได้ด้วย
  - **ผลลัพธ์ →** อีเมล/รหัสผ่านบัญชีรีวิว → App Store Connect (ข้อ 76) และ Play Console App access (ข้อ 76)

---

## ส่วน R — ฟอร์มของสโตร์

ตารางสรุปข้อมูลที่แอปเก็บจริง (จาก `src/legal/content.ts`, `docs/DATA_MODEL.md`) ใช้ตอบทั้ง App Privacy และ Data safety — แอปไม่มี SDK โฆษณา/analytics/crash reporting ไม่ติดตามข้ามแอป ไม่เก็บตำแหน่ง รูป วิดีโอ รายชื่อ หรือข้อมูลบัตร

> **ฉบับละเอียดและถือเป็นหลักเมื่อขัดกัน:** `store-metadata/privacy-labels.md` (คำตอบทีละช่อง Apple + Google และจุดที่ต้องตรวจในระบบจริง เช่น ชื่อ/รูปจาก Google ที่ Supabase อาจเก็บเอง) · `store-metadata/play-declarations.md` (Health apps, Target audience, Content rating, Ads, Account deletion, free trial offer) · `store-metadata/review-notes.md` (App Review Notes / App access)

| ข้อมูล | ตัวอย่างในแอป | Apple App Privacy | Google Data safety | วัตถุประสงค์ | บังคับ? |
|---|---|---|---|---|---|
| อีเมล | จาก Google/Apple (รวม private relay) | Contact Info → Email Address | Personal info → Email address | App functionality, Account management | บังคับ (ล็อกอิน) |
| User ID | id ผู้ใช้ Supabase (= app user id ของ RevenueCat) | Identifiers → User ID | Personal info → User IDs | App functionality, Account management | บังคับ |
| เพศ, อายุ | โปรไฟล์ (ข้ามได้) | Health & Fitness → Health (รวมกับค่าร่างกาย ตาม `privacy-labels.md` ข้อ 3.2 เพื่อให้ตรง manifest) | Personal info → Other info | App functionality (คำนวณ BMR) | ไม่บังคับ |
| ส่วนสูง, น้ำหนักตัว, แคลอรี่ที่กิน | โปรไฟล์, `daily_log` | Health & Fitness → Health | Health and fitness → Health info | App functionality | ไม่บังคับ |
| การฝึก, ระดับกิจกรรม, แคลอรี่ที่ใช้ | โปรแกรม, เซสชัน, เซ็ต | Health & Fitness → Fitness | Health and fitness → Fitness info | App functionality | ใช้เมื่อผู้ใช้บันทึก |
| ประวัติการซื้อ/สถานะสมาชิก | ผ่าน RevenueCat | Purchases → Purchase History | Financial info → Purchase history | App functionality | บังคับเมื่อซื้อ |

ทุกรายการ: เชื่อมโยงกับตัวตนผู้ใช้ (linked) · ไม่ใช้ติดตาม (no tracking) · ส่งผ่าน HTTPS · ลบได้ในแอป — ก่อนส่งให้ตรวจคู่มือ privacy/data disclosure ของ RevenueCat และ Supabase ว่ามีข้อมูลที่ SDK เก็บเพิ่มที่ต้องประกาศหรือไม่

- [ ] **72. App Store Connect → App Privacy (Privacy Nutrition Labels)**
  - **ที่ไหน:** แอป → **App Privacy** → Get Started → Data Collection = Yes → เลือกประเภทตามตารางด้านบน → แต่ละประเภท: ใช้เพื่อ App Functionality · Linked to the user = Yes · Used for tracking = No → Publish · Privacy Policy URL = `<PRIVACY_URL>`
  - **ให้ตรงกับ privacy manifest:** `app.config.ts` → `ios.privacyManifests` ตั้ง `NSPrivacyTracking: false` และ **ประกาศ (declared)** ประเภทข้อมูลที่เก็บ 6 ประเภท — อีเมล, User ID, Fitness, Health, Purchase History, Other Data (เพศ/อายุ) — ทุกประเภท linked = true, tracking = false, วัตถุประสงค์ App Functionality (รายละเอียดและ key ทีละตัวอยู่ใน `store-metadata/privacy-labels.md` ข้อ 3.5) ป้ายในสโตร์ต้องติ๊กชุดเดียวกันนี้พอดี (SPEC N1) · **ก่อนส่งรีวิว** เปิด `app.config.ts` ตรวจว่า `NSPrivacyCollectedDataTypes` มี 6 รายการจริง (`npx expo config --type introspect`) — ถ้าเห็น `[]` ห้ามส่ง · และตรวจ Privacy Report ของ archive (Xcode → Generate Privacy Report) เทียบกับ SDK ที่มี manifest ของตัวเอง
  - **ผลลัพธ์ →** ป้ายความเป็นส่วนตัวเผยแพร่แล้ว

- [ ] **73. Google Play → Data safety**
  - **คำตอบทีละช่อง:** `store-metadata/privacy-labels.md` ข้อ 4 (ต้องตรงกับป้าย Apple ในข้อ 72)
  - **ที่ไหน:** Play Console → Policy and programs → **App content** → Data safety
  - **ใส่ค่า:** Collects data = Yes · Shares data = **No** (Supabase/RevenueCat เป็นผู้ให้บริการที่ประมวลผลแทนเรา) · Encrypted in transit = Yes · Users can request deletion = Yes · ประเภทข้อมูลตามตารางด้านบน · **Delete account URL** = หน้าเว็บที่อธิบายวิธีลบบัญชีและให้ขอลบทางอีเมลได้โดยไม่ต้องติดตั้งแอป (ใช้หัวข้อการลบข้อมูลในหน้า Privacy จากข้อ 14 ได้ถ้าครบตามนี้)
  - **ผลลัพธ์ →** Data safety ส่งแล้ว

- [ ] **74. Google Play → Health apps declaration และ App content อื่นๆ**
  - **คำตอบทีละหัวข้อ:** `store-metadata/play-declarations.md`
  - **ที่ไหน:** App content → **Health apps** → เลือกหมวดที่ตรงกับแอป: Activity and fitness, Nutrition and weight management · ไม่ใช่อุปกรณ์การแพทย์ · ไม่ใช้ Health Connect (SPEC L ยังไม่เชื่อม)
  - **ส่วนอื่นใน App content:** Privacy policy = `<PRIVACY_URL>` · Ads = ไม่มีโฆษณา · App access = มีส่วนที่ต้องล็อกอิน → ใส่บัญชีจากข้อ 71 + วิธีใช้ (ข้อ 76) · Advertising ID = ไม่ใช้ (ถ้าคอนโซลแจ้งว่า manifest มีสิทธิ์ `com.google.android.gms.permission.AD_ID` ให้แจ้งผู้พัฒนา) · Target audience = ไม่เลือกกลุ่มอายุต่ำกว่า 13 ปี (เลี่ยงข้อกำหนด Families; แอปไม่แสดงเป้าลดน้ำหนักให้ผู้อายุต่ำกว่า 18 อยู่แล้ว — การเลือกช่วงอายุเป็นการตัดสินใจของเจ้าของ) · Government apps / Financial features / News = ไม่ใช่
  - **คำอธิบายในหน้าร้าน:** ต้องมีข้อความว่าแอปไม่ใช่อุปกรณ์การแพทย์และไม่วินิจฉัย/รักษาโรค (SPEC N2) — ใช้ข้อความจาก `store-metadata/listing.*.md`
  - **ผลลัพธ์ →** App content ทุกหัวข้อเป็นสีเขียว

- [ ] **75. Content rating / Age rating**
  - **คำตอบทีละข้อ:** `store-metadata/play-declarations.md` ข้อ 3
  - **Google Play:** App content → Content rating → Start questionnaire → อีเมลติดต่อ → หมวดแอปที่ไม่ใช่เกม → ตอบตามจริง: ไม่มีความรุนแรง เนื้อหาทางเพศ การพนัน ยาเสพติด ไม่มีการแชร์เนื้อหาระหว่างผู้ใช้ ไม่แชร์ตำแหน่ง มีการซื้อสินค้าดิจิทัล = ใช่
  - **App Store:** App Information → **Age Rating** → Edit → ตอบตามจริงแบบเดียวกัน ถ้ามีคำถามเรื่องข้อมูลทางการแพทย์หรือหัวข้อสุขภาพ/เวลเนส ให้ตอบตามจริง (แอปมีการคำนวณแคลอรี่/สารอาหารแบบประมาณพร้อมคำเตือน ไม่ใช่การรักษา) · Unrestricted web access = No (ลิงก์ภายนอกเปิดเฉพาะหน้าที่กำหนด)
  - **ผลลัพธ์ →** ได้เรตติ้ง (คาดว่าเป็นเรตสำหรับทุกวัย)

- [ ] **76. App Review Information / App access**
  - **App Store:** หน้าเวอร์ชัน → **App Review Information** → Sign-in required = Yes → User name/Password = บัญชี Google จากข้อ 71 → Notes = ข้อความ App Review Notes จาก `store-metadata/review-notes.md` (อธิบายว่าแอปทำงานแบบบัญชีผู้ใช้ ซิงก์ข้ามอุปกรณ์ สิทธิ์สมาชิกผูกกับบัญชี ต้องล็อกอินก่อนเริ่มทดลอง และใช้ Sign in with Apple ได้ — SPEC N1) + ช่องทางติดต่อ
  - **Google Play:** App content → **App access** → All or some functionality is restricted → Add instructions → ชื่อบัญชี/รหัสผ่านจากข้อ 71 + ขั้นตอนเดียวกัน (ข้อความสำเร็จรูปใน `store-metadata/review-notes.md` ข้อ 2) · placeholder ทั้งหมดใน `store-metadata/` (เช่น `<REVIEW_GOOGLE_EMAIL>`, `<DELETE_ACCOUNT_URL>`, `<CONTACT_EMAIL>`) ต้องแทนด้วยค่าจริงก่อนวาง — รายการรวมอยู่ใน `store-metadata/README.md` เมื่อไฟล์นั้นถูกเขียนเสร็จ
  - **ผลลัพธ์ →** ข้อมูลสำหรับผู้รีวิวครบ

- [ ] **77. ข้อความหน้าร้าน (ไทย + อังกฤษ)**
  - **ที่ไหน:** App Store Connect → หน้าเวอร์ชัน (Promotional Text, Description, Keywords, Support URL, Marketing URL) + App Information (Name, Subtitle) · Play Console → Grow users → Store presence → **Main store listing** (App name, Short description, Full description) + Store settings (Category = Health & Fitness, อีเมลติดต่อ)
  - **ใส่ค่า:** คัดลอกจาก `store-metadata/listing.th.md` และ `store-metadata/listing.en.md` (คัดลอกเฉพาะข้อความในกล่องโค้ด แล้วแทน placeholder ในวงเล็บมุมให้ครบ) ตามชื่อที่เลือกในข้อ 1 (ต้องมี disclaimer "ไม่ใช่คำแนะนำทางการแพทย์" ในคำอธิบาย — SPEC N1/N2) · Support URL ต้องเป็นหน้าเว็บที่ติดต่อคุณได้
  - **ผลลัพธ์ →** หน้าร้านทั้งสองภาษา

- [ ] **78. ไอคอนหน้าร้าน Google Play และ feature graphic**
  - **คำสั่ง:** `python3 -c "from PIL import Image; Image.open('assets/icon.png').resize((512, 512), Image.LANCZOS).save('play-icon-512.png')"` → อัปโหลดเป็น App icon (512×512) แล้วลบไฟล์ออกจาก repo
  - **ใส่ค่า:** Feature graphic 1024×500 ต้องออกแบบเอง (brief ใน `store-metadata/screenshots.md` ข้อ 5) (ใช้ภาษาภาพ DS: พื้นดำ แสงเรืองสีหลัก) — App Store ใช้ `assets/icon.png` จาก build อัตโนมัติ
  - **ผลลัพธ์ →** กราฟิกหน้าร้าน Play ครบ

- [ ] **79. ภาพหน้าจอสโตร์**
  - **ทำไม:** ภาพใน `docs/screenshots/` มาจากพรีวิวเว็บ (D43) ฟอนต์/สัดส่วนต่างจากเครื่องจริง ใช้เป็นแนวทางเท่านั้น ห้ามส่งสโตร์
  - **ที่ไหน/คำสั่ง:** ใช้ไอเดียภาพ 5 รูปใน `store-metadata/screenshots.md` (ธีมตามหมวด DS ทั้งไทยและอังกฤษ พร้อมขนาดที่สโตร์ต้องการ) ถ่ายจาก build จริง:
    - iOS Simulator (build `development-simulator`) ขนาด iPhone 6.9 นิ้ว (เช่น iPhone 16 Pro Max) → `xcrun simctl io booted screenshot shot.png` — แอปตั้ง `supportsTablet: false` จึงไม่ต้องมีภาพ iPad
    - Android emulator/เครื่องจริง → `adb exec-out screencap -p > shot.png` (ตามขนาด/อัตราส่วนที่ Play Console แจ้งในหน้าอัปโหลด อย่างน้อย 2 ภาพ)
    - จะใช้โหมด mock เพื่อจัดฉากข้อมูลก็ได้ (`.env`: `EXPO_PUBLIC_USE_MOCKS=1`, `EXPO_PUBLIC_MOCK_SCENARIO=lifetime` แล้ว `npm start`) แต่ภาพ Paywall ต้องถ่ายจากโหมดจริง เพราะราคาในโหมด mock (฿19.00 / ฿99.00) อาจไม่ตรงกับราคาที่ตั้งจริงในข้อ 58
  - **ผลลัพธ์ →** ภาพหน้าจอ 2 ภาษาอัปโหลดทั้งสองสโตร์

---

## ส่วน S — ส่งรีวิวและเช็กลิสต์สุดท้าย

- [ ] **80. ไล่เช็กลิสต์ก่อนส่ง**
  - **ที่ไหน:** `docs/RELEASE_CHECKLIST.md` — ทำครบทุกข้อ และตรวจว่าตารางในข้อ 58 กรอกครบแล้ว
  - **ตรวจซ้ำสั้นๆ:** EAS production env มี `EXPO_PUBLIC_USE_MOCKS=0` · `npm run check` ผ่าน และ `RELEASE=1 npm test` ผ่าน (ยืนยันว่าไม่เหลือ placeholder กฎหมาย — ข้อ 12; ป้ายเทมเพลตในหน้ากฎหมายต้องหายเองแล้ว) · ทุก migration ใน `supabase/migrations/` ถูก push แล้ว (ข้อ 17) และทั้งสองฟังก์ชัน deploy แล้ว (ข้อ 18) · ทดลองฟรีและราคาบน Paywall ตรงกับที่ตั้งในสโตร์ · เส้นทาง "Get lifetime" ผ่าน (ข้อ 64) · privacy manifest ประกาศ 6 ประเภทข้อมูลตรงกับป้ายสโตร์ (ข้อ 72) · ปุ่ม Restore / จัดการสมาชิก / Privacy / Terms / แหล่งอ้างอิง / ลบบัญชี ใช้ได้
  - **ผลลัพธ์ →** พร้อมส่ง

- [ ] **81. ส่งรีวิว**
  - **App Store:** หน้าเวอร์ชัน → Build = build จากข้อ 67 → ส่วน **In-App Purchases and Subscriptions** → เลือก `fitnese_monthly` และ `fitnese_lifetime` (สินค้าชุดแรกต้องส่งพร้อมเวอร์ชันแอป) → Add for Review → Submit
  - **Google Play:** โปรโมต release ไป Closed testing (ถ้าบัญชีต้องผ่านเงื่อนไขข้อ 6) แล้วไป **Production** → Send for review
  - **ผลลัพธ์ →** สถานะ Waiting for Review / In review

---

## ส่วน T — งานประจำหลังเปิดตัว

- [ ] **82. ต่ออายุ Apple OAuth client secret ก่อนหมดอายุ (ทุก ≤ 6 เดือน)** — ทำข้อ 27 ใหม่แล้ววางใน Supabase (ข้อ 28) ถ้าลืม Sign in with Apple บน Android จะใช้ไม่ได้ทันที (iOS ไม่กระทบ)
- [ ] **83. ต่ออายุ Apple Developer Program รายปี** — ถ้าหมด แอปจะถูกถอดจาก App Store
- [ ] **84. เฝ้าดูการทำงานของเซิร์ฟเวอร์** — RevenueCat → Integrations → Webhooks (ดูการส่งที่ล้มเหลว), Supabase → Edge Functions → Logs, Supabase → Authentication → Users ถ้า webhook ล้ม การซิงก์ของผู้ใช้จะค้างที่ "รอยืนยันสถานะสมาชิก" (`Waiting for your membership to be confirmed`, D39) แต่ข้อมูลในเครื่องไม่หาย
- [ ] **85. เมื่อผู้พัฒนาแก้โค้ดฝั่งเซิร์ฟเวอร์** — migration ใหม่ใน `supabase/migrations/` (ไฟล์ใหม่ทุกไฟล์ต้อง push — ข้อ 17) → `npm run supabase:verify` แล้ว `npx supabase db push` · แก้ `supabase/functions/*` หรือ `src/domain/entitlement/machine.ts` (ผู้พัฒนารัน `node scripts/sync-shared.js` แล้ว) → deploy ฟังก์ชันใหม่ตามคำสั่งในข้อ 18 · แก้ JS/ค่า `EXPO_PUBLIC_*` → build และ submit ใหม่ (ข้อ 66–67)

---

## สิ่งที่โค้ดทำให้แล้ว ไม่ต้องทำเอง

- **ลำดับซื้อที่ถูกต้อง (B4):** บังคับล็อกอินก่อนซื้อ 2 ชั้น (`assertCanPurchase`), เรียก `Purchases.logIn(<id ผู้ใช้ Supabase>)` ให้เอง, หลังล็อกอินกลับ Paywall พร้อมแพ็กเกจเดิม (D05), Restore ต้องล็อกอินก่อน (D04)
- **Paywall ตามกฎสโตร์ (B5–B6, J2):** หัวข้อนำด้วยประโยชน์ของแอป (ไม่ใช้คำว่า "ฟรี" เป็นหัวข้อ) ยอดที่เรียกเก็บจริงเด่นเหนือปุ่มซื้อ ("Start free trial, then {price}/month"), แสดงราคาจากสโตร์ผ่าน RevenueCat ไม่ฮาร์ดโค้ด, เส้นทางอัปเกรดเป็นซื้อขาดจาก Settings ("Get lifetime") พร้อมคำเตือนว่าไม่ยกเลิกรายเดือนให้, ตรวจ eligibility ทดลองฟรีก่อนโฆษณา, ข้อความต่ออายุอัตโนมัติ/ยกเลิก/ซื้อขาดไม่มีทดลอง, ลิงก์จัดการสมาชิกของทั้งสองสโตร์ (`STORE_SUBSCRIPTION_URLS`)
- **สถานะสิทธิ์ (B8–B9):** state machine ตัวเดียวทั้งแอปและ webhook (`src/domain/entitlement/machine.ts` + สำเนา `supabase/functions/_shared/entitlement-machine.ts`), แคชออฟไลน์ + ผ่อนผัน 48 ชม. (D06), ไม่มีตัวนับทดลองในแอป
- **ฝั่งเซิร์ฟเวอร์:** SQL migration + RLS + last-write-wins + จำกัดซิงก์ด้วย `has_sync_access` (ตรวจด้วย `npm run supabase:verify`), webhook ตรวจ Authorization / กันเหตุการณ์ซ้ำ / ข้ามเหตุการณ์เก่า / รองรับ TRANSFER, `delete-account` เพิกถอนโทเค็น Apple (เฉพาะลบจาก iPhone/iPad — Apple บน Android ทำไม่ได้ D40) + ลบลูกค้า RevenueCat (ถ้ามีคีย์) + ลบข้อมูลทุกตารางแบบ cascade, `supabase/config.toml` ตั้ง `verify_jwt` ของทั้งสองฟังก์ชันไว้แล้ว (`revenuecat-webhook` = false, `delete-account` = true)
- **Native config ใน `app.config.ts`:** bundle id/package จาก `APP_BUNDLE_ID`, Sign in with Apple capability (`usesAppleSignIn`), URL scheme ของ Google, `scheme: 'fitnese'` สำหรับ redirect, `ITSAppUsesNonExemptEncryption: false` (ไม่ต้องตอบ export compliance), privacy manifest แบบไม่ติดตามและประกาศประเภทข้อมูลที่เก็บ (ตรวจในข้อ 72 ว่ารวมแล้ว), ตัดสิทธิ์ Android ที่ไม่ใช้, ไม่ขอ Face ID (D46), ชื่อแอปแยกภาษาไทย/อังกฤษ
- **โหมด mock:** รันและทดสอบได้ครบโดยไม่มีคีย์ (`EXPO_PUBLIC_USE_MOCKS=1` + `EXPO_PUBLIC_MOCK_SCENARIO`) และ release build จะไม่แอบใช้ mock เมื่อคีย์ขาด
- **เนื้อหาและคุณภาพ:** i18n ไทย/อังกฤษครบ, contrast WCAG AA ทุกสีหลัก (`npm run contrast`), ปุ่ม ≥ 48, เทมเพลต Privacy/Terms + หน้าแหล่งอ้างอิง (H6) + สคริปต์ `npm run legal:export`, ไอคอน/splash (`scripts/generate-icons.py`), โปรไฟล์ build `development` / `development-simulator` / `preview` / `production` ใน `eas.json`
- **เทสต์อัตโนมัติ:** `npm run check` = typecheck + lint + jest (จำนวนชุด/ข้อดูที่บรรทัดสุดท้ายของผลลัพธ์) ครอบคลุมสูตร, state machine ทุกสถานะ, Paywall, ลำดับบัญชี, ซิงก์, webhook, ลบบัญชี, schema ตรงกันระหว่างเครื่องกับคลาวด์
