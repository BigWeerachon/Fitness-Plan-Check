# RELEASE_CHECKLIST — เช็กลิสต์ก่อนส่งสโตร์ (App Store + Google Play)

> ใช้ทำตอนท้ายสุด หลังทำ [HUMAN_TASKS.md](HUMAN_TASKS.md) ส่วน A–R ครบแล้ว (HUMAN_TASKS ข้อ 80 ชี้มาที่ไฟล์นี้) ไฟล์นี้ **ไม่ทำซ้ำขั้นตอน** ของ HUMAN_TASKS แต่ระบุว่า "ต้องเห็นอะไร" ก่อนกดส่ง พร้อมคำสั่งตรวจ และอ้างข้อของ HUMAN_TASKS ที่ต้องกลับไปทำถ้ายังไม่ผ่าน การทดสอบบนเครื่องจริงทำตาม [TEST_PLAN.md](TEST_PLAN.md) ข้อความหน้าร้านอยู่ใน [../store-metadata/README.md](../store-metadata/README.md)
>
> ตรวจกับโค้ดที่ commit `88bfff2` (HEAD ของ `claude/clever-bell-dxizpd` — การแก้จากการตรวจสเปคทุกรอบรวมแล้ว) คำสั่งตรวจที่ระบุในแต่ละข้อควรให้ผลตามที่เขียนที่ commit นี้ ให้รันซ้ำกับโค้ดที่จะ build ก่อนส่งทุกครั้ง ถ้าผลต่างไปแปลว่าโค้ดเปลี่ยนหลังเอกสารนี้ — แก้เอกสารหรือโค้ดให้ตรงกัน
>
> **ระยะเวลาที่ต้องเผื่อ (ไม่ใช่งานโค้ด):** สมัคร Apple Developer (หลายวัน ถ้าเป็นองค์กรนานกว่า) · สิทธิ์ service account ของ Google Play ที่ RevenueCat ใช้ (หลายชั่วโมงถึง 1–2 วัน, HUMAN_TASKS ข้อ 60) · บัญชี Play ส่วนบุคคลใหม่ต้องผ่าน Closed testing ตามเงื่อนไขของ Google ก่อนขอ Production (HUMAN_TASKS ข้อ 6 — ตรวจตัวเลขปัจจุบันในคอนโซล) · Apple/Google ตรวจแอปและสินค้า in-app

วิธีใช้: ติ๊ก `[x]` เมื่อ **ตรวจเองแล้วเห็นผลจริง** ไม่ใช่เมื่อ "น่าจะทำแล้ว" ช่อง "เจ้าของต้องทำ" ที่ว่างคือไม่มีงานเพิ่ม

---

## 1. SPEC N1–N6 ทีละข้อ

### N1 — Apple

| # | ข้อกำหนด | แอป/เอกสารทำให้แล้วที่ไหน | เจ้าของต้องทำ |
|---|---|---|---|
| N1.1 | Sign in with Apple เท่าเทียมกับ Google (Guideline 4.8) | `src/features/auth/SignInButtons.tsx` (ปุ่มสองปุ่มสูง 52 เท่ากัน สไตล์เดียวกัน D51) · `ios.usesAppleSignIn: true` ใน `app.config.ts` · `src/services/auth/supabaseAuth.ts` | [ ] เปิด capability Sign in with Apple ที่ App ID, สร้างคีย์ `.p8`, ตั้ง Apple provider ใน Supabase (HUMAN_TASKS ข้อ 24–29) · [ ] ทดสอบ P-13 บน iPhone จริง · [ ] จดวันหมดอายุ Apple OAuth secret (≤ 6 เดือน) ลงปฏิทิน (ข้อ 82) |
| N1.2 | ปุ่มลบบัญชีในแอป (5.1.1(v)) + แจ้งว่าไม่ยกเลิกสมาชิกในสโตร์ (B12) | `src/app/delete-account.tsx` (ตั้งค่า → ส่วน "บัญชี"/Account → ลบบัญชีและข้อมูล; ไม่มีสิทธิ์ใช้งาน: Paywall → ไอคอนเฟือง → ส่วน "ข้อมูล"/Information) · Edge Function `delete-account` เพิกถอนโทเค็น Apple, ลบข้อมูลทุกตารางและลูกค้า RevenueCat (D40, D52) | [ ] deploy `delete-account` พร้อม secret `APPLE_*` และ `REVENUECAT_SECRET_API_KEY` (ข้อ 18, 29, 63) · [ ] ทดสอบ P-14 อย่างน้อย 1 ครั้งด้วยบัญชี Apple บน iPhone แล้วดู log ว่าไม่มี error ตอนเพิกถอน (ข้อ 70) |
| N1.3 | ข้อมูลสุขภาพ/การคำนวณมีลิงก์แหล่งอ้างอิง (1.4.1) + disclaimer "ไม่ใช่การแพทย์" ในคำอธิบายแอป | หน้า `/references` (`src/app/references.tsx`, `REFERENCES` ใน `src/legal/content.ts`: Mifflin 1990, ISSN 2017, Compendium 2024, Epley) เข้าถึงได้จากตั้งค่า → เกี่ยวกับ, หน้าบัญชี, Paywall · คอมโพเนนต์ `Disclaimer` (คำเตือน + ลิงก์ "แหล่งอ้างอิง") อยู่ในหน้าวันนี้ สถิติ กราฟความแข็งแรง (`stats/exercise`) โปรไฟล์ สรุปเซสชัน รายละเอียดประวัติ ตั้งค่า และหน้าแหล่งอ้างอิง (หน้านี้ไม่มีลิงก์วนกลับ `showSources={false}`) · ย่อหน้า "HEALTH DISCLAIMER"/"คำเตือนด้านสุขภาพ" ใน `store-metadata/listing.*.md` | [ ] วางคำอธิบายที่มีย่อหน้า disclaimer ลงสโตร์ (ข้อ 77) · [ ] ตรวจว่าคำเตือน "ทุกหน้าผลลัพธ์" ตาม SPEC H5 ครบใน build ที่จะส่ง: `grep -rn "<Disclaimer" src/app` ต้องเห็น 8 ไฟล์: `(tabs)/index.tsx` (วันนี้), `(tabs)/stats.tsx`, `stats/exercise/[id].tsx` (กราฟความแข็งแรง), `profile.tsx`, `session/summary/[id].tsx`, `history/[id].tsx`, `(tabs)/settings.tsx`, `references.tsx` |
| N1.4 | Privacy Nutrition Labels ตรงกับข้อมูลจริง | ตารางข้อมูลที่เก็บจริงและคำตอบทุกข้อใน `store-metadata/privacy-labels.md` (ตรวจกับ `src/db/schema.ts`, `supabase/migrations/`, `package.json` — ไม่มี SDK โฆษณา/analytics/crash) · `NSPrivacyTracking: false` | [ ] กรอกฟอร์ม (ข้อ 72) · [ ] ทำหัวข้อ 8 ด้านล่าง (privacy manifest ต้องตรงกับป้าย) · [ ] ตัดสินใจเรื่อง Name จาก Google/Apple บน Android (`privacy-labels.md` ข้อ 2.1) |
| N1.5 | Restore Purchases | ปุ่มบน Paywall, ตั้งค่า → สมาชิก, หน้าบัญชี · ต้องล็อกอินก่อน (D04) | [ ] ทดสอบ P-07 ทั้งสองแพลตฟอร์ม |
| N1.6 | ข้อมูลช่วงทดลองและราคาบน Paywall ตรงตามข้อกำหนด subscription (3.1.2) | `src/app/paywall.tsx` + `src/domain/entitlement/paywall.ts`: ราคาจากสโตร์ (ไม่ฮาร์ดโค้ด) ติดปุ่มซื้อ · ทดลอง 7 วัน → ราคา/เดือน · ต่ออายุอัตโนมัติ · วิธียกเลิก · ซื้อขาดไม่มีทดลอง · ลิงก์ Terms/Privacy/References · ไม่โฆษณาทดลองกับผู้ไม่มีสิทธิ์ (B6) | [ ] ตั้ง intro offer ฟรี 1 สัปดาห์ (ข้อ 43) · [ ] ตั้ง Subscription Group Display Name / รายละเอียด / ภาพตัวอย่างสำหรับสินค้า (ข้อ 42, 44) · [ ] ตรวจราคาที่ Paywall แสดงใน sandbox ตรงกับที่ตั้ง แล้วกรอกตารางข้อ 58 · [ ] มีลิงก์ Terms of Use ในคำอธิบาย (ใน `listing.*.md` แล้ว ต้องแทน `<TERMS_URL>`) |
| N1.7 | App Review Notes อธิบายบัญชีผู้ใช้/ซิงก์/สิทธิ์ผูกกับบัญชี/ล็อกอินก่อนทดลอง + บัญชีทดสอบ | `store-metadata/review-notes.md` | [ ] ทำตามหัวข้อ 10 ด้านล่าง (ข้อ 71, 76) |

