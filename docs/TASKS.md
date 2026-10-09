# รายการงานเฟส 2 (TASKS)

> ทำตามลำดับ (งานในระลอกเดียวกันทำคู่ขนานได้เพราะแตะไฟล์คนละชุด) — หลังจบแต่ละงาน: `npm run check` ผ่าน → อัปเดต [PROGRESS.md](PROGRESS.md) → commit
> เกณฑ์ผ่านทุกงาน: typecheck + lint (`--max-warnings 0`) + เทสต์ทั้งหมดผ่าน, ไม่มีข้อความฮาร์ดโค้ดใน UI, คำแปล th/en ครบ, ไม่มี TODO ที่ไม่ได้บันทึกใน PROGRESS.md

## ระลอก 0 — เฟส 1 (เสร็จแล้ว)

| งาน | ผลลัพธ์ |
|---|---|
| P1 | โครงโปรเจกต์ Expo 57, theme tokens + คอมโพเนนต์ DS, i18n โครง, Drizzle schema + migration runner, state machine สิทธิ์ + paywall model + เทสต์, service interface + mock, ทุกหน้าเป็น placeholder ในธีมจริง, AccessGate |
| P2 | เอกสาร ARCHITECTURE / DATA_MODEL / SCREENS / DESIGN_SYSTEM / TASKS / HUMAN_TASKS / TEST_PLAN / OPEN_QUESTIONS / DECISIONS |

## ระลอก A — ตรรกะล้วน + ข้อมูลตั้งต้น

### T01 สูตรโปรไฟล์และโภชนาการ (H1–H3)
- ไฟล์: `src/domain/units.ts`, `src/domain/nutrition.ts`, เทสต์ `__tests__/domain/nutrition.test.ts`
- ฟังก์ชัน: แปลงหน่วย kg↔lb, cm↔ft/in; `bmr` (Mifflin-St Jeor ชาย/หญิง), `tdee` (ตัวคูณ 1.2/1.375/1.55/1.725/1.9), `targetCalories` (ลด −20% ปรับ 10–25%, คงที่, เพิ่ม +10% ปรับได้; พื้นขั้นต่ำ 1,200 หญิง / 1,500 ชาย; อายุ < 18 ไม่ให้เป้าลดน้ำหนัก), `macros` (โปรตีน 1.6–2.2 g/kg ตามเป้า ลดไขมัน = ปลายสูง, ไขมัน ~25%, คาร์บ = ที่เหลือ, แก้สัดส่วนได้), `exerciseKcal` (MET × kg × ชั่วโมง; เบา 3.5 / ปานกลาง 5 / หนัก 6 แก้ได้), `dailyExpenditure` (ค่าที่กรอกเองชนะค่าคำนวณ + ธงว่ากรอกเอง H3)
- เกณฑ์ผ่าน: เทสต์ครอบทุกสูตร ค่าขอบ (อายุ 17/18, พื้นแคลอรี่, หน่วย), ค่าตัวอย่างคำนวณมือตรงกัน

### T02 Progressive overload (G2)
- ไฟล์: `src/domain/progression.ts` + `__tests__/domain/progression.test.ts`
- โหมด: ปิด / Double (ค่าเริ่มต้น) / Linear / กำหนดเองรายสัปดาห์; ก้าวน้ำหนัก 2.5 kg / 5 lb (ปรับ 1.25 ได้), RIR/RPE ไม่บังคับ
- Double: ครบทุกเซ็ตที่เพดานช่วงครั้ง → +ก้าว แล้วกลับขอบล่าง; ไม่ถึง → น้ำหนักเดิม เป้า +1 ครั้ง
- Linear: ครบตามเป้า → +ก้าวครั้งถัดไป; พลาดติดกัน 2 ครั้ง → แนะนำลด ~10% (ปฏิเสธได้)
- ผลลัพธ์เป็น "คำแนะนำ" (accept/adjust/skip) และคำนวณเป้าครั้งหน้าอัตโนมัติ, รองรับ "ใช้เฉพาะวันนี้" / "ใช้ต่อไป"
- เกณฑ์ผ่าน: เทสต์ทุกโหมด ทุกกิ่งเงื่อนไข การปัดน้ำหนักตามก้าว และหน่วย lb

