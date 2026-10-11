# ป้ายความเป็นส่วนตัว: App Store Privacy Nutrition Label + Google Play Data safety

> คำตอบในไฟล์นี้ตรวจจากโค้ดที่ commit `88bfff2` (รายการไฟล์ในข้อ 1) และตรงกับ **privacy manifest ของ iOS ใน `app.config.ts`** (`COLLECTED_DATA_TYPES`) ซึ่งประกาศข้อมูล 6 ประเภท: Email Address, User ID, Health (ส่วนสูง น้ำหนักตัว แคลอรี่ที่กิน), Fitness, Purchase History และ Other Data Types (เพศ อายุ) — ทุกประเภทเชื่อมกับตัวผู้ใช้ (`Linked: true`) ไม่ใช้ติดตาม (`Tracking: false`) วัตถุประสงค์ App Functionality อย่างเดียว (SPEC N1, N2, B13)
>
> **สถานะที่ตรวจล่าสุด:** manifest ในโค้ดตรงกับตารางข้อ 3.2 แล้ว (6 ประเภท, `NSPrivacyTracking: false`, `NSPrivacyTrackingDomains: []`) ยังต้องตรวจซ้ำกับ build ที่จะส่งด้วย `npx expo config --type introspect | grep -A60 privacyManifests` และกรอกป้ายใน App Store Connect ให้ตรง (ดู [docs/RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md) หัวข้อ 8)
>
> ไฟล์นี้ละเอียดกว่าและ **ใช้แทนตารางในหัวข้อ "ส่วน R" ของ [HUMAN_TASKS.md](../docs/HUMAN_TASKS.md)** ในจุดที่ต่างกัน (เพศ/อายุ ฝั่ง Apple อยู่ใน Other Data Types — ดูข้อ 3.2)
>
> ชื่อเมนูและตัวเลือกในคอนโซลเขียนเป็นภาษาอังกฤษตามที่คอนโซลแสดง เพื่อให้หาเจอง่าย ชื่อเมนูอาจเปลี่ยนเล็กน้อยตามเวลา

## 1. แอปเก็บและส่งข้อมูลอะไรจริง (ตรวจจากโค้ด)

**หลักการ:** ข้อมูลที่อยู่ในเครื่องอย่างเดียวไม่นับว่า "เก็บ" (collect) ตามนิยามของทั้ง Apple และ Google — นับเฉพาะข้อมูลที่ส่งออกจากเครื่องไปที่เรา (Supabase) หรือผู้ให้บริการของเรา (RevenueCat)