### N2 — Google Play

| # | ข้อกำหนด | แอป/เอกสารทำให้แล้วที่ไหน | เจ้าของต้องทำ |
|---|---|---|---|
| N2.1 | Health apps declaration | คำตอบอยู่ใน `store-metadata/play-declarations.md` ข้อ 1 (Activity and fitness + Nutrition and weight management, ไม่ใช่อุปกรณ์การแพทย์, ไม่ใช้ Health Connect) | [ ] กรอกใน App content → Health apps (ข้อ 74) |
| N2.2 | Privacy policy ทั้งในคอนโซลและในแอป | ในแอป: `/legal/privacy` (`src/app/legal/[doc].tsx` จาก `src/legal/content.ts`) เข้าถึงได้เสมอ (B3) | [ ] ทำหัวข้อ 5 (กรอกเทมเพลต โฮสต์ ตั้ง `EXPO_PUBLIC_PRIVACY_URL`) แล้วใส่ URL ใน Play Console (ข้อ 74) |
| N2.3 | Disclaimer ไม่ใช่อุปกรณ์การแพทย์ ไม่วินิจฉัย/รักษาโรค | ในแอป (N1.3), นโยบายความเป็นส่วนตัว หัวข้อ "ข้อมูลสุขภาพและคำเตือน", คำอธิบาย Play ใน `listing.*.md` | [ ] ตรวจว่าคำอธิบายที่วางใน Play มีย่อหน้านี้ |
| N2.4 | Data safety form | `store-metadata/privacy-labels.md` ข้อ 4 (Shared = No, encrypted in transit = Yes, OAuth, ลบบัญชีได้, ข้อมูล 6 ประเภท) | [ ] กรอกฟอร์ม + Delete account URL (ข้อ 73) · [ ] ตรวจว่า `.aab` ไม่มี `com.google.android.gms.permission.AD_ID` (หัวข้อ 8) |
| N2.5 | Free trial offer ตรงกับที่แสดงในแอป | ตารางค่าที่ต้องตั้งใน `play-declarations.md` ข้อ 6 · แอปอ่านจำนวนวันจาก offer จริง (`src/services/purchases/mapping.ts`) | [ ] สร้าง offer `free-trial-7d` (New customer acquisition, 7 วัน, ไม่มี tag `rc-ignore-offer`, ไม่มี offer อื่นบน base plan เดียวกัน) (ข้อ 52) · [ ] ทดสอบ P-01/P-02/P-09 ด้วย license tester |
| N2.6 | Content rating / Target audience / Ads / App access | `play-declarations.md` ข้อ 2–4 · `review-notes.md` ข้อ 2 | [ ] กรอกทุกหัวข้อใน App content ให้เป็นสีเขียว (ข้อ 74–76) |

### N3 — ทดสอบการซื้อ/ช่วงทดลองด้วย sandbox, TestFlight, license testers

| # | ข้อกำหนด | แอป/เอกสารทำให้แล้วที่ไหน | เจ้าของต้องทำ |
|---|---|---|---|
| N3.1 | เขียนวิธีทดสอบทุกสถานะ | `TEST_PLAN.md` ส่วน 2: P-01 เริ่มทดลอง · P-03 ทดลองหมดแล้วแปลงเป็นจ่าย · P-04 ยกเลิกระหว่างทดลอง · P-05 ซื้อขาด · P-06 รายเดือน→ซื้อขาด · P-07 restore · P-08 เปลี่ยนเครื่อง · P-09 ไม่มีสิทธิ์ทดลอง · P-10 grace/billing retry · P-11 คืนเงิน · P-12 ออฟไลน์ · P-14 ลบบัญชี · P-20 บัญชีผู้รีวิว | [ ] ทำจริงบน TestFlight/internal testing ของ build `production` ทั้ง iOS และ Android (ข้อ 68, 69) และบันทึกผลตามแบบฟอร์ม `TEST_PLAN.md` ส่วน 6 · [ ] แนบผลท้ายเอกสารนี้ (หัวข้อ 12) |

### N4 — Privacy Policy และ Terms (เทมเพลต)

| # | ข้อกำหนด | แอป/เอกสารทำให้แล้วที่ไหน | เจ้าของต้องทำ |
|---|---|---|---|
| N4.1 | ร่างเป็นเทมเพลต เจ้าของตรวจและรับผิดชอบสุดท้าย | `src/legal/content.ts` (ไทย+อังกฤษ), หน้า `/legal/[doc]`, สำเนาเว็บ `docs/legal/*` ด้วย `npm run legal:export` | ทำตามหัวข้อ 5 ทั้งหมด · [ ] ให้ผู้เชี่ยวชาญกฎหมายตรวจ (PDPA, GDPR ถ้าขายในยุโรป) |

### N5 — Accessibility

