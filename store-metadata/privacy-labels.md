# ป้ายความเป็นส่วนตัว: App Store Privacy Nutrition Label + Google Play Data safety

> **ฉบับแอปออฟไลน์ล้วน (D81, D83 — เจ้าของตัดสิน 2026-10-14)** แอปไม่มีบัญชี/ล็อกอิน ไม่มีเซิร์ฟเวอร์หรือคลาวด์ของเราเอง ข้อมูลการฝึก โปรไฟล์ และสุขภาพอยู่ใน SQLite บนเครื่องเท่านั้น สิ่งที่ออกจากเครื่องมีแค่ข้อมูลการซื้อที่ SDK ของ RevenueCat ส่ง (รหัสผู้ใช้นิรนาม + ประวัติการซื้อ)
>
> คำตอบในไฟล์นี้ต้องตรงกับ **privacy manifest ของ iOS ใน `app.config.ts`** (`COLLECTED_DATA_TYPES` = `NSPrivacyCollectedDataTypeUserID` + `NSPrivacyCollectedDataTypePurchaseHistory` ทั้งคู่ `Linked: true`, `Tracking: false`, วัตถุประสงค์ App Functionality — ล็อกด้วยเทสต์ `__tests__/appConfig.test.ts`) และกับนโยบายความเป็นส่วนตัวในแอป (`src/legal/content.ts`) — ทั้งสี่ที่ (ป้าย Apple, manifest, Data safety, Privacy Policy) ต้องตรงกันเสมอ (SPEC N1, N2, B13)
>
> ไฟล์นี้เป็นฉบับละเอียดของ "ส่วน P" ใน [HUMAN_TASKS.md](../docs/HUMAN_TASKS.md) (ข้อ 49–50) ชื่อเมนูในคอนโซลเขียนเป็นภาษาอังกฤษตามที่คอนโซลแสดง และอาจเปลี่ยนเล็กน้อยตามเวลา

## 1. แอปส่งข้อมูลอะไรออกจากเครื่องจริง (ตรวจจากโค้ด)

**หลักการ:** ข้อมูลที่อยู่ในเครื่องอย่างเดียวไม่นับว่า "เก็บ" (collect) ตามนิยามของทั้ง Apple และ Google — นับเฉพาะข้อมูลที่ส่งออกจากเครื่องไปยังเราหรือผู้ให้บริการของเรา ซึ่งตอนนี้มีแค่ RevenueCat

| ข้อมูล | ส่งไปไหน | ที่มาในโค้ด |
|---|---|---|
| app user id **นิรนาม** ที่ SDK ของ RevenueCat สุ่มขึ้นในเครื่อง (`$RCAnonymousID:…`) | RevenueCat | `src/services/purchases/revenueCat.ts` — `Purchases.configure({ apiKey })` **ไม่ส่ง appUserID** และไม่เรียก `logIn`/`logOut` (D81.2) |
| ประวัติการซื้อ/สถานะสมาชิก (สินค้า วันที่ ทดลอง/รายเดือน/ซื้อขาด วันหมดอายุ การต่ออายุ ใบเสร็จของสโตร์) | RevenueCat (และ App Store / Google Play ที่ดำเนินการชำระเงินเอง) | เรียกเฉพาะ `configure`, `getOfferings`, `checkTrialOrIntroductoryPriceEligibility`, `purchasePackage`, `restorePurchases`, `getCustomerInfo` และ listener ของ customerInfo — **ไม่มี** `setEmail`/`setAttributes`/`collectDeviceIdentifiers`/`setAd*` |
| ข้อมูลทางเทคนิคของการเชื่อมต่อ (IP, รุ่นอุปกรณ์/OS, เวอร์ชันแอป, ภาษา/ประเทศของสโตร์) | RevenueCat เห็นตามปกติของคำขอ HTTP และ SDK | ไม่ได้ส่งโดยโค้ดของแอปเอง — ดูข้อ 2.1 |

**อยู่ในเครื่องเท่านั้น (ไม่ประกาศ):** ทุกตารางใน `src/db/schema.ts` — `profile` (เพศ อายุ ส่วนสูง น้ำหนัก ระดับกิจกรรม เป้าหมาย), `custom_exercise`, `program`, `routine`, `routine_exercise`, `week_plan`, `day_override`, `workout_session`, `session_exercise`, `session_set`, `daily_log`, `onboarding_draft`, `entitlement_cache`, `app_settings` — ไม่มีโค้ดส่งข้อมูลเหล่านี้ออกเครือข่าย (sync engine/Supabase ถูกลบใน D81/D81.3)

