# store-metadata — ข้อความและแบบฟอร์มสำหรับส่งสโตร์

ชุดไฟล์นี้คือข้อความหน้าร้าน คำตอบแบบฟอร์มความเป็นส่วนตัว และ App Review Notes ที่พร้อมคัดลอกไปวางใน App Store Connect และ Play Console (SPEC N1, N2, N6) ตรวจข้อเท็จจริงกับโค้ด สเปค และ `package.json` / `supabase/` แล้วที่ commit `88bfff2` (รวมการแก้จากการตรวจสเปคครบแล้ว — ดูหัวข้อ "ตรวจก่อนปล่อย" ด้านล่างว่าต้องตรวจซ้ำอะไรกับ build ที่จะส่งจริง)

เช็กลิสต์ส่งสโตร์ทั้งหมดอยู่ที่ [docs/RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md) งานที่ต้องทำเองทีละขั้นอยู่ที่ [docs/HUMAN_TASKS.md](../docs/HUMAN_TASKS.md) (ไฟล์นี้ไม่ทำซ้ำเนื้อหาของสองไฟล์นั้น)

## ไฟล์ในโฟลเดอร์

| ไฟล์ | ใช้ทำอะไร | วางที่ไหน | HUMAN_TASKS |
|---|---|---|---|
| [app-names.md](app-names.md) | ชื่อแอปทางเลือก 5 ชื่อ + วิธีตรวจชื่อซ้ำ/เครื่องหมายการค้า + ถ้าเปลี่ยนชื่อต้องแก้ที่ไหน | ตัดสินใจก่อนสร้างแอปในสโตร์ | ข้อ 1 |
| [listing.en.md](listing.en.md) | ข้อความหน้าร้านภาษาอังกฤษ (ชื่อ, subtitle, promo, คำอธิบาย, keywords, short/full description ของ Play) + ตารางที่มาของข้อเท็จจริง | App Store Connect + Play Console (localization English) | ข้อ 77 |
| [listing.th.md](listing.th.md) | ข้อความหน้าร้านภาษาไทย (โครงเดียวกัน) | localization ไทย | ข้อ 77 |
| [privacy-labels.md](privacy-labels.md) | คำตอบ App Privacy (Nutrition Label) และ Data safety + ตารางข้อมูลที่แอปเก็บจริง | App Store Connect → App Privacy; Play Console → Data safety | ข้อ 72, 73 |
| [play-declarations.md](play-declarations.md) | Health apps, Target audience, Content rating, Ads/Advertising ID, ลบบัญชี, ตั้งค่า free trial offer ให้ตรงกับ Paywall | Play Console → App content, Monetize | ข้อ 51–53, 74, 75 |
| [review-notes.md](review-notes.md) | App Review Notes (iOS) + App access (Play) + บัญชีทดสอบที่ต้องเตรียม | App Store Connect → App Review Information; Play Console → App access | ข้อ 71, 76 |
| [screenshots.md](screenshots.md) | ไอเดียภาพหน้าจอ 5 ภาพ (แม่แบบ, caption ไทย/อังกฤษ, วิธีจัดฉาก), ขนาดภาพ, feature graphic | ถ่ายจาก build จริงแล้วอัปโหลดทั้งสองสโตร์ | ข้อ 78, 79 |
| [icon.md](icon.md) | ไอคอนที่มีใน `assets/`, brief, ขนาดที่สโตร์ต้องการ | ไอคอน iOS มากับ build; ไอคอน Play 512×512 อัปโหลดเอง | ข้อ 3, 78 |
| [check-limits.js](check-limits.js) | สคริปต์นับตัวอักษรทุกช่อง และตรวจว่ายังมี placeholder เหลือไหม | รันในเครื่อง | — |

## ลำดับที่เจ้าของต้องทำ (placeholder ที่ต้องกรอก)

ทำตามลำดับ ขั้นหลังมักใช้ค่าจากขั้นก่อน กรอกแล้วใช้ค้นแทนทั้งโฟลเดอร์ เช่น `sed -i 's|<PRIVACY_URL>|https://example.com/privacy|g' store-metadata/*.md` (แทนเฉพาะที่ต้องการ ตรวจ diff ก่อน commit)