| # | ข้อกำหนด | แอป/เอกสารทำให้แล้วที่ไหน | เจ้าของต้องทำ |
|---|---|---|---|
| N5.1 | Contrast WCAG AA ทุกสีหลักทั้งสองโหมด | `npm run contrast` + `__tests__/theme/contrast.test.ts` (D44, D58) | [ ] รัน `npm run contrast` ต้องผ่าน |
| N5.2 | Font scaling | ทดสอบตาม `TEST_PLAN.md` ข้อ 3.2 | [ ] ขยายตัวอักษรสูงสุดบน iPhone และ Android จริง ดู Paywall + เซสชัน ต้องไม่ถูกตัด |
| N5.3 | VoiceOver / TalkBack | ปุ่มไอคอนมี `accessibilityLabel`, ปุ่มแตะ ≥ 48 | [ ] ทำตาม `TEST_PLAN.md` ข้อ 3.1 บนเครื่องจริงอย่างน้อย flow Paywall → ล็อกอิน → เซสชัน |

### N6 — Metadata, EAS Build/Submit, เช็กลิสต์

| # | ข้อกำหนด | แอป/เอกสารทำให้แล้วที่ไหน | เจ้าของต้องทำ |
|---|---|---|---|
| N6.1 | ชื่อ/subtitle/คำอธิบาย/คีย์เวิร์ด ไทย+อังกฤษ | `store-metadata/listing.th.md`, `listing.en.md` (นับตัวอักษรด้วย `node store-metadata/check-limits.js`), `app-names.md` | [ ] ทำหัวข้อ 9 (เลือกชื่อ กรอก placeholder) |
| N6.2 | ไอเดียภาพหน้าจอ 5 ภาพ | `store-metadata/screenshots.md` (แม่แบบ caption สองภาษา ขนาดที่สโตร์ต้องการ) · ภาพใน `docs/screenshots/` เป็นภาพจากพรีวิวเว็บ ใช้เป็นแนวทางเท่านั้น | [ ] ถ่ายจาก build จริง (ข้อ 79) |
| N6.3 | ไอคอน | `assets/icon.png` 1024² RGB ไม่มีช่องโปร่งใส · `android-icon-*` · `store-metadata/icon.md` | [ ] ยืนยันว่าพอใจ (ข้อ 3) · [ ] ทำไอคอน Play 512² และ feature graphic 1024×500 (ข้อ 78) |
| N6.4 | EAS Build/Submit | `eas.json` (หัวข้อ 2) | [ ] ทำหัวข้อ 2–3 |
| N6.5 | เช็กลิสต์ก่อนส่งรีวิว | ไฟล์นี้ + `TEST_PLAN.md` ส่วน 5 | [ ] ไล่ครบทุกหัวข้อ |

### N7, N8 (อ้างอิงสั้น)

- **N7 (ไม่ให้ถูกมองเป็นสแปม):** ข้อความหน้าร้านเน้นจุดเด่น 4 ข้อ (ตารางรายวันอิสระ, การ์ดวันนี้, progressive overload ปรับได้ตอนฝึก, สถิติ % ตามกรุ๊ป/กล้ามเนื้อ) ไม่มีคำว่า "#1/ดีที่สุด" ไม่มีราคา และไม่พูดถึงแพลตฟอร์มอื่น [ ] เลือกภาพหน้าจอที่โชว์จุดเด่นเหล่านี้ (`screenshots.md`) และไม่ใช้คีย์เวิร์ดชื่อคู่แข่ง
- **N8 (คุณภาพ):** `npm run check` ครอบคลุมสูตร, state machine ทุกสถานะ, Paywall, ซิงก์, webhook, ลบบัญชี, schema ตรงกันระหว่างเครื่องกับคลาวด์ — ดูหัวข้อ 11

---

## 2. โปรไฟล์ EAS และคำสั่ง build / submit

อ่านจาก `eas.json` (ที่ commit `88bfff2`) ทุกโปรไฟล์ `extends: base` (Node `22.22.0`) และ `cli.appVersionSource: remote` (EAS เก็บเลข build เอง)

| โปรไฟล์ | ใช้ทำอะไร | ค่าสำคัญ | EAS environment |
|---|---|---|---|
| `development` | development build บนเครื่องจริง | `developmentClient: true`, `distribution: internal` | `development` |
| `development-simulator` | iOS Simulator (ถ่ายภาพหน้าจอ, ดีบัก) | extends `development` + `ios.simulator: true` | `development` |
| `preview` | ทดสอบภายในที่พฤติกรรมเหมือน release | `distribution: internal`, Android เป็น APK | `preview` |
| `production` | ส่งสโตร์ | `autoIncrement: true` (เพิ่ม build number / versionCode ให้เอง) · distribution = store (ค่าเริ่มต้น) | `production` |

`submit.production`: iOS `ascAppId` (ต้องเปลี่ยนจาก `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` เป็นเลข Apple ID ของแอป, HUMAN_TASKS ข้อ 41) · Android `serviceAccountKeyPath: ./secrets/google-play-service-account.json`, `track: internal`, `releaseStatus: draft` (ต้องเข้า Play Console กด rollout เอง)

### ลำดับคำสั่ง

