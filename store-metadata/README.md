# store-metadata — ข้อความและแบบฟอร์มสำหรับส่งสโตร์

ชุดไฟล์นี้คือข้อความหน้าร้าน คำตอบแบบฟอร์มความเป็นส่วนตัว และ App Review Notes ที่พร้อมคัดลอกไปวางใน App Store Connect และ Play Console (SPEC N1, N2, N6) ตรวจข้อเท็จจริงกับโค้ด สเปค และ `package.json` / `supabase/` แล้วที่ commit `c7f2171` (ดูหัวข้อ "ขอบเขตของรุ่นนี้" ด้านล่างว่าอะไรต้องตรวจซ้ำก่อนปล่อย)

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
- ผลที่ตรวจล่าสุดสำหรับข้อความทุกช่อง: ผ่านทุกขีดจำกัด (App Store: ชื่อ ≤ 30, subtitle ≤ 30, promo ≤ 170, description ≤ 4000, keywords ≤ 100; Play: short ≤ 80, full ≤ 4000, release notes ≤ 500) และยังผ่านเมื่อแทน URL ด้วยสตริงยาว 80 ตัวอักษร (คำอธิบาย EN ของ App Store มีที่เหลือน้อยที่สุด รับ Terms URL + Privacy URL รวมกันได้ไม่เกินราว 230 ตัวอักษร — ถ้า URL ยาวกว่านั้นให้ใช้ลิงก์สั้น)

## ขอบเขตของรุ่นนี้ (ต้องตรวจซ้ำก่อน build ส่งรีวิว)

ข้อความทุกช่องเขียนให้ "จริงเสมอ" กับโค้ดที่ commit `c7f2171` ฟีเจอร์ที่ยังอยู่ในสาขาแก้ไขที่ยังไม่รวม (`audit-fix/*`) หรือยังไม่มีโค้ด **ไม่ได้อยู่ในข้อความ** ตารางนี้บอกว่าแต่ละเรื่องตรวจอย่างไร และถ้าโค้ดรวมแล้ว จะเพิ่มข้อความอะไรได้ (ห้ามเพิ่มถ้า build ที่จะส่งยังไม่มีฟีเจอร์นั้น — หน้าร้านที่อ้างฟีเจอร์ที่ไม่มีเสี่ยงถูกปฏิเสธตาม App Review 2.3.1)