| ลำดับ | Placeholder | ใช้ใน | ต้องใส่อะไร | มาจาก |
|---|---|---|---|---|
| 1 | ชื่อแอป ("Fitnese" ชั่วคราว) | ทุกไฟล์ | เลือกชื่อจริงจาก [app-names.md](app-names.md) แล้วจองด้วยการสร้าง app record ถ้าเปลี่ยนชื่อ: `grep -rn "Fitnese" store-metadata` แทนทุกที่ แล้วรัน `node store-metadata/check-limits.js` (ชื่อใน subtitle/คำอธิบายเปลี่ยนความยาว) | ข้อ 1 |
| 2 | `<DEVELOPER_NAME>` | listing.en/th (Copyright) | ชื่อผู้พัฒนา/บริษัทตามที่ลงทะเบียนกับ Apple/Google และตรงกับ `developer` ใน `src/legal/content.ts` | ข้อ 4, 12 |
| 3 | `<CONTACT_EMAIL>` | listing, play-declarations, privacy-labels, review-notes | อีเมลติดต่อที่ใช้งานได้จริง (ใช้รับคำขอลบข้อมูลด้วย) ต้องตรงกับ `contact` ใน `src/legal/content.ts` | ข้อ 12 |
| 4 | `<PRIVACY_URL>` | listing (คำอธิบาย + Privacy URL), play-declarations, privacy-labels | URL หน้า Privacy Policy สาธารณะที่เปิดได้โดยไม่ล็อกอิน เนื้อหาเดียวกับในแอป และตรงกับ `EXPO_PUBLIC_PRIVACY_URL` | ข้อ 14 |
| 5 | `<TERMS_URL>` | listing (คำอธิบาย — Apple บังคับสำหรับสมาชิกต่ออายุอัตโนมัติ) | URL หน้า Terms of Use ตรงกับ `EXPO_PUBLIC_TERMS_URL` | ข้อ 14 |
| 6 | `<DELETE_ACCOUNT_URL>` | privacy-labels, play-declarations (Play Data safety) | URL หน้าเว็บที่บอกวิธีลบบัญชีและขอลบทางอีเมลโดยไม่ต้องติดตั้งแอป ใช้หัวข้อ "การเก็บรักษาและการลบข้อมูล" ของหน้า Privacy ได้ถ้ามีวิธีขอทางอีเมลครบ | ข้อ 14, 73 |
| 7 | `<SUPPORT_URL>` | listing (App Store บังคับ, Play ไม่บังคับ) | หน้าเว็บสาธารณะที่ผู้ใช้ติดต่อคุณได้ | ข้อ 77 |
| 8 | `<MARKETING_URL>` | listing (ไม่บังคับ) | ถ้าไม่มี ลบแถวนั้นออก | ข้อ 77 |
| 9 | `<REVIEW_GOOGLE_EMAIL>` / `<REVIEW_GOOGLE_PASSWORD>` | review-notes (iOS + Play) | บัญชี Google ใหม่สำหรับผู้รีวิวเท่านั้น ปิด 2-Step Verification ล็อกอินครั้งแรกบนเครื่องใหม่ให้ผ่านก่อน เพิ่มเป็น Play license tester ห้ามซื้อ/เริ่มทดลองด้วยบัญชีนี้ก่อนส่ง | ข้อ 69, 71 |
| 10 | `<CONTACT_NAME>` / `<CONTACT_PHONE>` | review-notes (App Review Information) | ชื่อและเบอร์ที่ Apple โทรหาได้ (รูปแบบ +66…) | ข้อ 76 |
| 11 | `<APPLE_SANDBOX_EMAIL>` / `<APPLE_SANDBOX_PASSWORD>` | review-notes (ตารางบัญชีของคุณเอง ไม่ต้องวางในช่อง Notes) | บัญชี sandbox สำหรับทดสอบเอง | ข้อ 68 |

หลังกรอกครบ รัน `node store-metadata/check-limits.js --release` ต้องจบด้วย "ผ่านทุกช่อง" และไม่มี placeholder เหลือ (ยกเว้นข้อความตัวอย่างในกรอบอธิบาย เช่น `<PLACEHOLDER>` ใน review-notes.md ที่สคริปต์ข้ามให้)

## วิธีนับตัวอักษร

```bash
node store-metadata/check-limits.js                 # ตรวจขีดจำกัดทุกช่อง + ตัวเลขที่เขียนไว้ + รายการ placeholder
node store-metadata/check-limits.js --url-len=120   # จำลอง URL ยาว 120 ตัวอักษรแทน <TERMS_URL> ฯลฯ
node store-metadata/check-limits.js --release       # ล้มถ้ายังมี placeholder
```