### T03 ตารางและวัน (D, E)
- ไฟล์: `src/domain/dates.ts`, `src/domain/schedule.ts` + เทสต์
- วันที่ท้องถิ่น YYYY-MM-DD, ช่วงวัน/สัปดาห์ (วันเริ่มต้น จ./อา.)/เดือน/ปี, `resolveDayPlan(weekPlan, overrides, date)` (หลาย routine ต่อวัน, routine ซ้ำหลายวัน, override: rest/routine/empty ไม่แก้ตารางหลัก), `copyDay(from,to)`, `toggleDay`, ประมาณเวลาเซสชันจากจำนวนเซ็ต/เวลาพัก
- เกณฑ์ผ่าน: เทสต์ครอบทุกกรณีของ E และการข้ามเดือน/ปี

### T04 สถิติ (I1–I5)
- ไฟล์: `src/domain/stats.ts` + `__tests__/domain/stats.test.ts`
- เปอร์เซ็นต์แบบ largest remainder ผลรวม = 100 เสมอ (ทศนิยมตามที่กำหนด), 3 มุมมอง (กรุ๊ป, ประเภท routine ภายในกรุ๊ป, กลุ่มกล้ามเนื้อหลัก), 3 ตัวชี้วัด (เซ็ตที่เสร็จ (ค่าเริ่มต้น)/ปริมาณรวม/จำนวนเซสชัน), คิดจาก snapshot ของเซสชัน (programName/routineType/muscleGroup) เท่านั้น, สรุปพลังงาน (I3), แนวโน้มน้ำหนัก, 1RM Epley (I4), กรองตามกรุ๊ป (I5), สถานะว่าง
- เกณฑ์ผ่าน: property test ผลรวม 100% กับข้อมูลสุ่ม, เทสต์ว่าการแก้/ลบ routine ไม่เปลี่ยนสถิติ

### T05 คลังท่า + เทมเพลต (F4, F5, F7, F8, F9)
- ไฟล์: `src/data/exercises.json` (120–150 ท่า สองภาษา กลุ่มหลัก 1 + รอง, อุปกรณ์, คำอธิบายสั้นที่เขียนเอง, มีท่าบอดี้เวทครบ), `src/data/exerciseLibrary.ts` (ค้นหา/กรอง), `src/data/templates.ts` (PPL 3 และ 6 วัน, Upper/Lower, Full Body 3 วัน, Bro Split, 5x5 มือใหม่ พร้อมท่า/เซ็ต/ครั้ง/แท็กประเภท/วันในสัปดาห์อัตโนมัติ) + เทสต์ตรวจความถูกต้องของข้อมูล
- เกณฑ์ผ่าน: id ไม่ซ้ำ, ทุกท่ามีกลุ่มหลักใน 11 กลุ่ม F8, ชื่อไทย/อังกฤษครบ, ทุกท่าในเทมเพลตมีอยู่ในคลัง, ไม่มีรูป/วิดีโอ

### T08 Supabase backend (J6, L, B12)
- ไฟล์: `supabase/migrations/*.sql` (ตารางเหมือนในเครื่อง + `user_id`, `server_updated_at`, trigger LWW, RLS + `has_sync_access`, `user_entitlements`), `supabase/functions/revenuecat-webhook/` (ใช้ state machine สำเนา), `supabase/functions/delete-account/` (เพิกถอน Apple + ลบข้อมูล + ลบผู้ใช้), `supabase/config.toml`, เทสต์ตรรกะ webhook ด้วย Jest
- เกณฑ์ผ่าน: SQL ครบทุกตารางที่ซิงก์ ชื่อคอลัมน์ตรงกับ Drizzle (มีเทสต์เทียบ), webhook map ทุก event ตาม ARCHITECTURE §4

## ระลอก B — ชั้นข้อมูลและซิงก์

### T06 Repository + ย้ายข้อมูลตั้งค่าเริ่มต้นเข้าบัญชี
- ไฟล์: `src/db/repos/*.ts`, `src/features/onboarding/draft.ts`, เทสต์
- repo: profile, customExercise, program (สร้าง/เปลี่ยนชื่อ/ลบ/จาก template), routine (คัดลอก/ย้ายข้ามกรุ๊ป F3), routineExercise, weekPlan (สลับโปรแกรมทั้งสัปดาห์, คัดลอกวัน), dayOverride, session/sessionExercise/sessionSet (snapshot ชื่อ F6), dailyLog
- `onboarding_draft` → `migrateDraftToAccount(userId)` (idempotent) ลงทะเบียนใน `registerAppHooks` ผ่าน `onEntitled`
- เกณฑ์ผ่าน: เทสต์ CRUD กับ SQLite จริง, soft delete, outbox, ย้าย draft ซ้ำไม่สร้างข้อมูลซ้ำ