```bash
# 0) ในเครื่อง — ต้องผ่านทั้งหมดก่อน
npm ci && npm run check
RELEASE=1 npm test                       # guard เทมเพลตกฎหมาย (หัวข้อ 5) — ต้องผ่าน
npm run contrast
node store-metadata/check-limits.js --release

# 1) ตรวจ config ที่ EAS จะใช้
eas whoami && eas project:info           # ต้องเป็นโปรเจกต์ fitnese ของคุณ
eas env:list --environment production    # ครบตามหัวข้อ 4 และ EXPO_PUBLIC_USE_MOCKS=0

# 2) preview build บนเครื่องจริงก่อน (พฤติกรรมเหมือน release, ไม่มี mock)
eas build --profile preview --platform android
eas build --profile preview --platform ios

# 3) production build
eas build --profile production --platform ios
eas build --profile production --platform android
#   หรือ eas build --profile production --platform all

# 4) submit (ครั้งแรกของ Android ต้องอัปโหลด .aab เองผ่านเว็บ 1 ครั้ง — HUMAN_TASKS ข้อ 49)
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

- ห้ามใช้ `--local` ถ้า `.env` ในเครื่องตั้ง `EXPO_PUBLIC_USE_MOCKS=1` หรือคีย์ทดสอบ (build ในคลาวด์ไม่อ่าน `.env` เพราะอยู่ใน `.gitignore` แต่ build ในเครื่องอ่านได้)
- แอปไม่มี OTA update (ไม่มี `expo-updates`) ทุกการแก้โค้ดหรือแก้ `EXPO_PUBLIC_*` ต้อง build และ submit ใหม่
- iOS build ครั้งแรก EAS จะถามล็อกอิน Apple เพื่อสร้าง certificate / provisioning profile (HUMAN_TASKS ข้อ 39, 46)

- [ ] `eas.json`: `ascAppId` เป็นตัวเลขจริง · ไฟล์ `secrets/google-play-service-account.json` มีอยู่ (ไม่ถูก commit)
- [ ] build `preview` ทั้งสองแพลตฟอร์มติดตั้งและใช้งานได้ ล็อกอินเห็นหน้าเลือกบัญชีจริง (ไม่ใช่ mock)
- [ ] build `production` สำเร็จทั้งสองแพลตฟอร์ม จดเลข build ไว้ในบันทึกผลทดสอบ

---

## 3. เวอร์ชันและเลข build

- `version` ใน `app.config.ts` (ปัจจุบัน `'1.0.0'`) คือเวอร์ชันที่ผู้ใช้เห็น (แสดงในตั้งค่า → เกี่ยวกับ → เวอร์ชัน อ่านจาก `Constants.expoConfig.version`) แก้ให้ตรงกับ `version` ใน `package.json` ด้วย
- เลข build ของ iOS (`CFBundleVersion`) และ `versionCode` ของ Android ถูกจัดการโดย EAS (`appVersionSource: remote` + `autoIncrement: true` ในโปรไฟล์ `production`) ดู/ตั้งค่าได้ด้วย `eas build:version:get -p ios` / `-p android` และ `eas build:version:set -p ios` / `-p android` (ใช้เมื่อสโตร์มีเลข build ที่สูงกว่าอยู่แล้ว)
- ทุกครั้งที่ส่งสโตร์ใหม่: เลข build ต้องสูงกว่าที่เคยอัปโหลดทุกครั้ง · ถ้าเวอร์ชันก่อนหน้าผ่านรีวิวหรือขึ้นสโตร์แล้ว ต้องเพิ่ม `version` ด้วย (เช่น `1.0.1`)
- [ ] `version` ใน `app.config.ts` = `package.json` = เวอร์ชันที่เขียนใน "What's New"/release notes (`store-metadata/listing.*.md`)
- [ ] ไม่ต้องตั้ง `ios.buildNumber` / `android.versionCode` ใน `app.config.ts` (ปล่อยให้ EAS จัดการ ไม่งั้นขัดกับ remote versioning)
- [ ] `extra.eas.projectId` ใน `app.config.ts` ถูกเพิ่มแล้ว (HUMAN_TASKS ข้อ 21) — ที่ `88bfff2` ยังไม่มี `extra` ใน `app.config.ts` (เป็นขั้นของเจ้าของที่ต้องทำหลังสร้างโปรเจกต์ EAS ไม่ใช่ช่องโหว่ของโค้ด) ตรวจ: `grep -n projectId app.config.ts` ต้องเห็นบรรทัด

---

## 4. ตัวแปร environment สำหรับ release build

อ้างอิง `.env.example`, `src/services/config.ts` และตารางเต็มใน HUMAN_TASKS ข้อ 36–37 (รายการด้านล่างคือ "ค่าที่ต้องเห็นใน EAS environment `production`")

| ตัวแปร | ค่าใน production | หมายเหตุ |
|---|---|---|
| `EXPO_PUBLIC_USE_MOCKS` | `0` | release build บนมือถือ **ไม่ใช้ mock เสมอ** แม้ตั้งเป็น `1` (`decideMocks` ใน `src/services/config.ts`, D47, `__tests__/services/config.test.ts`) แต่ต้องตั้ง `0` ไว้ให้ชัด · preview ก็ต้อง `0` |
| `EXPO_PUBLIC_MOCK_SCENARIO` | ไม่ต้องตั้ง (ค่าเริ่มต้น `new`) | มีผลเฉพาะโหมด mock |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` | บังคับ (ขาด = release ใช้ไม่ได้) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key | บังคับ · **ห้าม** ใช้ `service_role` |
| `EXPO_PUBLIC_RC_IOS_KEY` | `appl_…` | ต้องมีอย่างน้อยหนึ่งแพลตฟอร์ม แต่ส่งทั้งสองสโตร์จึงต้องมีทั้งคู่ |
| `EXPO_PUBLIC_RC_ANDROID_KEY` | `goog_…` | **ห้าม** ใช้ secret key `sk_…` (ที่นั่นเป็นของ Edge Function เท่านั้น) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | OAuth web client ID | บังคับ (ขาด = release ใช้ไม่ได้) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | OAuth iOS client ID | จำเป็นสำหรับ Google บน iOS |
| `GOOGLE_IOS_URL_SCHEME` | reversed iOS client id | ใช้ตอน build เท่านั้น (`app.config.ts`) ค่า `com.googleusercontent.apps.placeholder` = ยังไม่ตั้ง → Google บน iOS ใช้ไม่ได้ |
| `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` | URL หน้าเว็บ (หัวข้อ 5) | ว่างได้ แต่สโตร์บังคับ Privacy URL จึงควรตั้ง |
| `APP_BUNDLE_ID` | `<BUNDLE_ID>` จริง | ตรงกับ App Store Connect / Play Console · ค่าเริ่มต้น `com.example.fitnese` ส่งสโตร์ไม่ได้ |
| `APPLE_TEAM_ID` | `<TEAM_ID>` | |

- [ ] `eas env:list --environment production` และ `--environment preview` เห็นครบตามตาราง · ทุกค่าเป็นค่าสาธารณะ ใช้ visibility `plaintext`/`sensitive` (HUMAN_TASKS ข้อ 37)
- [ ] ตรวจ bundle id จริง: `npx expo config --type public` ในเครื่องที่ตั้ง `APP_BUNDLE_ID` แล้ว ต้องเห็น `<BUNDLE_ID>` ทั้ง `ios.bundleIdentifier` และ `android.package` (ไม่ใช่ `com.example.fitnese`)
- [ ] ตรวจในแอปที่ติดตั้งจาก build `preview`: กด "Continue with Google" แล้วเห็นหน้าเลือกบัญชีจริง และ Paywall แสดงราคาจากสโตร์ (ไม่ใช่ ฿19.00 / ฿99.00 ของสโตร์จำลอง ยกเว้นราคาจริงบังเอิญเท่ากัน)
- [ ] ไม่มีความลับใน `EXPO_PUBLIC_*`: `service_role`, `sk_…`, ไฟล์ `.p8`, JWT ของ Apple, service account JSON (ความลับอยู่ใน Supabase secrets / `secrets/` เท่านั้น — HUMAN_TASKS ข้อ 38)

---

## 5. Privacy / Terms: URL สาธารณะและลบ placeholder ของเทมเพลต

ขั้นตอนเต็มอยู่ที่ HUMAN_TASKS ข้อ 12–14 ที่นี่คือสิ่งที่ต้องเห็นก่อนส่ง

**สถานะโค้ด (ที่ `88bfff2`):** ป้าย `legal.templateNotice` ("Template — the developer must review…" / "เทมเพลต — ผู้พัฒนาต้องตรวจ…") ใน `src/app/legal/[doc].tsx` แสดงเฉพาะเมื่อ `hasPlaceholders(content)` (`src/legal/content.ts`) พบค่า `PLACEHOLDERS` ตัวใดตัวหนึ่งในเอกสาร และมีเทสต์ guard ใน `__tests__/legal.test.ts` ที่ทำงานเฉพาะเมื่อ `RELEASE=1` (ถ้าไม่ตั้ง จะแสดงเป็นเทสต์ที่ถูกข้าม) แล้วล้มจนกว่าจะกรอก placeholder ครบทุกเอกสารทุกภาษา (เทสต์ข้อ 5.1 ใน `TEST_PLAN.md`) ดังนั้นแอปที่ส่งสโตร์จะไม่มีป้ายเทมเพลตก็ต่อเมื่อกรอกครบแล้ว

