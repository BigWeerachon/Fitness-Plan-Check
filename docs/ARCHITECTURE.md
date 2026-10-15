# สถาปัตยกรรมแอป Fitnese (ARCHITECTURE)

> อ้างอิง: [SPEC.md](SPEC.md) + [SPEC_CHANGES.md](SPEC_CHANGES.md) (มีผลเหนือ SPEC: แอปออฟไลน์ล้วน D81) · [DATA_MODEL.md](DATA_MODEL.md) · [SCREENS.md](SCREENS.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [DECISIONS.md](DECISIONS.md)

## 1. ภาพรวมชั้นของระบบ

```
┌──────────────────────────────────────────────────────────────────────────┐
│ UI (Expo Router: src/app)                                                │
│  ├─ หน้าที่เข้าได้เสมอ (B3): onboarding/*, paywall, account,               │
│  │   legal/[doc], references, delete-data                                │
│  └─ (app)/*  ← ครอบด้วย <AccessGate> ทั้งกลุ่ม (ล็อกเมื่อไม่มีสิทธิ์)        │
│      (tabs): วันนี้ / โปรแกรม / สถิติ / ตั้งค่า  + หน้าซ้อน (session, routine…) │
├──────────────────────────────────────────────────────────────────────────┤
│ Feature modules (src/features/*)  — hooks/คอมโพเนนต์เฉพาะฟีเจอร์           │
│  access/  accountFlow (สิทธิ์/ซื้อ/กู้คืน + hook onEntitled), useAccess (B8),│
│           AccessGate (B3 + กลับเข้าขั้นตั้งค่า), expiryRecheck,            │
│           subscriptionInfo (B7), usePaywallData, useManageSubscriptions    │
│  backup/ (D82) backupFlow · backupIo(.web) · useBackup                    │
│  data/ deleteAllData · onboarding/ draft · migrate · resume                │
│  session/ sessionFlow · finish (progression)   stats/ programs/ …         │
├──────────────────────────────────────────────────────────────────────────┤
│ Domain (src/domain/*) — ฟังก์ชันล้วน มี unit test ครบ (SPEC N8)             │
│  entitlement/machine (state machine สิทธิ์), entitlement/paywall (B5–B6)   │
│  backup (รูปแบบ/ตรวจไฟล์สำรอง D82), nutrition (H2), progression (G2),      │
│  schedule (D/E), stats/periods (I), onboardingResume (C),                 │
│  sessionEdit/sessionSummary (G), effort, csv, compare, dates, units, …    │
├──────────────────────────────────────────────────────────────────────────┤
│ Data (src/db/*) — expo-sqlite + Drizzle = แหล่งความจริงเดียว (ในเครื่อง)   │
│  schema, migrate (user_version), transaction (ซ้อนได้), mutations          │
│  (เขียน + owner/updatedAt + แจ้งหน้าจอ), repos/*, backup (ส่งออก/กู้คืน),  │
│  wipe (ลบข้อมูลทั้งหมด), owner (= 'local')                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ Services (src/services/*) — interface + adapter จริง/mock                   │
│  purchases (RevenueCat นิรนาม) · registry เลือก adapter ตาม .env           │
└──────────────────────────────────────────────────────────────────────────┘
          │ HTTPS (เฉพาะข้อมูลการซื้อ)
          ▼
┌──────────────────────────────────────┐      ┌─────────────────────────────┐
│ RevenueCat                           │◀─────│ App Store / Google Play     │
│  app user id นิรนาม ($RCAnonymousID) │ noti │  ชำระเงิน, ทดลองฟรี, ต่ออายุ │
│  entitlement "pro" → customerInfo    │      │  (server notifications/RTDN)│
└──────────────────────────────────────┘      └─────────────────────────────┘

  ไฟล์สำรอง (JSON) ──▶ หน้าแชร์ของระบบ (expo-sharing) ──▶ ที่ที่ผู้ใช้เลือก (Drive/LINE/Files/อีเมล)
  กู้คืน ◀── ตัวเลือกไฟล์ของระบบ (expo-document-picker) ◀── ไฟล์สำรองของผู้ใช้
```

ไม่มีเซิร์ฟเวอร์ ฐานข้อมูลคลาวด์ บัญชีผู้ใช้ หรือการล็อกอินของเราเอง (D81, D81.2, D81.3)

หลักการ:

1. **ข้อมูลต้องไม่หาย (A4 ตาม SPEC_CHANGES)** — ทุกการเขียนลง SQLite ในเครื่อง ข้อมูลอยู่ในเครื่องเท่านั้น การย้ายเครื่องทำด้วยไฟล์สำรองที่ผู้ใช้เก็บเอง (D82) migration ทุกตัวต้องรักษาข้อมูลเดิมตอนอัปเดตแอป
2. **ตัดสินสิทธิ์ที่เดียว (B8)** — `src/domain/entitlement/machine.ts` + `src/features/access/useAccess.ts` ทุกหน้าใช้ร่วมกัน ห้ามเขียนเงื่อนไขสิทธิ์กระจาย
3. **ไม่มีตัวนับเวลาทดลองในแอป (B2)** — สถานะทั้งหมดมาจาก customerInfo ของ RevenueCat แอปเก็บแค่ "แคช" สำหรับออฟไลน์ (B9)
4. **ข้อมูลที่ออกจากเครื่องมีแค่การซื้อ** — RevenueCat `configure` โดยไม่ส่ง appUserID ไม่เรียก `logIn`/`logOut`/`setAttributes` (ต้องตรงกับ privacy manifest และนโยบายฯ — D83)
5. **ไม่มีคีย์จริงก็รันได้** — `src/services/registry.ts` ใช้ mock adapter เมื่อ `EXPO_PUBLIC_USE_MOCKS=1` หรือ dev build ที่ยังไม่มีคีย์ RevenueCat (release build จะไม่แอบใช้ mock)

## 2. โครงโฟลเดอร์

| ที่อยู่ | หน้าที่ |
|---|---|
| `src/app/` | หน้าจอ (Expo Router) — ไฟล์ = เส้นทาง; `(app)/` = กลุ่มที่ถูกล็อก |
| `src/components/` | คอมโพเนนต์ภาษาภาพ [DS] ที่ใช้ทั้งแอป |
| `src/features/<ฟีเจอร์>/` | hook/คอมโพเนนต์/ตรรกะเฉพาะฟีเจอร์ (ไม่ใช่เส้นทาง) — `access` `appearance` `backup` `data` `exercises` `legal` `onboarding` `profile` `programs` `session` `settings` `stats` `today` และ `bootstrap.ts` (ลงทะเบียน hook เมื่อได้สิทธิ์ + แจ้งหน้าจอเมื่อข้อมูลเปลี่ยน) |
| `src/domain/` | ฟังก์ชันล้วน (สูตร, state machine, รูปแบบไฟล์สำรอง) |
| `src/db/` | schema, migration, การเขียนข้อมูล, repository, สำรอง/กู้คืน, ลบข้อมูลทั้งหมด |
| `src/services/` | adapter ภายนอก — มีแค่ RevenueCat (`purchases/`) + ตัวเลือก adapter (`registry.ts`, `config.ts`) |
| `src/stores/` | Zustand store: `entitlement`, `settings`, `restTimer`, `dataVersion` (แจ้งหน้าจอรีเฟรชเมื่อข้อมูลในเครื่องเปลี่ยน) |
| `src/i18n/locales/{en,th}/*.ts` | คำแปลแยกตามหมวด (ไทยต้องมี key ครบตามอังกฤษ — ตรวจตอน typecheck) |
| `src/theme/` | design tokens, สี, ตัวอักษร |
| `src/data/` | คลังท่า (JSON สองภาษา) และเทมเพลตโปรแกรม |
| `src/legal/content.ts` | นโยบายความเป็นส่วนตัว/ข้อกำหนด (ไทย+อังกฤษ) และแหล่งอ้างอิง |
| `drizzle/` | SQL migration ที่ drizzle-kit สร้าง (ฝังเป็น `src/db/migrations.generated.ts`) — `0004_drop_sync_tables`, `0005_reown_local_rows`, `0006_local_entitlement_cache` คือ migration ของ D81 |
| `__tests__/` | Jest + React Native Testing Library — โครงสร้างดู §8 |
| `scripts/` | `embed-migrations.js`, `contrast-report.ts`, `export-legal.ts`, `generate-icons.py`, `web-screenshots.js`, `serve-web.js` |
| `docs/legal/`, `store-metadata/` | ข้อความกฎหมาย (ส่งออกจาก `src/legal/content.ts` ด้วย `npm run legal:export`) และข้อความ/แบบฟอร์มสำหรับสโตร์ |

## 3. การไหลของข้อมูลในเครื่อง สำรอง และกู้คืน

```
ผู้ใช้แตะ ─▶ repo.*() ─▶ mutations.createRow/updateRow/softDeleteRow
                              │ 1) เขียน SQLite (ownerId = getOwner() = 'local', updatedAt = max(now, เดิม+1))
                              │ 2) onLocalWrite → dataVersion+1 → หน้าจอที่ใช้ useRepoQuery รีเฟรช
                              ▼
                         SQLite ในเครื่อง (แหล่งความจริงเดียว)
                              │
     สำรองข้อมูล ─────────────┼──▶ exportAllUserData (แถวที่ยังไม่ถูกลบ ไม่มี ownerId)
                              │      → buildBackup (src/domain/backup.ts) → JSON
                              │      → ไฟล์ในโฟลเดอร์แคช fitnese-backup-YYYY-MM-DD.json → หน้าแชร์ของระบบ
                              │      → บันทึก lastBackupAt เมื่อหน้าแชร์ปิด
     กู้คืนจากไฟล์ ───────────┴──▶ ตัวเลือกไฟล์ (*/*) → parseBackup (ขนาด/JSON/app id/เวอร์ชัน/ตาราง/ชนิดค่า/id ซ้ำ)
                                     → สรุป + ยืนยันแบบย้อนกลับไม่ได้
                                     → restoreAllUserData: ในทรานแซกชันเดียว ลบตารางผู้ใช้ทั้งหมด + ร่างตั้งค่าเริ่มต้น
                                       แล้วใส่แถวจากไฟล์ (owner = 'local') — ผิดพลาดตรงไหน = rollback ไม่มีอะไรเปลี่ยน
```

- **การลบรายการ** เป็น soft delete (`deleted_at`) — คงไว้จากยุคซิงก์เพื่อลดการรื้อ schema ทุก query กรอง `deleted_at IS NULL` แถวที่ลบแล้วไม่ถูกส่งออกในไฟล์สำรอง และหายจริงเมื่อ "ลบข้อมูลทั้งหมด" หรือกู้คืนจากไฟล์
- **เจ้าของข้อมูล**: ทุกแถวยังมี `owner_id` แต่ `getOwner()` คืน `'local'` เสมอ (D81) — migration `0005_reown_local_rows` ย้ายแถวของบัญชีเดิมที่เคยล็อกอินบนเครื่องมาเป็น `'local'` ตอนอัปเดต
- **ไฟล์สำรอง (D82)**: `{ format: 'fitnese-backup', formatVersion, schemaVersion (= จำนวน migration), appVersion, exportedAt, settings: { onboardingDone }, tables }` · รับไฟล์ที่ schema เก่ากว่าได้ถ้าคอลัมน์เป็นส่วนย่อยของปัจจุบัน (เติมค่าเริ่มต้น) ตารางที่เพิ่มทีหลังประกาศ `introducedIn` · ไม่ตรวจ enum/ความสัมพันธ์ข้ามตาราง · ไฟล์ใหญ่สุด 50 MB · ค่าของเครื่อง (ภาษา/ธีม/สีหลัก/มุมมองสถิติ) และแคชสิทธิ์ไม่อยู่ในไฟล์
- **หน้าแชร์/ตัวเลือกไฟล์**: `src/features/backup/backupIo.ts` ใช้ `expo-file-system` (`File`, `Paths.cache`), `expo-sharing`, `expo-document-picker`; พรีวิวเว็บใช้ `backupIo.web.ts` (ดาวน์โหลดผ่านเบราว์เซอร์ + File API)
- **ลบข้อมูลทั้งหมดในเครื่องนี้**: `deleteAllLocalData` (`src/features/data/deleteAllData.ts`) → `wipeLocalData` (`src/db/wipe.ts`) ลบตารางผู้ใช้ทุกตาราง + `onboarding_draft` + `entitlement_cache` + ค่า `onboardingDone`/`lastBackupAt` ในทรานแซกชันเดียว แล้วตรวจสิทธิ์กับสโตร์ใหม่ (สมาชิกที่ยังมีสิทธิ์ใช้ต่อได้)
- **HealthKit/Health Connect**: ยังไม่เชื่อม (L) — ออกแบบให้เพิ่มเป็น service ใหม่ใน `src/services/health/` ที่เขียน `daily_log` ผ่าน repo เดิมได้

### 3.1 จบเซสชันและ progression (G2, D53)

`finishSession` (`src/features/session/finish.ts`) ทำใน transaction เดียว: (1) `computeProgression` เรียก `suggestNext` ของ `src/domain/progression.ts` ต่อท่าที่มาจาก routine ได้เป้าหมายครั้งหน้า (2) โหมด linear บันทึก `fail_streak` ลง `routine_exercise` ทันที — นับ "พลาดติดกัน" ได้แม้ผู้ใช้ไม่กดอะไรในหน้าสรุป (3) `sessionRepo.finish` เก็บรายการคำแนะนำใน `workout_session.progression` (JSON, ดู DATA_MODEL) หน้าสรุปอ่านจากที่บันทึกไว้ (`suggestionsFor`) ไม่คำนวณใหม่ จึงข้อความไม่เปลี่ยนเองหลังกดยอมรับ; ยอมรับ/ข้าม/ปรับเองได้ครั้งเดียวต่อท่า (`recordDecisionOnce` ตรวจ `decision` ว่างก่อนและเขียนแถว `routine_exercise` + `progression` ใน transaction เดียว) เซสชันที่จบแล้วเปิดหน้าเซสชันเดิมจะถูกพาไปหน้าสรุป (D56) ส่วนโหมด "กำหนดเองรายสัปดาห์" คำนวณเป้าตอนเริ่มเซสชันจากสัปดาห์ที่ฝึกจริง (D55)

## 4. State machine สิทธิ์ (SPEC B8)

ไฟล์: `src/domain/entitlement/machine.ts` — ใช้ฝั่งแอปเท่านั้น (สำเนาฝั่ง Edge Function และตัวแปลงเหตุการณ์ webhook `applyEvent` ถูกลบใน D81.3)

สถานะ: `NO_ENTITLEMENT` (ยังไม่เคยซื้อ) · `TRIALING` · `SUBSCRIBED_MONTHLY` · `LIFETIME` · `BILLING_GRACE` · `EXPIRED` (เคยมีแล้วหมด ใช้แยกข้อความ Paywall)

`deriveSnapshot(customerInfo, now)` แปลง CustomerInfo ของ RevenueCat → สถานะ (เทสต์ตารางครบทุกสถานะใน `__tests__/domain/entitlement.test.ts`):

| customerInfo (entitlement `pro`) | สถานะ |
|---|---|
| active + ไม่มีวันหมดอายุ / สินค้า `*lifetime*` / มีธุรกรรมซื้อขาด | LIFETIME (`alsoRenewingMonthly` = รายเดือนยังต่ออายุอยู่ — D61) |
| active + ยังไม่หมดอายุ + `billingIssueDetectedAt` | BILLING_GRACE |
| active + ยังไม่หมดอายุ + `periodType = TRIAL` | TRIALING |
| active + ยังไม่หมดอายุ | SUBSCRIBED_MONTHLY |
| ไม่มี entitlement แต่มีธุรกรรมซื้อขาด (แคชเก่า) | LIFETIME (D64) |
| มี entitlement แต่ไม่ active | EXPIRED (เก็บ `billingIssueAt` ไว้แยกข้อความ — D62) |
| ไม่มีเลย | NO_ENTITLEMENT |

กติกาเพิ่มเติม:
- **ซื้อขาด + รายเดือนซ้อน (J5, D61)**: สโตร์ไม่ยกเลิกรายเดือนให้เมื่อซื้อ non-consumable จึงมี `alsoRenewingMonthly` ใน snapshot/แคช ใช้แสดงคำเตือน 'ยกเลิกรายเดือนในสโตร์' ในตั้งค่า ถ้าไม่รู้ว่ายังต่ออายุหรือไม่ถือว่าต่ออายุ
- **ซื้อขาดที่ถูกคืนเงิน (D64)**: รายการ `nonSubscriptionTransactions` ใช้เป็นทางสำรองให้ LIFETIME เฉพาะเมื่อไม่มี entitlement `pro` ในข้อมูลเลย; ถ้ามีแต่ไม่ active = EXPIRED
- **หมดสิทธิ์ระหว่าง billing retry (D62)**: EXPIRED ที่ยังมี `billingIssueAt` → Paywall ใช้หัวข้อปัญหาการชำระเงินและปุ่มหลัก 'แก้ไขการชำระเงิน' (เปิดหน้าจัดการสมาชิกของสโตร์)

**สิทธิ์ใช้งาน**: `hasAccess` = TRIALING | SUBSCRIBED_MONTHLY | LIFETIME | BILLING_GRACE (ทดลองและจ่ายเงินได้สิทธิ์เท่ากัน J3)

**ออฟไลน์ (B9)** — `resolveAccess()` (แคชเก็บใน `entitlement_cache` ใต้ owner `'local'`):

| เงื่อนไข | ผล |
|---|---|
| ไม่มีแคช | ล็อก |
| LIFETIME | ใช้ได้ (ไม่หมดอายุ) |
| now ≤ expirationDate | ใช้ได้จากแคช |
| เลย expirationDate แต่ออฟไลน์ และไม่เกิน 48 ชม. | ใช้ได้ (ผ่อนผัน) แล้วตรวจใหม่เมื่อออนไลน์ |
| เลย expirationDate ขณะออนไลน์ (หรือเพิ่งตรวจสดแล้ว) หรือเกินช่วงผ่อนผัน | ล็อก (แสดง Paywall แบบ EXPIRED) |

ระหว่างโหลดแคชจากฐานข้อมูล/ตรวจสิทธิ์ครั้งแรก (`pending`) แอปแสดง loading ไม่เด้ง Paywall วูบ

ส่วนประกอบของการตัดสินสิทธิ์ใน `src/features/access/` (ทุกหน้าอ่านผ่าน `useAccess()`/`getAccess()` ที่เดียว):

| ไฟล์ | หน้าที่ |
|---|---|
| `useAccess.ts` | รวมแคชสิทธิ์ (`useEntitlement`) → `resolveAccess` (ตรวจซ้ำทุกนาทีให้สิทธิ์หมดตรงเวลา) `pending` = ยังโหลดแคชไม่เสร็จ (`loaded`) หรือแคชบอกหมดอายุแต่กำลังตรวจออนไลน์อยู่ |
| `accountFlow.ts` | เปิดแอป (`bootstrapEntitlement`: โหลดแคช → ตรวจกับ RevenueCat), `refreshEntitlement`, `checkTrialEligibility`, `purchasePlan`, `restorePurchases`, `manageSubscriptionsUrl`; hook `onEntitled`; `applyCustomerInfo` ตัดสินว่าข้อมูลจาก RevenueCat สดหรือไม่ — `requestDate` ไม่เกิน 5 นาที (`LIVE_INFO_MAX_AGE_MS`) ข้อมูลเก่ากว่า (SDK อ่านแคชตอนออฟไลน์) ไม่เขียนทับแคชของเรา เพื่อให้ช่วงผ่อนผัน 48 ชม. ทำงานจริง (D49) |
| `expiryRecheck.ts` | แคชบอกว่าถึงวันหมดอายุขณะเปิดแอปค้างไว้ → ถามสโตร์ใหม่ทันที (ครั้งเดียวต่อวันหมดอายุ) ระหว่างรอ AccessGate แสดงสถานะรอ (D50) |
| `AccessGate.tsx` | ตัวกั้นของ `(app)` + กลับเข้าขั้นตั้งค่าเริ่มต้นสำหรับผู้มีสิทธิ์อยู่แล้ว (§5.1) + รายการ `ALWAYS_ACCESSIBLE_ROUTES` (เทสต์ `__tests__/routes.test.ts` บังคับให้หน้านอก `(app)` ตรงรายการนี้) |
| `usePaywallData.ts` | โหลดแพ็กเกจ/ราคาจากสโตร์ + ตรวจสิทธิ์ทดลอง *ก่อน* แสดง Paywall (B6) |
| `useRestorePurchases.ts` | กู้คืนการซื้อ + ข้อความผล (กู้คืนแล้ว / ไม่พบการซื้อในบัญชีสโตร์) |
| `subscriptionInfo.ts` | `describeSubscription`: ข้อความสถานะ วันที่ ป้ายหน้าแรก และ `notice` (ซื้อขาดแต่รายเดือนยังต่ออายุ) (B7, D66) |
| `useManageSubscriptions.ts` | เปิดหน้าจัดการสมาชิกของสโตร์ เปิดไม่ได้แล้วแจ้งผู้ใช้ |

ตรรกะของ Paywall อยู่ใน `src/domain/entitlement/paywall.ts` (ฟังก์ชันล้วน): `buildPaywallModel` (หัวข้อ `subscribe`/`winback`/`billing`/`upgrade`, ข้อเสนอทดลอง, ข้อความเปิดเผย B5, `primaryAction` = `purchase`/`fixPayment`), `billedTerms` (ยอดเรียกเก็บติดปุ่มซื้อ D60), `offersLifetimeUpgrade` (D61)

## 5. ลำดับ ตั้งค่า → Paywall → ซื้อ/ทดลอง (SPEC B4 ตาม SPEC_CHANGES)

```
เปิดแอปครั้งแรก
  └▶ onboarding/index (ภาษา/ธีม/สีหลัก — มีทางลัด "เคยซื้อแล้ว? กู้คืนการซื้อ")
       → onboarding/profile (ข้ามได้) → onboarding/program (เทมเพลต/สร้างเอง/ข้าม)
       ข้อมูลเก็บใน onboarding_draft (ในเครื่อง) กด "เสร็จสิ้น" → onboardingDone = true → router.replace('/')
  └▶ AccessGate (ไม่มีสิทธิ์) → paywall  (โหลดราคาจากสโตร์ + ตรวจ eligibility ทดลองก่อนแสดง B6)
       ผู้ใช้แตะแพ็กเกจ → accountFlow.purchasePlan(plan) → RevenueCat.purchasePackage (ผู้ใช้นิรนาม ไม่มีล็อกอิน)
         → customerInfo → deriveSnapshot → แคช
  └▶ entitlement active → AccessGate ปล่อยผ่าน → หน้าแรก
       onEntitled hooks (src/features/bootstrap.ts): applyDraftWhenReady (นำ onboarding_draft เข้าข้อมูลหลัก —
         เฉพาะเมื่อทำตั้งค่าครบหรือเลือกโปรแกรมแล้ว D67) → งานเสริมที่ลงทะเบียนด้วย addEntitledTask
```

กติกาที่บังคับในโค้ด:
- RevenueCat `configure({ apiKey })` ไม่ส่ง appUserID และไม่มี `logIn`/`logOut` ในโค้ด (D81.2) — เครื่องที่เคยล็อกอินก่อนอัปเดต SDK ยังจำ app user id เดิมไว้จึงเห็นสิทธิ์เดิม
- **กู้คืนการซื้อ** ไม่ต้องล็อกอิน: สโตร์ผูกการซื้อในบัญชี Apple ID / Google กับรหัสนิรนามของเครื่องนี้ (RevenueCat restore behavior = transfer — HUMAN_TASKS ข้อ 17) ปุ่มอยู่ที่ขั้น 1, Paywall, ตั้งค่า และหน้า `/account`
- Paywall ไม่โฆษณาทดลองฟรีถ้า eligibility เป็น `ineligible` หรือ `unknown` (B6)
- ซื้อไม่สำเร็จเพราะออฟไลน์ใช้ข้อความ 'ยังไม่ถูกเรียกเก็บเงิน'; ลิงก์จัดการสมาชิกที่เปิดไม่ได้แจ้งผู้ใช้
- **อัปเกรดเป็นซื้อขาด (D61)**: ผู้ที่ TRIALING / SUBSCRIBED_MONTHLY / BILLING_GRACE (`offersLifetimeUpgrade`) เปิด `/paywall?upgrade=lifetime` จากตั้งค่าได้ — แสดงเฉพาะแพ็กเกจซื้อขาดและเตือนว่าสโตร์ไม่ยกเลิกรายเดือน/ทดลองให้ Paywall ปกติพาผู้มีสิทธิ์กลับ `/` เสมอ

### 5.1 กลับเข้าขั้นตั้งค่าเริ่มต้นสำหรับผู้มีสิทธิ์อยู่แล้ว (SPEC C ตาม SPEC_CHANGES)

เครื่องที่ยังไม่เคยผ่านตั้งค่า (`onboardingDone = false`) แต่มีสิทธิ์อยู่แล้ว (เช่น ติดตั้งใหม่แล้วกู้คืนการซื้อ หรือกู้คืนจากไฟล์ก่อน) `AccessGate` → `BeforeOnboarding`:

1. ยังไม่มีแคชสิทธิ์ (`pending`/`checking`) → แสดง loading รอผลตรวจกับ RevenueCat นานสุด `ENTITLEMENT_WAIT_MS = 3 วิ` แล้วค่อยเริ่มขั้น 1 ตามปกติ
2. มีสิทธิ์ → `entitledResumeStep()` (`src/features/onboarding/resume.ts` → `nextOnboardingStep` ใน `src/domain/onboardingResume.ts`): ไม่มีข้อมูลร่างกายในเครื่อง (`hasBodyData`) → `/onboarding/profile`; ไม่มีโปรแกรม → `/onboarding/program`; ครบ → `completeEntitledOnboarding` (ตั้ง `onboardingDone = true` + นำร่างเข้า) แล้วเข้าแอปเอง

การนำร่างเข้า (`applyOnboardingDraft`) ทำครั้งเดียวต่อร่าง (`migratedAt`), เติมเฉพาะช่องที่ว่างของโปรไฟล์ที่มีอยู่แล้ว, ไม่ใส่ข้อมูลร่างกายถ้ากด "ข้ามไปก่อน" (`profileSkipped`), และสร้างโปรแกรมจากเทมเพลต/โปรแกรมว่างเฉพาะเมื่อยังไม่มีโปรแกรมเลย `shouldMigrateDraft` กันการนำเข้ากลางทาง

**แก้ไขการตั้งค่าเริ่มต้นขณะถูกล็อก (D69)**: หน้า `/account` มีแถว 'แก้ไขการตั้งค่าเริ่มต้น' (เฉพาะเมื่อไม่มีสิทธิ์) ไป `/onboarding/profile` → `/onboarding/program` ซึ่งอ่าน/เขียน `onboarding_draft` และไม่แตะ `onboardingDone` (ข้อจำกัด: OPEN_QUESTIONS Q13)

## 6. โมเดลความปลอดภัยและความเป็นส่วนตัว

| เรื่อง | การจัดการ |
|---|---|
| ข้อมูลในเครื่อง | SQLite ใน sandbox ของแอป ไม่มีข้อมูลบัตร/รหัสผ่าน/โทเค็น ไม่มีรูป/วิดีโอ (L) — ปกป้องด้วยความปลอดภัยของอุปกรณ์ |
| ข้อมูลที่ออกจากเครื่อง | เฉพาะการซื้อ: รหัสนิรนามของ RevenueCat + ประวัติการซื้อ ผ่าน HTTPS — ไม่มี analytics/ads/crash SDK ไม่มี `setAttributes`/`setEmail`/`collectDeviceIdentifiers` (privacy manifest: UserID + PurchaseHistory — D83) |
| ไฟล์สำรอง | ไม่เข้ารหัส สร้างในโฟลเดอร์แคชของแอปแล้วส่งให้หน้าแชร์ ผู้ใช้เลือกที่เก็บเอง (นโยบายฯ เตือนไว้ — Q25) · กู้คืนตรวจไฟล์ก่อนเขียนและทำในทรานแซกชันเดียว ไฟล์ที่ไม่ผ่านการตรวจไม่แตะฐานข้อมูล |
| ลบข้อมูล (B12 ตาม SPEC_CHANGES) | `wipeLocalData` ลบตารางผู้ใช้ทุกตาราง + ร่าง + แคชสิทธิ์ + ค่าตั้งค่าของผู้ใช้ในทรานแซกชันเดียว ยืนยัน 2 ขั้น ไม่ยกเลิกสมาชิกในสโตร์ (แจ้งผู้ใช้พร้อมทางลัด) |
| ข้อมูลขั้นต่ำ (B13) | ไม่มีบัญชี/อีเมล/ชื่อ ข้อมูลสุขภาพไม่ออกจากเครื่อง |
| คีย์ใน .env | `EXPO_PUBLIC_*` เป็นคีย์สาธารณะ (RevenueCat public SDK key) ไม่มี secret ฝั่งเซิร์ฟเวอร์ |
| release build | ไม่ใช้ mock เด็ดขาด (`decideMocks`) — กัน "ซื้อฟรี" (B2, D47) |

## 7. เหตุผลที่เลือกเทคโนโลยี

| เทคโนโลยี | เหตุผล |
|---|---|
| Expo SDK 57 + Expo Router + dev build | ตามสเปค L; ทำ native config ผ่าน config plugin (CNG); ต้องใช้ dev build เพราะมี native module (RevenueCat, SQLite, ตัวเลือกไฟล์) |
| TypeScript strict | จับข้อผิดพลาดตั้งแต่ตอนเขียน + บังคับคำแปลไทยครบทุก key ด้วยชนิดข้อมูล |
| expo-sqlite + Drizzle ORM | ฐานข้อมูลในเครื่องแบบ synchronous เร็วพอสำหรับ UI; Drizzle ให้ query แบบมีชนิด และ drizzle-kit สร้าง migration; ใช้ query builder เดียวกันกับ better-sqlite3 ในเทสต์ |
| RevenueCat (`react-native-purchases`) แบบนิรนาม | จัดการใบเสร็จทั้งสองสโตร์, free trial ของสโตร์, entitlement, restore ผ่านบัญชีสโตร์ — ไม่ต้องมีบัญชีของเรา (D81.2) |
| expo-sharing + expo-document-picker + expo-file-system | สำรอง/กู้คืนเป็นไฟล์ที่ผู้ใช้ควบคุมเอง แทนคลาวด์ของเรา (D82) |
| Zustand | store เล็ก เข้าถึงนอก React ได้ |
| Reanimated + expo-haptics | animation ติ๊กเซ็ต/สลับแท็บ + haptic (DS) |
| react-native-svg | แสงเรือง RadialGradient (DS) |
| **react-native-gifted-charts** (เลือกแทน victory-native) | ใช้ react-native-svg ที่มีอยู่แล้ว ไม่ต้องเพิ่ม Skia, มี donut/bar/line ครบตาม I2–I4, render ในเทสต์ได้ |
| i18next + expo-localization | th/en ตามภาษาเครื่อง (C ขั้น 1) |
| Jest + RNTL + expo-router/testing-library | เทสต์ฟังก์ชันล้วนและเรนเดอร์ทั้งแอปผ่าน router กับ SQLite จริง |
| ESLint (+ i18next/no-literal-string) + Prettier | บังคับห้ามข้อความฮาร์ดโค้ดใน JSX |

ตัดออกใน D81: Supabase (Auth/Postgres/RLS/Edge Functions), `@react-native-google-signin/google-signin`, `expo-apple-authentication`, `expo-secure-store`, `react-native-url-polyfill`

## 8. การทดสอบ

แผนทดสอบบนเครื่องจริงและเช็กลิสต์ก่อนส่งสโตร์อยู่ที่ [TEST_PLAN.md](TEST_PLAN.md) และ [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) — ส่วนนี้อธิบายชุดเทสต์อัตโนมัติ (Jest, preset `jest-expo`, `testMatch: **/__tests__/**/*.test.ts(x)`; จำนวนชุดดูที่บรรทัดสุดท้ายของ `npm test`)

| โฟลเดอร์ใน `__tests__/` | ทดสอบอะไร |
|---|---|
| `domain/` | ฟังก์ชันล้วนใน `src/domain/` (SPEC N8): backup (รูปแบบไฟล์ + การตรวจทุกกรณี + schema เก่า), compare, csv, dates, effort, entitlement (ตารางสถานะ + offline), exerciseSettings, listOrder, numberEntry, nutrition, onboardingResume, paywall, periods, profileInput, progression, schedule, sessionEdit, sessionSummary, stats, units |
| `data/` | คลังท่า (สองภาษา กลุ่มกล้ามเนื้อครบ) และเทมเพลตโปรแกรม |
| `db/` | migration runner (รวมอัปเกรดฐานข้อมูลยุคซิงก์ → ออฟไลน์), repo ทั้งหมด, transaction ซ้อน, backup (ส่งออก/กู้คืน round-trip + rollback) — SQLite จริงในหน่วยความจำผ่าน better-sqlite3 |
| `flows/` | ลำดับระดับ service: ซื้อ/กู้คืนแบบนิรนาม (`account`), สิทธิ์ตอนออฟไลน์/ผ่อนผัน/ตรวจใหม่ตอนหมดอายุ (`offline-access`), progression ตอนจบเซสชัน (`progression`) |
| `app/` | เรนเดอร์หน้าจอผ่าน `expo-router/testing-library` กับ SQLite จริงและ service จำลอง: gate, paywall, membership, onboarding (+ `onboarding-entitled`), today-programs, programs-audit, session, stats, settings, backup, delete-data, disclaimer |
| `features/`, `components/`, `hooks/`, `i18n/`, `services/`, `theme/` | deleteAllData, describeTodayHero, migrateProfilePatch, statsLabels, subscriptionInfo, useBackup, useRestorePurchases · Stepper · useNow · format · config (กฎ mock/release) · contrast (AA ทุกสีหลักทั้งสองโหมด) |
| ระดับบนสุด | `routes` (ล็อกครบทุกหน้า B3), `i18n` / `i18n.deviceLanguage`, `appConfig` (privacy manifest เหลือ UserID + PurchaseHistory, ไม่มีปลั๊กอินล็อกอิน), `easConfig`, `legal` (ฉบับออฟไลน์ + guard placeholder ก่อนปล่อย) |
| `helpers/` | `env.ts` → `freshEnv()` = DB ใหม่ + service จำลองชุดใหม่ + ล้าง store; `app.ts` → `entitledApp()` = แอปที่ตั้งค่าเสร็จ/มีสิทธิ์ + ตรึงเวลา; `richData.ts` ข้อมูลตัวอย่างครบทุกตาราง |

คำสั่ง:
- `npm run check` = `typecheck` + `lint` (`--max-warnings 0` รวม prettier + ห้ามข้อความฮาร์ดโค้ดใน JSX) + `jest --ci` — ต้องผ่านก่อน commit ทุกครั้ง
- `RELEASE=1 npm test` เปิด guard ที่ล้มถ้าเอกสารกฎหมายยังมี placeholder — ปกติถูก skip (D74)
- `node store-metadata/check-limits.js` ตรวจความยาวข้อความหน้าร้าน/App Review Notes
- `npm run contrast` รายงาน/ตรวจ contrast ของทุกสีหลัก; `npm run preview:web` + `scripts/web-screenshots.js` สร้างภาพตรวจ (D43)