### T07 Sync engine (L, J6, B11)
- ไฟล์: `src/features/sync/engine.ts`, `src/stores/sync.ts`, เทสต์
- push จาก outbox / pull ด้วยเคอร์เซอร์ / LWW / retry + backoff / สถานะ / เฉพาะเมื่อมีสิทธิ์ / ดึงทั้งหมดเมื่อล็อกอินเครื่องใหม่ / ส่งคิวก่อนล็อกเอาต์ / ลบข้อมูลในเครื่องเมื่อลบบัญชี
- เกณฑ์ผ่าน: เทสต์ออฟไลน์, ซิงก์ล้มเหลวไม่หาย, ชนกัน (LWW), ล็อกอินซ้ำ, สองเครื่องผ่าน MemorySyncBackend

## ระลอก C — หน้าจอ (ทุกหน้าตามภาษาภาพ DS ทั้งโหมดมืด/สว่าง + สถานะ loading/ว่าง/error/ล็อก ตาม SCREENS.md)

### T09 ตั้งค่าเริ่มต้น (C) — `src/app/onboarding/*`, `src/features/onboarding/*`, i18n `onboarding`
- ขั้น 1 ภาษา/ธีม/สีหลัก (8 สี + เลือกเอง พร้อม preview สด), ขั้น 2 โปรไฟล์ (ข้ามได้, หน่วย), ขั้น 3 เทมเพลต/สร้างเอง/ข้าม → Paywall; ผู้ที่มีสิทธิ์อยู่แล้วข้ามได้
### T10 Paywall / ล็อกอิน / บัญชี / กฎหมาย (B3–B7, B10, B12, H6, N1, N4) — `paywall`, `login`, `account`, `legal/[doc]`, `references`, `delete-account`, `src/legal/*`, i18n `paywall`/`auth`/`account`/`legal`
### T11 หน้าแรก Today (D, H3, B7) — `(app)/(tabs)/index`, `src/features/today/*`, i18n `today`
### T12 โปรแกรม + ตารางสัปดาห์ + คลังท่า (E, F) — `(app)/(tabs)/programs`, `(app)/program/*`, `(app)/routine/*`, `(app)/exercises/*`, `(app)/week`, i18n `programs`/`week`/`exercises`
### T13 เซสชัน (G1, G2) — `(app)/session/*`, `src/features/session/*`, i18n `session`
### T14 สถิติ + ประวัติ (I) — `(app)/(tabs)/stats`, `(app)/history/*`, `(app)/stats/*`, i18n `stats`
### T15 ตั้งค่า + โปรไฟล์/เป้าหมาย (K, H1–H6) + CSV — `(app)/(tabs)/settings`, `(app)/profile`, `src/features/settings/*`, i18n `settings`/`nutrition`/`sync`

## ระลอก D — คุณภาพและสโตร์

### T16 Accessibility + ตรวจภาพ (N5, DS)
- font scaling, VoiceOver/TalkBack labels, ปุ่ม ≥ 48, contrast AA ทุกสีหลักทั้งสองโหมด, พรีวิวหน้าจอ (web export + Playwright) เทียบภาพอ้างอิง
### T17 เตรียมสโตร์ (N1–N7)
- `store-metadata/` ไทย+อังกฤษ, ไอเดีย screenshot 5 รูป, App Review Notes, Privacy/Terms template, `docs/RELEASE_CHECKLIST.md`, EAS
### T18 ตรวจสุดท้าย
- `docs/FINAL_CHECK.md` (ตรวจย้อนกลับทุกข้อของ SPEC), export iOS/Android, prebuild, สรุป

---

## ตารางโยง SPEC → งาน (ห้ามตกหล่น)