- [ ] กรอกค่าใน `PLACEHOLDERS` ครบแล้ว 3 ตัว (`developer`, `contact`, `address`) เหลือ `effective` (วันที่มีผล) กรอกวันที่เผยแพร่จริง — กฎหมายที่ใช้บังคับตัดสินใจแล้ว: กฎหมายไทย ศาลที่มีเขตอำนาจในกรุงเทพมหานคร (D78) ด้วยข้อมูลจริง และอ่านทุกหัวข้อทั้งไทย/อังกฤษให้ตรงกับธุรกิจจริง · ตรวจเอง: คำสั่งนี้ต้องไม่พิมพ์อะไรออกมา
  ```bash
  grep -nE "/ (Developer name|Contact email|Address|Effective date)\]" src/legal/content.ts
  ```
- [ ] `RELEASE=1 npm test` ผ่าน (guard ของเทมเพลต: ตัวเทสต์ "has no placeholders left in any legal document" ต้องไม่ถูกข้าม) · ห้ามข้ามขั้นนี้
- [ ] เปิดแอป (build `preview`) → Paywall → Privacy Policy และ Terms ทั้งภาษาไทยและอังกฤษ: ไม่เห็นป้ายเทมเพลต ไม่มีวงเล็บเหลี่ยม `[…]` ค้างในหัวข้อ "ติดต่อ"/"Contact" และวันที่มีผล
- [ ] `npm run legal:export` แล้ว **ลบบรรทัดหมายเหตุ `> เทมเพลต —` / `> Template —`** ออกจากสำเนาที่จะเผยแพร่ (สคริปต์ใส่ให้ทุกครั้ง, HUMAN_TASKS ข้อ 13)
- [ ] โฮสต์ Privacy + Terms เป็นหน้าเว็บสาธารณะ (ไทยและอังกฤษ) เปิดได้โดยไม่ล็อกอิน · หน้า Privacy มีหัวข้อวิธีลบบัญชีและอีเมลติดต่อ (Google Play ต้องการลิงก์ขอลบข้อมูลบนเว็บ)
- [ ] ตั้ง `EXPO_PUBLIC_PRIVACY_URL` และ `EXPO_PUBLIC_TERMS_URL` ใน EAS `production` และ `preview` แล้ว build ใหม่ — ปุ่ม "Open web version" ในหน้า `/legal/[doc]` ต้องเปิดหน้าเว็บนั้นได้
- [ ] URL เดียวกันนี้ใส่ใน App Store Connect (App Information → Privacy Policy URL), Play Console (App content → Privacy policy), Google OAuth consent screen (HUMAN_TASKS ข้อ 30) และแทน `<PRIVACY_URL>` / `<TERMS_URL>` ใน `store-metadata/`
- [ ] ชื่อผู้พัฒนาและอีเมลติดต่อใน Privacy/Terms ตรงกับชื่อบัญชีนักพัฒนาในสโตร์และ `<CONTACT_EMAIL>` ใน `store-metadata/`
- [ ] เนื้อหาหัวข้อ "ข้อมูลที่เราเก็บ" และ "การเก็บรักษาและการลบข้อมูล" ใน `src/legal/content.ts` ตรงกับ `store-metadata/privacy-labels.md` · **จุดเปิดที่รู้อยู่แล้ว:** โค้ดลบ `revenuecat_events` ที่เก่ากว่า 90 วันอัตโนมัติแล้ว (migration `20261011000000`) แต่ข้อความ "การเก็บรักษาและการลบข้อมูล" ในแอปยังไม่พูดถึง (ไม่ขัดแย้ง เพราะเก็บสั้นกว่าที่บอก) ให้เจ้าของตัดสินว่าจะให้ผู้พัฒนาเพิ่มประโยคนี้ทั้งไทย/อังกฤษหรือไม่ — ดู `privacy-labels.md` ข้อ 2.5

---

## 6. Supabase: migration, Edge Functions, secrets

ขั้นตอนเต็ม: HUMAN_TASKS ข้อ 15–20, 29, 62–63, 70, 85 รายการด้านล่างคือผลที่ต้องตรวจก่อนส่ง

- [ ] `npm run supabase:verify` ผ่าน และ `deno check supabase/functions/revenuecat-webhook/index.ts supabase/functions/delete-account/index.ts` ผ่าน (ข้อ 16)
- [ ] `node scripts/sync-shared.js` แล้ว `__tests__/shared.test.ts` ผ่าน (สำเนา state machine ใน `supabase/functions/_shared/` ตรงกับ `src/domain/entitlement/machine.ts`)
- [ ] **migration ครบทุกไฟล์** ใน `supabase/migrations/` ถูก push แล้ว: ที่ `88bfff2` มี 3 ไฟล์ — `20261009000000_init.sql`, `20261010000000_session_progression.sql` (คอลัมน์ `workout_session.progression` — แอปเขียนคอลัมน์นี้ ถ้าไม่ push การซิงก์เซสชันจะล้ม) และ `20261011000000_revenuecat_events_retention.sql` (ฟังก์ชัน `purge_revenuecat_events` ที่ Edge Function `revenuecat-webhook` เรียกหลังบันทึกเหตุการณ์ — ถ้าไม่ push จะมีแต่ log ข้อผิดพลาด `revenuecat_events purge failed` และแถวเก่าไม่ถูกลบ) ตรวจด้วย
  ```bash
  npx supabase migration list      # ทุกแถวต้องมีทั้งคอลัมน์ Local และ Remote
  ```
  (ข้อ 17 ใน HUMAN_TASKS พูดถึงแค่ไฟล์ init แต่ `db push` รันทุกไฟล์ที่ค้าง) `npm run supabase:verify` ก่อน push · **deploy Edge Function `revenuecat-webhook` ใหม่หลัง push migration** เพื่อให้เวอร์ชันที่เรียก purge ขึ้นระบบ