**ไฟล์สำรอง/ไฟล์ CSV (D82):** สร้างในเครื่องแล้วส่งให้หน้าแชร์ของระบบ ผู้ใช้เป็นคนเลือกปลายทางเอง (Drive/LINE/Files/อีเมล) เราไม่ได้รับไฟล์ — จึงไม่ใช่การ "เก็บ" ของเรา และตามนิยามของ Google เป็น user-initiated transfer ที่ผู้ใช้คาดว่าจะถูกส่ง จึงไม่นับเป็น "share" ด้วย

**ไม่มีในแอป:** SDK โฆษณา, analytics, crash reporting, attribution — ตรวจใน `package.json` (ไม่มี sentry/firebase/amplitude/mixpanel/segment/appsflyer/adjust/admob/facebook ฯลฯ) · ไม่ใช้ตำแหน่ง กล้อง รูป ไมค์ รายชื่อ (Android ตัดสิทธิ์ที่ไม่ใช้ด้วย `blockedPermissions`) · ไม่ใช้ HealthKit / Health Connect · ไม่ขอ IDFA จึงไม่มีหน้า App Tracking Transparency

**การส่งข้อมูล:** RevenueCat ใช้ HTTPS → encrypted in transit = ใช่

**การลบ:** ในแอป ตั้งค่า → ข้อมูลของคุณ → **ลบข้อมูลทั้งหมดในเครื่องนี้** (และจากปุ่ม "การตั้งค่า" บน Paywall ซึ่งเข้าได้แม้ไม่มีสิทธิ์) ลบทุกตารางผู้ใช้ + ร่างตั้งค่าเริ่มต้น + แคชสิทธิ์ในทรานแซกชันเดียว (`src/db/wipe.ts`) — ข้อมูลการซื้อที่ RevenueCat ลบได้ตามคำขอทางอีเมล (เจ้าของลบลูกค้าในแดชบอร์ด RevenueCat — HUMAN_TASKS ข้อ 62)

## 2. [ต้องตรวจก่อนส่ง] จุดที่ยังไม่แน่ใจ

1. **SDK ของ RevenueCat เก็บอะไรเพิ่มเอง (Q21):** RevenueCat มี privacy manifest ของตัวเองใน SDK และมีหน้าคู่มือ "App Privacy" / "Data Safety" สำหรับนักพัฒนา — **ต้องเปิดคู่มือรุ่นปัจจุบันและเทียบกับไฟล์นี้** (สภาพแวดล้อมที่เขียนเอกสารนี้เข้าเว็บไม่ได้ คำตอบด้านล่างจึงมาจากโค้ดของแอปและหลักการทั่วไป) โดยเฉพาะ: (ก) RevenueCat แนะนำให้ประกาศ Device ID / Diagnostics / Usage Data เพิ่มหรือไม่ (ข) ข้อมูลกับรหัสนิรนามถือว่า "linked to the user" หรือไม่
2. **Linked = Yes แบบระมัดระวัง:** รหัสนิรนามไม่ผูกกับชื่อหรืออีเมล แต่คงที่และผูกกับประวัติการซื้อ/ใบเสร็จของบัญชีสโตร์ ไฟล์นี้จึงตอบ "Linked to the user = Yes" (การประกาศเกินดีกว่าขาด) ถ้าคู่มือของ RevenueCat ระบุว่ารหัสนิรนามถือเป็น "not linked" เจ้าของเปลี่ยนเป็น No ได้ แต่ต้องให้ผู้พัฒนาแก้ `NSPrivacyCollectedDataTypeLinked` ใน `app.config.ts` และเทสต์ให้ตรงกันด้วย
3. **วัตถุประสงค์ Analytics:** คำตอบคือ App Functionality อย่างเดียว ถ้าเจ้าของจะใช้แดชบอร์ด/Charts ของ RevenueCat วิเคราะห์ยอดขายหรืออัตราแปลงจากทดลองเป็นจ่าย ให้พิจารณาเพิ่ม **Analytics** ทั้งสองสโตร์ และให้ผู้พัฒนาเพิ่ม purpose เดียวกันใน manifest และนโยบายฯ
4. **ตรวจ manifest รวมของทั้งแอปก่อนส่ง:** Xcode → archive ของ build production → คลิกขวา → **Generate Privacy Report** แล้วเทียบกับข้อ 3 (manifest ของ RevenueCat/Expo/React Native ถูกรวมเข้า build เอง)
5. **ผู้ใช้ที่อัปเดตจากรุ่นที่เคยล็อกอิน (ถ้ามีรุ่นที่เผยแพร่แล้ว):** SDK ของ RevenueCat จำ app user id เดิม (id ผู้ใช้ Supabase) ไว้ในเครื่อง — ข้อมูลที่ RevenueCat มีของผู้ใช้กลุ่มนี้ผูกกับ id เดิม ถ้าแอปยังไม่เคยเผยแพร่ ข้อนี้ไม่เกี่ยว (D81.2)