| SPEC | งาน | | SPEC | งาน |
|---|---|---|---|---|
| A1 เริ่มง่าย | T09, T11 | | F1 โครงสร้าง Program→Routine→ท่า | P1 (schema), T06, T12 |
| A2 ปุ่ม ≥ 48dp/44pt | P1 (MIN_TOUCH), T16 | | F2 หน้าโปรแกรม | T12 |
| A3 หน้าจอไม่รก/ปุ่ม "เพิ่มเติม" | T11–T15 | | F3 สร้าง/คัดลอก/ย้าย | T06, T12 |
| A4 ข้อมูลไม่หาย offline-first | P1, T06, T07 | | F4 เทมเพลต | T05, T12 |
| A5 ไม่มี dark pattern | T10 | | F5 แท็กประเภท routine | T05, T12 |
| DS แสงเรือง/พื้นดำ | P1 GlowBackground, T16 | | F6 snapshot ชื่อกรุ๊ป | P1 schema, T06, T14 |
| DS หัวข้อใหญ่สีหลัก | P1 HeroTitle, T11 | | F7 คลังท่า | T05, T12 |
| DS ปุ่ม + และ ⋯ | P1 IconButton/ActionBar, T11, T12 | | F8 กลุ่มกล้ามเนื้อ | P1 schema, T05 |
| DS การ์ดเทาเข้มในกรอบเดียว + แถวจุดวัน + สวิตช์ | P1 CardGroup/BigRow/WeekdayDots/Toggle, T12 | | F9 ไม่มีสื่อไม่มีลิขสิทธิ์ | T05 |
| DS แถบแคปซูลลอย | P1 PillTabBar | | G1 หน้าเซสชัน | T13 |
| DS ฟอนต์ไทย | P1 typography | | G2 progression | T02, T13 |
| DS มืด/สว่าง tokens | P1 tokens | | H1 ข้อมูลโปรไฟล์ + หน่วย | T01, T09, T15 |
| DS สีหลัก 8 + เลือกเอง + AA | P1 tokens + เทสต์, T09 | | H2 สูตร | T01 |
| DS การใช้กับแต่ละหน้า | T11–T15 | | H3 แคลอรี่ใช้วันนี้กรอกเอง | T01, T11 |
| DS animation | P1 (glow, tab), T13 | | H4 อาหาร (ตัวเลขเดียว) | T11, T15 |
| B1 ทดลองของสโตร์ | T10, HUMAN_TASKS | | H5 คำเตือน | P1 Disclaimer, T15, T09 |
| B2 ไม่มีตัวนับทดลองในแอป | P1 machine | | H6 แหล่งอ้างอิง | T10 |
| B3 การล็อก | P1 AccessGate + เทสต์เส้นทาง | | I1 บันทึก/รายละเอียด | T04, T14 |
| B4 ลำดับซื้อหลังล็อกอิน | P1 accountFlow + เทสต์, T10 | | I2 % 3 มุมมอง | T04, T14 |
| B5 ข้อความ Paywall | P1 paywall model, T10 | | I3 พลังงาน | T04, T14 |
| B6 eligibility | P1, T10 | | I4 น้ำหนัก + 1RM | T04, T14 |
| B7 วันสิ้นสุด/ต่ออายุ | T11, T15 | | I5 กรองกรุ๊ป | T04, T14 |
| B8 state machine | P1 | | J1 สินค้า | T10, HUMAN_TASKS |
| B9 แคชออฟไลน์ | P1 | | J2 ราคาจากสโตร์ | P1 mapping, T10, HUMAN_TASKS |
| B10 ล็อกอิน Google/Apple | P1 adapter, T10 | | J3 entitlement pro ผูกบัญชี | P1 |
| B11 เครื่องใหม่ | P1, T07 | | J4 Paywall ไม่ dark pattern | T10 |
| B12 ลบบัญชี | P1 flow, T08, T10 | | J5 กรณีพิเศษสมาชิก | P1 machine, T10 |
| B13 ข้อมูลขั้นต่ำ | P1 schema, T17 | | J6 webhook + จำกัดซิงก์ | T08, T07 |
| C ขั้น 1–3 | T09 | | K ตั้งค่า | T15 |
| D หน้าแรก | T03, T11 | | L Tech stack | P1, T07, T08 |
| E ตารางสัปดาห์ | T03, T06, T12 | | M โครงสร้างข้อมูล | P1, T06 |
| N1 Apple | T10, T17 | | N5 Accessibility | P1, T16 |
| N2 Google Play | T17 | | N6 Metadata | T17 |
| N3 ทดสอบซื้อ | TEST_PLAN, T17 | | N7 จุดเด่น | T11–T14, T17 |
| N4 Privacy/Terms | T10, T17 | | N8 คุณภาพ/เทสต์ | ทุกงาน, T18 |