- [ ] Table Editor: ทั้ง 13 ตาราง (`user_entitlements`, `revenuecat_events`, `profile`, `custom_exercise`, `program`, `routine`, `routine_exercise`, `week_plan`, `day_override`, `workout_session`, `session_exercise`, `session_set`, `daily_log`) มีป้าย RLS enabled
- [ ] Edge Functions deploy แล้ว และตั้ง JWT ถูกต้อง: `revenuecat-webhook` **ปิด** Enforce JWT (`--no-verify-jwt`), `delete-account` **เปิด** (ข้อ 18) ตรวจด้วย `npx supabase functions list`
- [ ] Secrets ตั้งครบ ตรวจชื่อด้วย `npx supabase secrets list`: `REVENUECAT_WEBHOOK_SECRET`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_CLIENT_ID` (= bundle id), `REVENUECAT_SECRET_API_KEY` (แนะนำ) — `APPLE_CLIENT_ID` ต้องตรงกับ `<BUNDLE_ID>` ที่ส่งสโตร์จริง (ข้อ 29, 38, 63)
- [ ] smoke test webhook (ข้อ 18): ส่ง secret ผิด → 401 `{"error":"unauthorized"}`; ส่งถูก → 200 `{"ignored":true}`
- [ ] Authentication → Providers: Google และ Apple เปิดพร้อม Client IDs ที่รวมทุกแพลตฟอร์ม (ข้อ 28, 34) · Email provider **ปิด** (ข้อ 20) · URL Configuration: Site URL `fitnese://`, Redirect `fitnese://auth-callback` (ข้อ 19)
- [ ] โปรเจกต์ Supabase ไม่ใช่แผนฟรีที่ pause ได้ ถ้าจะเปิดตัวจริง (ข้อ 8) · มีการสำรองข้อมูลตามแผนที่เลือก
- [ ] ตรวจหลัง deploy ตามข้อ 70 (2 บัญชี 2 เครื่องข้อมูลไม่ปน, ออฟไลน์แล้วซิงก์, ลบบัญชีจริง) และดู Edge Functions → Logs ว่าไม่มี error

---

## 7. RevenueCat และสินค้าในสโตร์

ขั้นตอนเต็ม: HUMAN_TASKS ข้อ 41–47 (App Store), 48–56 (Play), 57–58 (ราคา), 59–64 (RevenueCat)

- [ ] **Products 4 รายการ** ใน RevenueCat: App Store `fitnese_monthly`, `fitnese_lifetime` · Play `fitnese_monthly:monthly`, `fitnese_lifetime` — สถานะฝั่งสโตร์ "Ready to Submit"/Active (สินค้า "Missing Metadata" จะไม่โหลดใน sandbox)
- [ ] **Entitlement `pro`** (ตรงกับ `ENTITLEMENT_ID` ใน `src/domain/entitlement/machine.ts`) แนบครบทั้ง 4 สินค้า
- [ ] **Offering `default` เป็น Current** มี `$rc_monthly` (→ `fitnese_monthly` / `fitnese_monthly:monthly`) และ `$rc_lifetime` (→ `fitnese_lifetime` ทั้งสองสโตร์) · ถ้าไม่ตรง Paywall แสดง "Plans can't be loaded from the store right now."
- [ ] **ช่วงทดลอง 7 วัน**: App Store = introductory offer Free · 1 Week · ทุกประเทศ · No End Date บน `fitnese_monthly` (ข้อ 43) · Google Play = offer `free-trial-7d` บน base plan `monthly` (New customer acquisition → Never had this subscription, ไม่มี tag `rc-ignore-offer`, ไม่มี offer อื่นบน base plan เดียวกัน) (ข้อ 52) · ซื้อขาดไม่มีทดลอง
- [ ] **ราคา**: ตารางข้อ 58 (ราคาที่ตั้งจริงเทียบเป้า 19/99 บาท, ราคาที่ Paywall แสดง) กรอกครบทั้ง 4 แถว · คำอธิบายใน `store-metadata/` ไม่ระบุราคา จึงไม่ต้องแก้ข้อความเมื่อราคาเปลี่ยน
- [ ] **Grace period / billing retry** ตั้งตามข้อ 45 และ 53 และกรอกตาราง grace ในข้อ 58 · Family Sharing ไม่เปิด
- [ ] **Credential ใน RevenueCat** สถานะ Valid ทั้ง App Store (In-app purchase key, App-specific shared secret, App Store Connect API) และ Play (service account JSON) (ข้อ 59, 60)
- [ ] **Webhook** → `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`, Authorization = `Bearer <WEBHOOK_SECRET>` ตรงกับ secret `REVENUECAT_WEBHOOK_SECRET`, Environment = **Production and Sandbox**, Events/Apps = ทั้งหมด · กด "Send test event" ได้ HTTP 200 และมีแถว `type = TEST` ใน `revenuecat_events` (ข้อ 62)
- [ ] **การแจ้งเตือนจากสโตร์**: App Store Server Notifications v2 ชี้ไป RevenueCat ทั้ง Production และ Sandbox (ข้อ 47) · Play RTDN ชี้ topic ของ RevenueCat และ "Send test notification" สำเร็จ (ข้อ 56)
- [ ] **ข้อตกลงและบัญชีรับเงิน**: Paid Apps Agreement สถานะ Active (ข้อ 5) · payments profile ของ Play พร้อม (ข้อ 6)
- [ ] ทดสอบครบวงจรหนึ่งรอบ (ข้อ 64): ซื้อทดลอง → RevenueCat เห็น entitlement `pro` → `user_entitlements.state = TRIALING` → แอปแสดงวันสิ้นสุดทดลอง
- [ ] สินค้าชุดแรกของ App Store ต้องส่งพร้อมเวอร์ชันแอป: ที่หน้าเวอร์ชัน → In-App Purchases and Subscriptions → เลือก `fitnese_monthly` และ `fitnese_lifetime` (ข้อ 81)

---

## 8. Privacy manifest, สิทธิ์ และ Advertising ID

**iOS** — `app.config.ts` → `ios.privacyManifests` · `ITSAppUsesNonExemptEncryption: false` (ไม่ต้องตอบ export compliance ทุกครั้งที่อัปโหลด)

- [ ] `NSPrivacyTracking: false` และ `NSPrivacyTrackingDomains: []` ✓ (มีแล้วที่ `88bfff2`)
- [ ] **`NSPrivacyCollectedDataTypes` ต้องระบุ 6 ประเภทตาม `COLLECTED_DATA_TYPES` ใน `app.config.ts` และ `store-metadata/privacy-labels.md` ข้อ 3.2/3.5:** Email Address, User ID, Health (ส่วนสูง น้ำหนักตัว แคลอรี่ที่กิน), Fitness, Purchase History, Other Data Types (เพศ อายุ) — ทุกรายการ `Linked = true`, `Tracking = false`, purpose = App Functionality (ที่ `88bfff2` ตรงกันแล้ว) ตรวจกับ build ที่จะส่ง:
  ```bash
  npx expo config --type introspect | grep -A60 privacyManifests
  ```
- [ ] ป้ายใน App Store Connect (ข้อ 72: ติ๊ก Email Address, Health, Fitness, Purchase History, User ID, **Other Data Types**) ตรงกับ manifest ตรงกับ Data safety (ข้อ 73: เพศ/อายุอยู่ใน Personal info → Other info) ตรงกับ Privacy Policy ในแอป — สี่ที่ต้องเหมือนกัน
- [ ] `NSPrivacyAccessedAPITypes: []` ในแอป: manifest ของ React Native / Expo / SDK ที่ใช้ถูกรวมเข้า build เอง ตรวจให้แน่ใจโดยอย่างใดอย่างหนึ่ง: (ก) Xcode → Archive → Generate Privacy Report (ต้องใช้ Mac) หรือ (ข) หลังอัปโหลดขึ้น TestFlight ดูอีเมลจาก App Store Connect ว่ามีคำเตือน "Missing privacy manifest / API usage" หรือไม่ ถ้ามี ให้ผู้พัฒนาเพิ่ม reason ใน `NSPrivacyAccessedAPITypes` แล้ว build ใหม่
- [ ] ไม่มีหน้าขอ App Tracking Transparency (ไม่ใช้ IDFA) และ `Info.plist` ไม่มี `NSFaceIDUsageDescription` (D46) · `NSLocalNetworkUsageDescription` ที่มาจาก `expo-dev-client` อาจยังอยู่ใน `Info.plist` (D46) — ถ้าผู้รีวิวถาม ตอบว่ามาจากเครื่องมือพัฒนา ไม่ได้ใช้ในแอปที่ปล่อย