| ข้อมูล | ส่งไปไหน | ที่มาในโค้ด |
|---|---|---|
| อีเมล (รวมอีเมลซ่อนของ Apple) และ id ผู้ใช้ | Supabase Auth ตอนล็อกอิน | `src/services/auth/supabaseAuth.ts` — Apple ขอเฉพาะ scope `EMAIL` (ไม่ขอชื่อ), Google ใช้ ID token แลกเซสชัน (`signInWithIdToken`) |
| id ผู้ใช้ (= app user id ของ RevenueCat) + ประวัติการซื้อ/สถานะสมาชิก | RevenueCat (และ App Store / Google Play ที่ดำเนินการชำระเงินเอง) | `src/services/purchases/revenueCat.ts` เรียกเฉพาะ `configure`, `logIn`, `logOut`, `getOfferings`, `checkTrialOrIntroductoryPriceEligibility`, `purchasePackage`, `restorePurchases`, `getCustomerInfo` และ listener ของ customerInfo — **ไม่มี** `setEmail`/`setAttributes`/`collectDeviceIdentifiers` |
| สถานะสิทธิ์ (state, product_id, period_type, วันหมดอายุ, will_renew, billing issue) | ตาราง `user_entitlements` บน Supabase (webhook ของ RevenueCat เขียน) | `supabase/migrations/20261009000000_init.sql`, `supabase/functions/revenuecat-webhook/` |
| บันทึกกันเหตุการณ์ webhook ซ้ำ (id เหตุการณ์, ชนิด, app_user_id, เวลา) — ไม่เก็บ payload เต็ม | ตาราง `revenuecat_events` — ลบทันทีเมื่อลบบัญชี และ **ลบแถวที่เก่ากว่า 90 วันอัตโนมัติ**: ฟังก์ชัน SQL `public.purge_revenuecat_events` (migration `20261011000000_revenuecat_events_retention.sql`) ที่ Edge Function `revenuecat-webhook` เรียกหลังบันทึกเหตุการณ์ทุกครั้ง (`EVENT_RETENTION_DAYS = 90`; ถ้าไม่มี webhook เข้ามาเลย แถวเก่าจะไม่ถูกลบจนกว่าจะมีทราฟฟิกหรือเปิด pg_cron ตามคอมเมนต์ใน migration) | `supabase/migrations/20261009000000_init.sql`, `supabase/migrations/20261011000000_revenuecat_events_retention.sql`, `supabase/functions/revenuecat-webhook/`, `supabase/functions/delete-account/index.ts` |
| โปรไฟล์: เพศ, อายุ (ตัวเลข ไม่เก็บวันเกิด D16), ส่วนสูง, น้ำหนัก, ระดับกิจกรรม, เป้าหมาย, หน่วย, ค่าตั้งเป้า (% / โปรตีน / MET), ตั้งค่าตัวจับเวลาพัก | ตาราง `profile` (ซิงก์) | `src/db/schema.ts` |
| การฝึก: โปรแกรม, routine, ท่าที่สร้างเอง (ชื่อ/กล้ามเนื้อ/อุปกรณ์/โน้ต), ตารางสัปดาห์, override รายวัน, เซสชัน (วันที่ เวลา ความหนัก แคลอรี่ น้ำหนักตัว ณ วันนั้น), เซ็ต (น้ำหนัก ครั้ง เสร็จหรือไม่), คำแนะนำ progression | ตาราง `custom_exercise`, `program`, `routine`, `routine_exercise`, `week_plan`, `day_override`, `workout_session`, `session_exercise`, `session_set` (ซิงก์) | `src/db/schema.ts` → `SYNCED_TABLES` |
| บันทึกรายวัน: แคลอรี่ที่ใช้ (กรอกเอง), แคลอรี่ที่กิน, น้ำหนักตัว | ตาราง `daily_log` (ซิงก์) | `src/db/schema.ts` |

**ไม่ส่งออกจากเครื่อง (จึงไม่ต้องประกาศ):** `app_settings` (ภาษา ธีม สีหลัก ผู้ใช้ล่าสุดที่จำไว้), `onboarding_draft` (คำตอบตั้งค่าเริ่มต้นก่อนล็อกอิน — ย้ายเข้าบัญชีเมื่อมีสิทธิ์ แล้วจึงซิงก์ในรูปตารางด้านบน), `entitlement_cache`, `sync_state`, `sync_outbox`, โทเค็นล็อกอินใน SecureStore

**ไม่มีในแอป:** SDK โฆษณา, analytics, crash reporting, attribution — ตรวจแล้วใน `package.json` (ไม่มี sentry/firebase/amplitude/mixpanel/segment/appsflyer/adjust/admob/facebook ฯลฯ) · ไม่ใช้ตำแหน่ง กล้อง รูป ไมค์ รายชื่อ (Android ตัดสิทธิ์ที่ไม่ใช้ด้วย `blockedPermissions`) · ไม่ใช้ HealthKit / Health Connect (SPEC L) · ไม่ขอ IDFA จึงไม่มีหน้าขอ App Tracking Transparency

**การส่งข้อมูล:** Supabase และ RevenueCat ใช้ HTTPS ทั้งหมด → เข้ารหัสระหว่างส่ง (encrypted in transit) = ใช่ · ฝั่งคลาวด์เปิด RLS ให้แต่ละบัญชีอ่านได้เฉพาะข้อมูลของตัวเอง

**การลบ:** ในแอป แท็บตั้งค่า → ส่วน "บัญชี" → ลบบัญชีและข้อมูล (และจากไอคอนเฟืองบน Paywall → "บัญชีและการตั้งค่า" → ส่วน "ข้อมูล" → ลบบัญชีและข้อมูล ซึ่งเข้าได้แม้ไม่มีสิทธิ์) → Edge Function `delete-account` ลบผู้ใช้ใน Supabase (ทุกตารางลบตามแบบ cascade), ลบ `revenuecat_events` ของผู้ใช้, ลบลูกค้าใน RevenueCat (ถ้าตั้ง `REVENUECAT_SECRET_API_KEY` — HUMAN_TASKS ข้อ 63), เพิกถอนโทเค็น Sign in with Apple (เมื่อลบจาก iPhone/iPad) และลบข้อมูลในเครื่อง (D52) — หมายเหตุ: การ **ล็อกเอาต์** ไม่ลบข้อมูลในเครื่อง (D12)