## 3. App Store Connect → App Privacy (Privacy Nutrition Label)

ที่ไหน: App Store Connect → แอป → **App Privacy** → Get Started / Edit (HUMAN_TASKS ข้อ 49) · Privacy Policy URL = `<PRIVACY_URL>`

### 3.1 คำถามแรก
- **Do you or your third-party partners collect data from this app?** → **Yes, we collect data from this app** (RevenueCat เป็น third-party partner ที่ได้รับข้อมูลการซื้อ)

### 3.2 ประเภทข้อมูลที่ติ๊ก (ต้องตรงกับ manifest 2 ประเภท)

| หมวดในคอนโซล | ประเภท | ข้อมูลในแอป | manifest key |
|---|---|---|---|
| Purchases | **Purchase History** | สถานะทดลอง/รายเดือน/ซื้อขาด วันหมดอายุ ใบเสร็จ ผ่าน RevenueCat | `NSPrivacyCollectedDataTypePurchaseHistory` |
| Identifiers | **User ID** | app user id นิรนามของ RevenueCat | `NSPrivacyCollectedDataTypeUserID` |

**ไม่ติ๊ก (อยู่ในเครื่องเท่านั้นหรือไม่มีในแอป):** Health, Fitness (เดิมเคยประกาศสมัยมีคลาวด์ — ตอนนี้ไม่ออกจากเครื่อง), Other Data Types (เพศ/อายุ), Contact Info ทุกข้อ (ไม่มีอีเมล/ชื่อ — ไม่มีล็อกอิน), Financial Info (การชำระเงินทำโดย Apple), Location, Sensitive Info, Contacts, User Content, Browsing/Search History, Device ID (ดูข้อ 2.1), Usage Data, Diagnostics, Surroundings, Body

### 3.3 คำตอบของแต่ละประเภท (เหมือนกันทั้ง 2 ประเภท)

| คำถามในคอนโซล | คำตอบ |
|---|---|
| How is this data used? (purposes) | ติ๊ก **App Functionality** เท่านั้น (ดูข้อ 2.3) |
| Is this data linked to the user's identity? | **Yes** (ดูข้อ 2.2) |
| Is this data used for tracking purposes? | **No** |

### 3.4 ผลที่หน้าร้านจะแสดง
- **Data Used to Track You:** ไม่มี
- **Data Linked to You:** Purchases (Purchase History), Identifiers (User ID)
- **Data Not Linked to You:** ไม่มี

### 3.5 Privacy manifest ที่ต้องตรงกัน (`app.config.ts` → `ios.privacyManifests`)

| ค่า | ในโค้ดตอนนี้ |
|---|---|
| `NSPrivacyTracking` | `false` |
| `NSPrivacyTrackingDomains` | `[]` |
| `NSPrivacyCollectedDataTypes` | 2 รายการ (User ID, Purchase History) แต่ละรายการ `Linked: true`, `Tracking: false`, `Purposes: [NSPrivacyCollectedDataTypePurposeAppFunctionality]` |
| `NSPrivacyAccessedAPITypes` | `[]` (manifest ของ React Native / Expo / SDK รวมเข้า build เอง — ดูข้อ 2.4) |

## 4. Google Play Console → App content → Data safety