**Android**

- [ ] `android.blockedPermissions` ใน `app.config.ts` ตัด `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO` แล้ว · สิทธิ์ที่คาดว่าจะเหลือ: `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, `com.android.vending.BILLING` (D46)
- [ ] ตรวจ manifest ของ `.aab` ที่จะส่ง: Play Console → App bundle explorer → Permissions หรือ `bundletool dump manifest --bundle=app.aab` — **ต้องไม่มี** `com.google.android.gms.permission.AD_ID` (ตอบ Advertising ID = No) ถ้ามี ให้ผู้พัฒนาเพิ่มใน `blockedPermissions` แล้ว build ใหม่ (`play-declarations.md` ข้อ 4)

---

## 9. Metadata, ภาพหน้าจอ และไอคอน

ลำดับ placeholder ที่ต้องกรอกอยู่ใน [../store-metadata/README.md](../store-metadata/README.md)

- [ ] เลือกชื่อแอปจริง (HUMAN_TASKS ข้อ 1) และจองด้วยการสร้าง app record · ถ้าเปลี่ยนจาก "Fitnese" แก้ตามข้อ 1 (โค้ด + `store-metadata/`) แล้ว `npm run check`
- [ ] กรอก placeholder ครบ แล้ว `node store-metadata/check-limits.js --release` ผ่าน (ตรวจขีดจำกัด: ชื่อ ≤ 30, subtitle ≤ 30, promo ≤ 170, description ≤ 4000, keywords ≤ 100; Play short ≤ 80, full ≤ 4000, release notes ≤ 500) และตัวนับของคอนโซลไม่ขัดกัน
- [ ] รายการ "ตรวจก่อนปล่อย" ใน `store-metadata/README.md` รันครบกับ build ที่จะส่ง: ข้อความไม่อ้างฟีเจอร์ที่ build นั้นไม่มี
- [ ] ข้อความหน้าร้านทั้งไทยและอังกฤษใส่ครบใน App Store Connect (Name, Subtitle, Promotional Text, Description, Keywords, Support URL, Marketing URL ถ้ามี, Copyright, Category = Health & Fitness) และ Play (App name, Short/Full description, Category, อีเมลติดต่อ) — ช่อง "What's New" ของ App Store ปกติไม่มีให้กรอกในเวอร์ชันแรก
- [ ] ภาพหน้าจอ 5 ภาพ × ไทย/อังกฤษ **ถ่ายจาก build จริง** (ไม่ใช่ภาพใน `docs/screenshots/`) ขนาดตามที่คอนโซลแจ้ง (iPhone 6.9" เป็นชุดหลัก; แอปตั้ง `supportsTablet: false` จึงไม่ต้องมีภาพ iPad; Play 2–8 ภาพ ด้านยาวไม่เกิน 2 เท่าของด้านสั้น) ไม่มีราคา อีเมลจริง หรือป้ายโหมดพัฒนา — ภาพ Paywall ถ้าจะใช้ต้องถ่ายจากสโตร์จริงเท่านั้น (`screenshots.md`)
- [ ] ไอคอน: `assets/icon.png` (1024², ไม่มีโปร่งใส) ยืนยันแล้ว · ไอคอน Play 512² + feature graphic 1024×500 อัปโหลดแล้ว (ข้อ 78)
- [ ] Age rating (App Store) และ Content rating (Play) ตอบตามจริง (ข้อ 75) · Support URL เปิดได้และมีช่องทางติดต่อ

---

## 10. App Review Notes และบัญชีผู้รีวิว

- [ ] วางบล็อก Notes จาก `store-metadata/review-notes.md` ใน App Store Connect → หน้าเวอร์ชัน → App Review Information (Sign-in required = Yes, ใส่บัญชี Google ผู้รีวิว, ชื่อและเบอร์ติดต่อจริง) และบล็อก "App access" ใน Play Console
- [ ] **เปิดแอปไล่ทุกเส้นทางเมนูที่ระบุในโน้ตบน build ที่จะส่งจริง** (ตั้งค่า → สมาชิก → จัดการสมาชิก/อัปเกรดเป็นซื้อขาด/กู้คืน, ตั้งค่า → บัญชี → ลบบัญชีและข้อมูล, Paywall → เฟือง → บัญชีและการตั้งค่า, ตั้งค่า → เกี่ยวกับ → Privacy/Terms/แหล่งอ้างอิง) ชื่อเมนูในโน้ตเป็นภาษาอังกฤษตาม `src/i18n/locales/en/*`
- [ ] บัญชี Google ของผู้รีวิว: บัญชีใหม่ ปิด 2-Step Verification ล็อกอินครั้งแรกบนเครื่องใหม่ให้ผ่านแล้ว เป็น Play license tester **ยังไม่เคยซื้อหรือเริ่มทดลองด้วยบัญชีนี้** (ให้ผู้รีวิวเห็น flow ทดลองฟรี) (ข้อ 69, 71)
- [ ] ทดสอบล็อกอินด้วยบัญชีผู้รีวิวบน build ที่จะส่ง 1 ครั้ง **เฉพาะขั้นล็อกอิน ห้ามกดซื้อหรือเริ่มทดลอง** (การล็อกอินอย่างเดียวไม่ใช้สิทธิ์ทดลองของสโตร์) แล้วออกจากระบบ ส่วนการทดสอบซื้อ/ทดลองให้ใช้บัญชีทดสอบอีกบัญชีหนึ่ง เพราะสิทธิ์ทดลองฟรีของสโตร์ที่ใช้ไปแล้วกลับคืนไม่ได้
- [ ] แนบวิดีโอสั้น (ไม่บังคับแต่แนะนำ) ตั้งค่าเริ่มต้น → Paywall → ล็อกอิน → ซื้อ sandbox → วันนี้ → ลบบัญชี
- [ ] ข้อความโน้ตกล่าวถึงเฉพาะสิ่งที่ build นี้มีจริง (รันรายการ "ตรวจก่อนปล่อย" ใน `store-metadata/README.md`)

---

## 11. ทดสอบก่อนส่ง (สรุป — รายละเอียดใน TEST_PLAN)

- [ ] `npm ci && npm run check` ผ่าน จดจำนวนชุด/ข้อทดสอบ (ตาม `PROGRESS.md` ที่ปิดงานล่าสุด: 55 ชุด / 682 ข้อผ่าน + 1 ข้ามโดยตั้งใจ ซึ่งคือ guard `RELEASE` ของเอกสารกฎหมาย — เอกสารนี้ไม่ได้รันชุดเทสต์ทั้งหมดซ้ำ)
- [ ] `npx expo export` (iOS/Android) และ `npx expo prebuild --clean --no-install` ผ่าน แล้วลบโฟลเดอร์ `ios/` `android/` (ถูก `.gitignore` อยู่แล้ว)
- [ ] `TEST_PLAN.md` ส่วน 5 (regression ก่อนทุก release) ทำครบ ส่วน 2 (P-01…P-20) ทำครบบนเครื่องจริงทั้ง iOS และ Android จาก build `production` ผ่าน TestFlight / Internal testing
- [ ] `grep -rn "TODO\|FIXME" src supabase scripts` ว่าง หรือทุกรายการบันทึกใน `docs/PROGRESS.md`
- [ ] ติดตั้งทับเวอร์ชันก่อนหน้า (ถ้ามี) ข้อมูลในเครื่องและสิทธิ์ไม่หาย (`TEST_PLAN.md` ข้อ 5.5)

---

## 12. Go / No-Go สุดท้าย

**ต้องตอบ "ใช่" ทุกข้อจึงกดส่งได้ (blocker)**

| # | เงื่อนไข | ตรวจที่ |
|---|---|---|
| 1 | `npm run check`, `npm run contrast`, `RELEASE=1 npm test`, `node store-metadata/check-limits.js --release` ผ่านบนโค้ดที่จะ build | หัวข้อ 2, 5, 9, 11 |
| 2 | EAS `production` มี `EXPO_PUBLIC_USE_MOCKS=0` และคีย์ครบ; app ที่ติดตั้งจาก `preview`/TestFlight ล็อกอินกับ Google/Apple จริงและเห็นราคาจากสโตร์จริง | หัวข้อ 4 |
| 3 | Privacy/Terms กรอกครบ ไม่มีป้ายเทมเพลต โฮสต์เป็นเว็บแล้ว URL ตรงกันทุกที่ และเจ้าของ (หรือผู้เชี่ยวชาญ) รับรองเนื้อหาแล้ว | หัวข้อ 5 |
| 4 | Supabase: migration ครบ, Edge Functions deploy พร้อม JWT ถูกต้องและ secrets ครบ, Apple/Google provider ตั้งแล้ว, Email provider ปิด, smoke test ผ่าน | หัวข้อ 6 |
| 5 | RevenueCat: 4 products, entitlement `pro`, offering `default` เป็น Current, webhook ทดสอบ 200, credential Valid; สินค้าในสโตร์สถานะพร้อม; ทดลอง 7 วันตั้งตรงตาม SPEC B1 | หัวข้อ 7 |
| 6 | ตารางราคา "ราคาที่ตั้งได้จริง" (HUMAN_TASKS ข้อ 58) กรอกครบ และราคาที่ Paywall ตรงกับสโตร์ | หัวข้อ 7 |
| 7 | Privacy manifest ระบุ 6 ประเภทข้อมูล (รวม Other Data Types) ตรงกับป้าย App Store, Data safety และ Privacy Policy; `.aab` ไม่มี AD_ID | หัวข้อ 8 |
| 8 | ทดสอบ P-01…P-14 ผ่านบนทั้ง iOS และ Android เป็นอย่างน้อย (รวมลบบัญชีด้วยบัญชี Apple บน iPhone); P-15…P-20 ทำตามที่เกี่ยวกับรุ่นนี้ (P-19 เฉพาะ Android) | หัวข้อ 11, `TEST_PLAN.md` |
| 9 | คำเตือนสุขภาพ + ลิงก์แหล่งอ้างอิงครบตาม SPEC H5/H6 ใน build ที่ส่ง; ปุ่ม Restore / จัดการสมาชิก / Privacy / Terms / แหล่งอ้างอิง / ลบบัญชี ใช้ได้ | N1.3, หัวข้อ 11 |
| 10 | ภาพหน้าจอจาก build จริง ข้อความหน้าร้านไม่อ้างฟีเจอร์ที่ไม่มี; App Review Notes ตรงกับเมนูจริง; บัญชีผู้รีวิวยังไม่เคยซื้อ | หัวข้อ 9, 10 |
| 11 | `eas.json` มี `ascAppId` จริง, `version` และเลข build ถูกต้อง, บัญชีสโตร์พร้อม (Paid Apps Agreement Active, Play ผ่านเงื่อนไข Closed testing ถ้าต้องมี) | หัวข้อ 2, 3, 7 |

**ถ้าข้อใดข้อหนึ่งด้านล่างเกิดขึ้น = No-Go**

- Paywall ใน build จริงแสดง ฿19.00 / ฿99.00 โดยราคาที่ตั้งในสโตร์ไม่ใช่ค่านั้น (แปลว่าอาจยังเป็นโหมด mock) หรือล็อกอินผ่านทันทีโดยไม่เห็นหน้าเลือกบัญชี
- Paywall โฆษณาทดลองฟรีกับบัญชีที่เคยใช้แล้ว (P-09 ไม่ผ่าน) หรือข้อความทดลอง/ราคาไม่ตรงกับหน้าต่างซื้อของสโตร์
- สามารถเริ่มซื้อหรือทดลองก่อนล็อกอินได้ (B4)
- ป้ายเทมเพลตกฎหมายหรือ `[…]` ยังอยู่ในแอป/หน้าเว็บ
- ป้ายความเป็นส่วนตัวกับ privacy manifest/ข้อมูลจริงไม่ตรงกัน (เช่น manifest ไม่ตรงกับป้าย, พบ Name จาก Google/Apple แต่ไม่ได้ประกาศ)
- ลบบัญชีล้มเหลว หรือ log ของ `delete-account` มี error ตอนเพิกถอน Apple
- webhook ล้ม (ซิงก์ค้างที่ "รอยืนยันสมาชิก" เป็นเวลานาน)
- ผู้ใช้ไม่มีสิทธิ์แล้วข้อมูลเดิมหาย (ต้องไม่หาย — B3)

**เมื่อกดส่งแล้ว:** บันทึกวัน/เลข build ที่ส่ง · ตั้งเตือนต่ออายุ Apple OAuth secret (≤ 6 เดือน), Apple Developer รายปี (ข้อ 82–83) · วันแรกหลังปล่อยดู RevenueCat → Webhooks และ Supabase → Edge Functions → Logs (ข้อ 84, `TEST_PLAN.md` ข้อ 5.5)

### บันทึกการตัดสินใจ (กรอกตอนส่ง)

| รายการ | ค่า |
|---|---|
| เวอร์ชัน / เลข build iOS | |
| เวอร์ชัน / versionCode Android | |
| commit ที่ build | |
| ผู้ตรวจ / วันที่ | |
| ผลทดสอบ `TEST_PLAN.md` ส่วน 6 (ลิงก์) | |
| ผล go / no-go | |