## 2. [ต้องตัดสินใจก่อนส่ง] จุดที่ต้องตรวจในระบบจริง

1. **ชื่อและรูปโปรไฟล์จาก Google ที่ Supabase อาจเก็บเอง**
   - แอปไม่ขอและไม่ใช้ชื่อ แต่ ID token ของ Google ปกติมี claim `name` และ `picture` และ Supabase Auth มักคัดลอก claim ของผู้ให้บริการไปเก็บใน `auth.users.raw_user_meta_data` / `auth.identities.identity_data` เองโดยอัตโนมัติ
   - Apple บน iPhone/iPad: แอปขอเฉพาะ scope `EMAIL` (`src/services/auth/supabaseAuth.ts` บรรทัด `requestedScopes`) จึงไม่ได้ชื่อ — แต่ **Apple บน Android ใช้ OAuth บนเว็บของ Supabase** (`signInWithAppleWeb` เรียก `signInWithOAuth({ provider: 'apple' })` โดยไม่ระบุ `scopes`) ซึ่งตามค่าเริ่มต้นของ Supabase อาจขอ scope `name email` ทำให้ Apple ส่งชื่อมาในการล็อกอินครั้งแรก — **ต้องตรวจในระบบจริงด้วยบัญชี Apple บน Android** และถ้าพบชื่อ ให้ผู้พัฒนาเพิ่ม `scopes: 'email'` ใน `signInWithOAuth` (ทางเลือก A)
   - **ตรวจ:** Supabase Dashboard → Authentication → Users → เปิดผู้ใช้ที่ล็อกอินด้วย Google → ดู Raw user meta data (ต้องตรวจในระบบจริง)
   - **ถ้าพบชื่อ/รูป:** เลือกทางใดทางหนึ่ง (A) ให้ผู้พัฒนาตัดค่าเหล่านี้ทิ้งฝั่งเซิร์ฟเวอร์ (ตรงหลักข้อมูลขั้นต่ำ B13 — ไม่ต้องแก้ป้าย) หรือ (B) ประกาศเพิ่ม: Apple = Contact Info → **Name** (App Functionality, Linked, ไม่ติดตาม) และให้ผู้พัฒนาเพิ่ม `NSPrivacyCollectedDataTypeName` ใน manifest ให้ตรงกัน, Google = Personal info → **Name** — **ห้ามปล่อยให้ป้ายกับข้อมูลจริงไม่ตรงกัน**
2. **วัตถุประสงค์ของ Purchase History:** คำตอบด้านล่างคือ App Functionality อย่างเดียว ถ้าเจ้าของจะใช้แดชบอร์ด/Charts ของ RevenueCat วิเคราะห์ยอดขายหรืออัตราแปลงจากทดลองเป็นจ่าย ให้พิจารณาเพิ่ม **Analytics** (Apple) / **Analytics** (Google) และแจ้งผู้พัฒนาให้เพิ่ม purpose เดียวกันใน manifest
3. **ตรวจ manifest รวมของทั้งแอปก่อนส่ง:** ใน Xcode เปิด archive ของ build production → คลิกขวา → **Generate Privacy Report** แล้วเทียบกับข้อ 3 — SDK ที่มี manifest ของตัวเอง (เช่น RevenueCat, Google Sign-In) อาจประกาศประเภทข้อมูล/วัตถุประสงค์เพิ่ม ถ้ามี ให้ปรับป้ายให้ครอบคลุม และอ่านหน้า privacy/data disclosure ของ RevenueCat และ Supabase ประกอบ
4. **IP address:** เซิร์ฟเวอร์ของ Supabase/RevenueCat เห็น IP ของคำขอตามปกติของการเชื่อมต่อเครือข่าย (เช่น ใน log) แอปไม่ได้ใช้ IP หาตำแหน่ง จึงไม่ได้ประกาศเป็น Location — ถ้าคู่มือของผู้ให้บริการแนะนำต่างจากนี้ ให้ทำตามคู่มือ