- สคริปต์อ่านเฉพาะบล็อกที่มีบรรทัด `<!-- id:xxx -->` ตามด้วยกรอบโค้ดชนิด `text` — **อย่าลบ marker** ถ้าเพิ่มช่องใหม่ต้องเพิ่ม id ใน `LIMITS` ของสคริปต์
- นับเป็น Unicode code point รวมช่องว่างและการขึ้นบรรทัด สระ/วรรณยุกต์ไทยนับแยกตัว ถ้าแก้ข้อความ ต้องอัปเดตตัวเลขในหัวข้อและตารางสรุปของไฟล์นั้นด้วย (สคริปต์เตือนเมื่อตัวเลขในหัวข้อไม่ตรง; ตารางสรุปต้องตรวจด้วยตา)
- **Keywords ของ App Store:** เอกสารของ Apple ระบุขีดจำกัด 100 ไบต์ในบางหน้า อักษรไทย 1 ตัวใช้ 3 ไบต์ จึงมีชุดหลัก (≤ 100 ไบต์) และชุดยาว (≤ 100 ตัวอักษร) ใน listing.th.md ใช้ชุดยาวเฉพาะเมื่อตัวนับในคอนโซลนับเป็นตัวอักษรและยังเหลือที่
- **ตัวนับในคอนโซลของสโตร์เป็นตัวตัดสินสุดท้าย** ถ้าไม่ตรงกับสคริปต์ ให้ยึดคอนโซล
- ผลที่ตรวจล่าสุดสำหรับข้อความทุกช่อง: ผ่านทุกขีดจำกัด (App Store: ชื่อ ≤ 30, subtitle ≤ 30, promo ≤ 170, description ≤ 4000, keywords ≤ 100; Play: short ≤ 80, full ≤ 4000, release notes ≤ 500) และยังผ่านเมื่อแทน URL ด้วยสตริงยาว 80 ตัวอักษร (คำอธิบาย EN ของ App Store มีที่เหลือน้อยที่สุด รับ Terms URL + Privacy URL รวมกันได้ไม่เกินราว 170 ตัวอักษร — ถ้า URL ยาวกว่านั้นให้ใช้ลิงก์สั้น)

## ตรวจก่อนปล่อย (กับ build ที่จะส่งจริง)

ข้อความทุกช่องเขียนให้ "จริงเสมอ" กับโค้ดที่ commit `88bfff2` หน้าร้านที่อ้างฟีเจอร์ที่ไม่มีเสี่ยงถูกปฏิเสธตาม App Review 2.3.1 จึงให้รันคำสั่งเหล่านี้กับโค้ดที่จะ build ก่อนวางข้อความ (ทุกข้อควรผ่านที่ commit นี้ ถ้าไม่ผ่านแปลว่าโค้ดเปลี่ยนจากที่เอกสารตรวจไว้ — แก้ข้อความหรือเอกสารให้ตรง)