ที่ไหน: Play Console → Policy and programs → **App content** → **Data safety** → Manage (HUMAN_TASKS ข้อ 50)

### 4.1 Data collection and security

| คำถาม | คำตอบ |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (ข้อมูลการซื้อผ่าน RevenueCat) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Which of the following methods of account creation does your app support? | **My app does not allow users to create an account** (ไม่มีบัญชี/ล็อกอิน) — จึงไม่ต้องมี Delete account URL |
| Do you provide a way for users to request that their data is deleted? | **Yes** — ข้อมูลในเครื่องลบได้เองด้วย "ลบข้อมูลทั้งหมดในเครื่องนี้"/ถอนการติดตั้ง ส่วนข้อมูลการซื้อที่ RevenueCat ขอลบได้ทางอีเมล `<CONTACT_EMAIL>` (ตามหัวข้อ "การเก็บรักษาและการลบข้อมูล" ในนโยบายฯ) — ตอบ Yes เฉพาะเมื่อเจ้าของพร้อมดำเนินการคำขอจริง (HUMAN_TASKS ข้อ 62) |

### 4.2 Data types — ติ๊กเฉพาะตามตารางนี้

| หมวด | ประเภท | ข้อมูลในแอป | Collected | Shared | Processed ephemerally? | Required or optional | Purposes |
|---|---|---|---|---|---|---|---|
| Financial info | **Purchase history** | สถานะทดลอง/รายเดือน/ซื้อขาด ผ่าน RevenueCat | Yes | **No** | No | Required | App functionality |
| Device or other IDs | **Device or other IDs** | app user id นิรนามของ RevenueCat (ตัวระบุระดับแอปแบบสุ่ม ไม่ใช่ตัวระบุบุคคล) | Yes | **No** | No | Required | App functionality |

- **Shared = No:** RevenueCat เป็นผู้ให้บริการที่ประมวลผลแทนเรา ซึ่ง Google ไม่นับเป็นการ "share"
- **รหัสนิรนามอยู่หมวดไหน:** Google ให้ "User IDs" = ตัวระบุที่ผูกกับบุคคลที่ระบุตัวได้ และ "Device or other IDs" = ตัวระบุของอุปกรณ์/เบราว์เซอร์/แอป รหัสนิรนามของ RevenueCat ตรงกับแบบหลังมากกว่า — ถ้าคู่มือ Data Safety ของ RevenueCat แนะนำต่างจากนี้ ให้ทำตามคู่มือ (Q21)
- ถ้าข้อ 2.3 เพิ่ม Analytics ให้ติ๊ก Analytics เพิ่มที่ Purchase history

**ไม่ติ๊ก:** Personal info ทุกข้อ (Name, Email address, User IDs, Address, Phone number, Race and ethnicity, Political or religious beliefs, Sexual orientation, Other info — เพศ/อายุอยู่ในเครื่องเท่านั้น) · Health and fitness (Health info, Fitness info — อยู่ในเครื่องเท่านั้น) · User payment info, Credit score, Other financial info · Location · Messages · Photos and videos · Audio · Files and docs (ไฟล์สำรองผู้ใช้ส่งเอง ไม่ถึงเรา) · Calendar · Contacts · App activity · Web browsing · App info and performance

### 4.3 หน้าสรุป (ตรวจก่อนกด Submit)
- Data shared: **No data shared with third parties**
- Data collected: Financial info (Purchase history), Device or other IDs
- Security practices: Data is encrypted in transit · You can request that data be deleted

## 5. ตรวจซ้ำเมื่อไร
- ทุกครั้งที่เพิ่ม SDK หรือ dependency ใหม่ใน `package.json`
- ทุกครั้งที่โค้ดเริ่มส่งข้อมูลใหม่ออกจากเครื่อง (เช่น เพิ่มคลาวด์ ซิงก์ หรือ `Purchases.setAttributes`) — ต้องแก้ทั้งสี่ที่พร้อมกัน
- ทุกครั้งที่แก้ `ios.privacyManifests` ใน `app.config.ts`
- หลังแก้นโยบายความเป็นส่วนตัวใน `src/legal/content.ts` (หัวข้อ "ข้อมูลที่ออกจากเครื่อง: การซื้อ" ต้องตรงกับไฟล์นี้)