5. **[จุดเปิด — ข้อความกฎหมายในแอป] การลบ `revenuecat_events` เก่า 90 วัน:** โค้ดลบแถวเก่ากว่า 90 วันจริง (ดูข้อ 1) แต่หัวข้อ "การเก็บรักษาและการลบข้อมูล" / "Retention and deletion" ใน `src/legal/content.ts` ยังเขียนแค่ว่า "เก็บข้อมูลไว้ตราบที่คุณยังมีบัญชี" และไม่พูดถึงบันทึก webhook ที่ลบเองเมื่อเก่ากว่า 90 วัน — **ไม่ขัดแย้งกัน** (เก็บสั้นกว่าที่บอกไว้) และบันทึกนี้ไม่มีข้อมูลสุขภาพ จึงไม่ถึงขั้นทำให้ป้ายผิด แต่ถ้าเจ้าของอยากให้นโยบายตรงตามจริงทุกประการ ให้ผู้พัฒนาเพิ่มประโยคเดียว (เอกสารนี้ไม่แก้โค้ด) และแก้ไทย/อังกฤษให้ตรงกัน
6. **ยืนยันเรื่องเพศ/อายุ:** manifest ประกาศเป็น Other Data Types (ไม่ใช่ Health) ตามโค้ด `COLLECTED_DATA_TYPES` ถ้าเจ้าของจะจัดไว้ใน Health แทน ต้องแก้ทั้ง manifest และป้ายพร้อมกัน

## 3. App Store Connect → App Privacy (Privacy Nutrition Label)

ที่ไหน: App Store Connect → แอป → **App Privacy** → Get Started / Edit (HUMAN_TASKS ข้อ 72) · Privacy Policy URL = `<PRIVACY_URL>`

### 3.1 คำถามแรก
- **Do you or your third-party partners collect data from this app?** → **Yes, we collect data from this app**

### 3.2 ประเภทข้อมูลที่ติ๊ก (ต้องตรงกับ manifest 6 ประเภท)

| หมวดในคอนโซล | ประเภท | ข้อมูลในแอป | manifest key |
|---|---|---|---|
| Contact Info | **Email Address** | อีเมลจาก Google/Apple (รวม private relay) | `NSPrivacyCollectedDataTypeEmailAddress` |
| Health & Fitness | **Health** | ค่าร่างกายที่ผู้ใช้กรอก: ส่วนสูง, น้ำหนักตัว, แคลอรี่ที่กิน (และค่าตั้งเป้าโภชนาการที่คำนวณจากค่าเหล่านี้) | `NSPrivacyCollectedDataTypeHealth` |
| Health & Fitness | **Fitness** | โปรแกรม routine ท่า เซ็ต น้ำหนักที่ยก ครั้ง เวลาฝึก ความหนัก ระดับกิจกรรม แคลอรี่ที่ใช้ | `NSPrivacyCollectedDataTypeFitness` |
| Purchases | **Purchase History** | สถานะทดลอง/รายเดือน/ซื้อขาด และวันหมดอายุ ผ่าน RevenueCat | `NSPrivacyCollectedDataTypePurchaseHistory` |
| Identifiers | **User ID** | id ผู้ใช้ Supabase ซึ่งใช้เป็น app user id ของ RevenueCat ด้วย | `NSPrivacyCollectedDataTypeUserID` |
| Other Data | **Other Data Types** | เพศ, อายุ (ตัวเลข ไม่บังคับ ข้ามได้) | `NSPrivacyCollectedDataTypeOtherDataTypes` |

**เรื่องเพศและอายุ:** `app.config.ts` ประกาศเป็น `NSPrivacyCollectedDataTypeOtherDataTypes` (comment ในโค้ด: "เพศ อายุ (ไม่บังคับ)") ตรงกับตาราง R เดิมของ [HUMAN_TASKS.md](../docs/HUMAN_TASKS.md) ที่จัดเป็น Other Data — ใน App Store Connect จึงติ๊ก **Other Data Types** สำหรับเพศ/อายุ และไม่ใส่สองค่านี้ใน Health ถ้าเจ้าของอยากเปลี่ยนไปอยู่ใน Health ต้องให้ผู้พัฒนาแก้ manifest ด้วย ให้สองที่ตรงกันเสมอ