| เรื่อง | สถานะที่ commit `c7f2171` | ตรวจว่ามีใน build ที่จะส่งหรือยัง | ถ้ามีแล้ว เพิ่มได้ที่ |
|---|---|---|---|
| ไอคอนกลุ่มกล้ามเนื้อในคลังท่า | ยังไม่มี (อยู่ในสาขา programs) | `ls src/components/MuscleIcon.tsx` | listing.en: "143 exercises, including" → "143 exercises with muscle-group icons, including" · listing.th: "143 ท่า มีท่าบอดี้เวท" → "143 ท่า พร้อมไอคอนกลุ่มกล้ามเนื้อ มีท่าบอดี้เวท" (ทั้ง App Store และ Play) |
| แก้ไขท่าที่สร้างเอง | ยังไม่มี (สร้างและลบได้เท่านั้น) | `grep -n editExercise src/i18n/locales/en/exercises.ts` | EN: "Add your own." → "Add and edit your own." · TH: "สร้างท่าเองได้" → "สร้างและแก้ไขท่าเองได้" |
| เลือก routine ตอนบันทึกการฝึกย้อนหลัง | ยังไม่มี (เซสชันย้อนหลังเป็นเซสชันเปล่า 7 วันล่าสุด) | `grep -n pickRoutine src/i18n/locales/en/today.ts` | ไม่ต้องแก้ listing (พูดถึงแค่ "log a past workout") — ใช้ในขั้นจัดฉากของ [screenshots.md](screenshots.md) และ P-test ใน TEST_PLAN |
| คำเตือน "ไม่ใช่คำแนะนำทางการแพทย์" ในหน้าวันนี้ กราฟความแข็งแรง + ลิงก์ "Sources" | ยังไม่มี: มีคำเตือนในสถิติ โปรไฟล์ สรุปเซสชัน รายละเอียดประวัติ ตั้งค่า และหน้าอ้างอิง | `grep -rn "<Disclaimer" src/app` และ `grep -n "sources" src/i18n/locales/en/nutrition.ts` | review-notes.md ย่อหน้า HEALTH INFORMATION: แทนประโยคแรกด้วย `A "not medical advice" disclaimer with a "Sources" link to the References screen is shown on Today, Stats, the strength chart, Profile & targets, the session summary and History.` แล้วรัน check-limits (เหลือที่ ~200 ไบต์) · play-declarations.md ข้อ 1 ปรับรายการหน้าจอตามจริง |
| Privacy manifest ระบุข้อมูล 5 ประเภท | ยังไม่ครบ: `NSPrivacyCollectedDataTypes: []` | `npx expo config --type introspect \| grep -A30 privacyManifests` ต้องเห็น 5 ประเภทตาม [privacy-labels.md](privacy-labels.md) ข้อ 3.5 | — (ต้องแก้ `app.config.ts` ก่อน ไม่ใช่แก้ข้อความ) |
| ลบ `revenuecat_events` เก่าอัตโนมัติ (90 วัน) | ยังไม่มี migration/cron | `grep -rn "90 days" supabase/migrations` | ถ้ามี: แก้แถวใน [privacy-labels.md](privacy-labels.md) ข้อ 1 และหัวข้อ "การเก็บรักษาและการลบข้อมูล" ใน `src/legal/content.ts` ให้ตรงกัน แล้ว `npx supabase db push` |
| Sign in with Apple บน Android ไม่ขอชื่อ | ไม่แน่ใจ: `signInWithOAuth({ provider: 'apple' })` ไม่ระบุ `scopes` | ล็อกอิน Apple บน Android แล้วดู Raw user meta data ใน Supabase ([privacy-labels.md](privacy-labels.md) ข้อ 2.1) | ถ้าพบชื่อ: เพิ่ม `scopes: 'email'` ในโค้ด หรือประกาศ Name ในป้าย |
| ป้าย "Template" ในหน้ากฎหมายแสดงเฉพาะเมื่อยังมี placeholder + guard `RELEASE=1` | ยังไม่มี: ป้ายแสดงเสมอ | `RELEASE=1 npm test` ต้องผ่านเมื่อกรอก `PLACEHOLDERS` ครบ | — (ดู [docs/RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md) ข้อ 5) |

ตารางนี้เป็น snapshot ที่ commit `c7f2171` เมื่อสาขาแก้ไขรวมแล้ว ให้ผู้พัฒนาปรับคอลัมน์สถานะและรันคำสั่งตรวจอีกครั้งก่อนส่ง

## เช็กลิสต์ก่อนวางข้อความลงสโตร์

- [ ] กรอก placeholder ครบตามตารางด้านบน และ `node store-metadata/check-limits.js --release` ผ่าน
- [ ] ชื่อแอปในทุกไฟล์ตรงกับชื่อที่จองไว้ และตรงกับ `app.config.ts` / `src/i18n/native/*.json`
- [ ] ข้อความไม่มีราคา (ราคามาจากสโตร์) และไม่มีคำว่า "ฟรี" เป็นหัวข้อโดดๆ — ทดลองฟรีพูดคู่กับเงื่อนไข "ผู้ที่มีสิทธิ์" เสมอ
- [ ] ตั้ง free trial offer ในสโตร์ตาม [play-declarations.md](play-declarations.md) ข้อ 6 และ HUMAN_TASKS ข้อ 43, 52 (7 วัน ลูกค้าใหม่)
- [ ] ป้าย App Privacy / Data safety / privacy manifest / Privacy Policy ในแอป ตรงกันทั้งสี่ที่ ([privacy-labels.md](privacy-labels.md) ข้อ 5)
- [ ] ภาพหน้าจอถ่ายจาก build จริง ทั้งไทยและอังกฤษ ([screenshots.md](screenshots.md) ข้อ 6)
- [ ] App Review Notes วางตามเมนูจริงของ build ที่ส่ง (เปิดแอปไล่ทุกเส้นทางที่ระบุก่อนกดส่ง)