| เรื่องที่ข้อความอ้าง | คำสั่งตรวจ | ข้อความที่เกี่ยวข้อง |
|---|---|---|
| ไอคอนกลุ่มกล้ามเนื้อ | `ls src/components/MuscleIcon.tsx` | listing.en/th ("with muscle-group icons" / "พร้อมไอคอนกลุ่มกล้ามเนื้อ") — ถ้าไม่มี ให้ลบวลีนี้แล้วนับใหม่ |
| สร้างและแก้ไขท่าเอง | `grep -n editExercise src/i18n/locales/en/exercises.ts` | listing ("Add and edit your own" / "สร้างและแก้ไขท่าเองได้") — ถ้าไม่มี เปลี่ยนเป็น "Add your own." / "สร้างท่าเองได้" |
| บันทึกการฝึกย้อนหลัง เลือก routine ได้ | `grep -n pickRoutine src/i18n/locales/en/today.ts` | listing พูดแค่ "log a past workout"; ขั้นจัดฉากใน [screenshots.md](screenshots.md) ใช้ขั้นเลือก routine |
| ตั้งค่าท่าระหว่างฝึก, ลบเซ็ตทีละเซ็ต | `grep -n "exerciseSettings\|removeThisSet" src/i18n/locales/en/session.ts` | listing ("edit exercise settings … mid-workout" / "ตั้งค่าท่าได้ทันที") |
| เป้า RIR/RPE ต่อท่า | `grep -n "rir" src/features/programs/ExerciseSettingsSheet.tsx` | listing ("optional RIR/RPE targets") |
| อัปเกรดรายเดือน → ซื้อขาดจากตั้งค่า, ข้อความ "แก้ไขการชำระเงิน" | `grep -n "settings-lifetime" "src/app/(app)/(tabs)/settings.tsx"` และ `grep -n fixPayment src/i18n/locales/en/paywall.ts` | listing (ข้อ "Switching from Monthly to Lifetime"), [review-notes.md](review-notes.md) |
| คำเตือน "ไม่ใช่คำแนะนำทางการแพทย์" + ลิงก์ "Sources" | `grep -rn "<Disclaimer" src/app` ต้องเห็นหน้าวันนี้ สถิติ กราฟความแข็งแรง (`stats/exercise`) โปรไฟล์ สรุปเซสชัน ประวัติ ตั้งค่า (และ `references` ที่ปิดลิงก์ `showSources={false}`) | review-notes.md ย่อหน้า HEALTH INFORMATION, play-declarations.md ข้อ 1 |
| Privacy manifest ตรงกับป้าย | `npx expo config --type introspect \| grep -A60 privacyManifests` ต้องเห็น 6 ประเภท: Email, UserID, Health, Fitness, PurchaseHistory, OtherDataTypes (linked, ไม่ติดตาม, AppFunctionality) | [privacy-labels.md](privacy-labels.md) ข้อ 3.2 และ 3.5 |
| `revenuecat_events` ลบเมื่อเก่ากว่า 90 วัน | `grep -rn "purge_revenuecat_events" supabase/migrations supabase/functions` และ `npx supabase migration list` ต้องมีไฟล์ `20261011000000_revenuecat_events_retention.sql` ทั้ง Local และ Remote | [privacy-labels.md](privacy-labels.md) ข้อ 1 · จุดเปิด: ข้อความ "การเก็บรักษาและการลบข้อมูล" ใน `src/legal/content.ts` ยังไม่พูดถึงการลบ log webhook 90 วัน (ดู privacy-labels.md ข้อ 2.5) |
| Sign in with Apple บน Android ไม่ขอชื่อ | **ตรวจไม่ได้จากโค้ด**: `signInWithOAuth({ provider: 'apple' })` ไม่ระบุ `scopes` — ล็อกอิน Apple บน Android จริงแล้วดู Raw user meta data ใน Supabase | [privacy-labels.md](privacy-labels.md) ข้อ 2.1 · ถ้าพบชื่อ: ให้ผู้พัฒนาเพิ่ม `scopes: 'email'` หรือประกาศ Name ในป้ายและ manifest |
| ป้าย "Template" ในหน้ากฎหมาย | ป้ายแสดงเฉพาะเมื่อ `hasPlaceholders()` เป็นจริง (`src/app/legal/[doc].tsx`) · `RELEASE=1 npm test` ต้องผ่านเมื่อกรอก `PLACEHOLDERS` ครบ (เทสต์ guard ใน `__tests__/legal.test.ts` ถูกข้ามถ้าไม่ตั้ง `RELEASE=1`) | [docs/RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md) หัวข้อ 5 |

## เช็กลิสต์ก่อนวางข้อความลงสโตร์

- [ ] กรอก placeholder ครบตามตารางด้านบน และ `node store-metadata/check-limits.js --release` ผ่าน
- [ ] ชื่อแอปในทุกไฟล์ตรงกับชื่อที่จองไว้ และตรงกับ `app.config.ts` / `src/i18n/native/*.json`
- [ ] ข้อความไม่มีราคา (ราคามาจากสโตร์) และไม่มีคำว่า "ฟรี" เป็นหัวข้อโดดๆ — ทดลองฟรีพูดคู่กับเงื่อนไข "ผู้ที่มีสิทธิ์" เสมอ
- [ ] ตั้ง free trial offer ในสโตร์ตาม [play-declarations.md](play-declarations.md) ข้อ 6 และ HUMAN_TASKS ข้อ 43, 52 (7 วัน ลูกค้าใหม่)
- [ ] ป้าย App Privacy / Data safety / privacy manifest / Privacy Policy ในแอป ตรงกันทั้งสี่ที่ ([privacy-labels.md](privacy-labels.md) ข้อ 5)
- [ ] ภาพหน้าจอถ่ายจาก build จริง ทั้งไทยและอังกฤษ ([screenshots.md](screenshots.md) ข้อ 6)
- [ ] App Review Notes วางตามเมนูจริงของ build ที่ส่ง (เปิดแอปไล่ทุกเส้นทางที่ระบุก่อนกดส่ง)