**ไม่ติ๊ก:** Name (ดูข้อ 2.1), Phone Number, Physical Address, Other User Contact Info, Sensitive Info, Financial Info (Payment Info, Credit Info, Other Financial Info — การชำระเงินทำโดย Apple), Location (Precise/Coarse), Contacts, User Content (ทุกข้อ — ชื่อ routine/โน้ตท่าเป็นส่วนหนึ่งของข้อมูล Fitness), Browsing History, Search History (ค้นหาท่าทำในเครื่อง), Device ID, Usage Data (Product Interaction, Advertising Data, Other Usage Data), Diagnostics (Crash Data, Performance Data, Other Diagnostic Data), Surroundings, Body (Hands/Head)

### 3.3 คำตอบของแต่ละประเภท (เหมือนกันทั้ง 6 ประเภท)

| คำถามในคอนโซล | คำตอบ |
|---|---|
| How is this data used? (purposes) | ติ๊ก **App Functionality** เท่านั้น — ไม่ติ๊ก Third-Party Advertising, Developer's Advertising or Marketing, Analytics (ดูข้อ 2.2), Product Personalization, Other Purposes |
| Is this data linked to the user's identity? | **Yes** |
| Is this data used for tracking purposes? | **No** |

### 3.4 ผลที่หน้าร้านจะแสดง
- **Data Used to Track You:** ไม่มี
- **Data Linked to You:** Contact Info (Email Address), Health & Fitness (Health, Fitness), Purchases (Purchase History), Identifiers (User ID), Other Data (Other Data Types)
- **Data Not Linked to You:** ไม่มี

### 3.5 Privacy manifest ที่ต้องตรงกัน (`app.config.ts` → `ios.privacyManifests` — ตรงกับตาราง 3.2 แล้วที่ commit `88bfff2`)

| ค่า | ในโค้ดตอนนี้ |
|---|---|
| `NSPrivacyTracking` | `false` |
| `NSPrivacyTrackingDomains` | `[]` |
| `NSPrivacyCollectedDataTypes` | 6 รายการตามตาราง 3.2 (Email Address, User ID, Health, Fitness, Purchase History, Other Data Types) แต่ละรายการ `NSPrivacyCollectedDataTypeLinked: true`, `NSPrivacyCollectedDataTypeTracking: false`, `NSPrivacyCollectedDataTypePurposes: [NSPrivacyCollectedDataTypePurposeAppFunctionality]` |
| `NSPrivacyAccessedAPITypes` | `[]` (manifest ของ React Native / Expo / SDK รวมเข้า build เอง — ดูข้อ 2.3 ว่าตรวจอย่างไร) |

ถ้าแก้ประเภทข้อมูลที่แอปเก็บ ให้แก้ `COLLECTED_DATA_TYPES` ใน `app.config.ts`, ตารางข้อ 3.2 และป้ายใน App Store Connect พร้อมกัน — ป้ายใน App Store Connect, manifest ของแอป, Data safety และ Privacy Policy ในแอปต้องตรงกันทั้งสี่ที่

## 4. Google Play Console → App content → Data safety

ที่ไหน: Play Console → Policy and programs → **App content** → **Data safety** → Manage (HUMAN_TASKS ข้อ 73)

### 4.1 Data collection and security

| คำถาม | คำตอบ |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Which of the following methods of account creation does your app support? | **OAuth** (Sign in with Google / Sign in with Apple) |
| Delete account URL (ลิงก์ให้ผู้ใช้ขอลบบัญชีและข้อมูลได้โดยไม่ต้องติดตั้งแอป) | `<DELETE_ACCOUNT_URL>` — หน้าเว็บที่บอกวิธีลบในแอป (ตั้งค่า → บัญชี → ลบบัญชีและข้อมูล) และให้ขอลบทางอีเมล `<CONTACT_EMAIL>` ได้ ใช้หัวข้อการลบในหน้า Privacy ได้ถ้ามีครบ (HUMAN_TASKS ข้อ 14) |
| Do you provide a way for users to request that some or all of their data is deleted, without requiring them to delete their account? | ไม่บังคับ — ตอบ **No** ได้ (ผู้ใช้ลบเซสชัน/โปรแกรมทีละรายการในแอปได้อยู่แล้ว แต่การขอลบบางส่วนผ่านช่องทางติดต่อเป็นภาระที่เจ้าของต้องรับ ถ้าจะตอบ Yes ต้องพร้อมทำจริง) |

### 4.2 Data types — ติ๊กเฉพาะตามตารางนี้

| หมวด | ประเภท | ข้อมูลในแอป | Collected | Shared | Processed ephemerally? | Required or optional | Purposes |
|---|---|---|---|---|---|---|---|
| Personal info | **Email address** | อีเมลจาก Google/Apple | Yes | **No** | No | Required | App functionality, Account management |
| Personal info | **User IDs** | id ผู้ใช้ Supabase / app user id ของ RevenueCat | Yes | **No** | No | Required | App functionality, Account management |
| Personal info | **Other info** | เพศ, อายุ (โปรไฟล์ ข้ามได้) | Yes | **No** | No | Optional | App functionality |
| Health and fitness | **Health info** | ส่วนสูง, น้ำหนักตัว, แคลอรี่ที่กิน, ค่าตั้งเป้าโภชนาการ | Yes | **No** | No | Optional | App functionality |
| Health and fitness | **Fitness info** | การฝึก เซ็ต น้ำหนักที่ยก ครั้ง ระดับกิจกรรม แคลอรี่ที่ใช้ | Yes | **No** | No | Required | App functionality |
| Financial info | **Purchase history** | สถานะทดลอง/รายเดือน/ซื้อขาด ผ่าน RevenueCat | Yes | **No** | No | Required | App functionality |

- **Shared = No ทุกข้อ:** Supabase และ RevenueCat เป็นผู้ให้บริการที่ประมวลผลแทนเรา ซึ่ง Google ไม่นับเป็นการ "share"
- **เพศ/อายุ ฝั่ง Google** ใส่ใน Personal info → Other info (ตรงกับตัวอย่างของ Google เรื่องเพศ/วันเกิด) ส่วนฝั่ง Apple อยู่ใน Other Data Types ตามข้อ 3.2 — สองสโตร์มีหมวดต่างกัน จึงไม่ต้องเหมือนกัน
- ถ้าข้อ 2.1 พบชื่อจาก Google และเลือกทาง (B) ให้ติ๊ก Personal info → **Name** เพิ่ม (Required, App functionality / Account management)
- ถ้าข้อ 2.2 เพิ่ม Analytics ให้ติ๊ก Analytics เพิ่มที่ Purchase history

**ไม่ติ๊ก:** Name (ดูข้อ 2.1), Address, Phone number, Race and ethnicity, Political or religious beliefs, Sexual orientation · User payment info, Credit score, Other financial info · Location (Approximate/Precise) · Messages (ทุกข้อ) · Photos and videos · Audio · Files and docs · Calendar · Contacts · App activity (App interactions, In-app search history, Installed apps, Other user-generated content, Other actions) · Web browsing · App info and performance (Crash logs, Diagnostics, Other app performance data) · Device or other IDs

### 4.3 หน้าสรุป (ตรวจก่อนกด Submit)
- Data shared: **No data shared with third parties**
- Data collected: Personal info, Health and fitness, Financial info
- Security practices: Data is encrypted in transit · You can request that data be deleted

## 5. ตรวจซ้ำเมื่อไร
- ทุกครั้งที่เพิ่ม SDK หรือ dependency ใหม่ใน `package.json`
- ทุกครั้งที่เพิ่มคอลัมน์/ตารางที่ซิงก์ใน `src/db/schema.ts` หรือ `supabase/migrations/`
- ทุกครั้งที่แก้ `ios.privacyManifests` ใน `app.config.ts` — ป้ายของ Apple, manifest, Data safety และ Privacy Policy ในแอปต้องตรงกันทั้งสี่ที่
- หลังแก้นโยบายความเป็นส่วนตัวใน `src/legal/content.ts` (หัวข้อ "ข้อมูลที่เราเก็บ" ต้องตรงกับไฟล์นี้)
