# สถาปัตยกรรมแอป Fitnese (ARCHITECTURE)

> อ้างอิง: [SPEC.md](SPEC.md) (แหล่งความจริงหลัก) · [DATA_MODEL.md](DATA_MODEL.md) · [SCREENS.md](SCREENS.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [DECISIONS.md](DECISIONS.md)

## 1. ภาพรวมชั้นของระบบ

```
┌──────────────────────────────────────────────────────────────────────────┐
│ UI (Expo Router: src/app)                                                │
│  ├─ หน้าที่เข้าได้เสมอ (B3): onboarding/*, paywall, login, account,        │
│  │   legal/[doc], references, delete-account                             │
│  └─ (app)/*  ← ครอบด้วย <AccessGate> ทั้งกลุ่ม (ล็อกเมื่อไม่มีสิทธิ์)        │
│      (tabs): วันนี้ / โปรแกรม / สถิติ / ตั้งค่า  + หน้าซ้อน (session, routine…) │
├──────────────────────────────────────────────────────────────────────────┤
│ Feature modules (src/features/*)  — hooks/คอมโพเนนต์เฉพาะฟีเจอร์           │
│  access/  accountFlow (ลำดับ B4 + hook ตามเหตุการณ์บัญชี), useAccess (B8), │
│           AccessGate (B3 + กลับเข้าขั้นตั้งค่า), expiryRecheck,            │
│           subscriptionInfo (B7), usePaywallData, useManageSubscriptions    │
│  onboarding/ draft · migrate · resume   sync/ engine · mapping            │
│  session/ sessionFlow · finish (progression)   stats/ programs/ …         │
├──────────────────────────────────────────────────────────────────────────┤
│ Domain (src/domain/*) — ฟังก์ชันล้วน มี unit test ครบ (SPEC ซ, N8)          │
│  entitlement/machine (state machine สิทธิ์), entitlement/paywall (B4–B6)   │
│  nutrition (H2), progression (G2), schedule (D/E), stats/periods (I),     │
│  onboardingResume (C), recordMerge (L), sessionEdit/sessionSummary (G),   │
│  effort (RIR/RPE), csv, dates, units, profileInput, numberEntry           │
├──────────────────────────────────────────────────────────────────────────┤
│ Data (src/db/*) — expo-sqlite + Drizzle = แหล่งความจริงหลัก (offline-first) │
│  schema, migrate (user_version), transaction (ซ้อนได้), mutations          │
│  (เขียน+คิว outbox), repos/*                                               │
├──────────────────────────────────────────────────────────────────────────┤
│ Services (src/services/*) — interface + adapter จริง/mock                   │
│  auth (Supabase Auth + Google/Apple) · purchases (RevenueCat)              │
│  sync (Supabase Postgres + RLS) · registry เลือก adapter ตาม .env          │
└──────────────────────────────────────────────────────────────────────────┘
          │ HTTPS                                   ▲ webhook
          ▼                                         │
┌──────────────────────────┐        ┌──────────────────────────────────────┐
│ Supabase                 │        │ RevenueCat                           │
│  Auth (Google/Apple)     │◀───────│  สถานะ entitlement "pro"              │
│  Postgres + RLS          │ Edge   │  (App Store / Google Play)            │
│  Edge Functions:         │ Function└──────────────────────────────────────┘
│   revenuecat-webhook     │
│   delete-account         │
│  SQL: has_sync_access,   │
│   purge_revenuecat_events│
└──────────────────────────┘
```

หลักการ:

1. **ข้อมูลต้องไม่หาย (A4)** — ทุกการเขียนลง SQLite ในเครื่องก่อนเสมอ คลาวด์เป็นสำเนา
2. **ตัดสินสิทธิ์ที่เดียว (B8)** — `src/domain/entitlement/machine.ts` + `src/features/access/useAccess.ts` ทุกหน้าใช้ร่วมกัน ห้ามเขียนเงื่อนไขสิทธิ์กระจาย
3. **ไม่มีตัวนับเวลาทดลองในแอป (B2)** — สถานะทั้งหมดมาจาก RevenueCat (customerInfo/webhook) แอปเก็บแค่ "แคช" สำหรับออฟไลน์ (B9)
4. **ไม่มีคีย์จริงก็รันได้** — `src/services/registry.ts` ใช้ mock adapter เมื่อ `EXPO_PUBLIC_USE_MOCKS=1` หรือ dev build ที่ยังไม่มีคีย์ (release build จะไม่แอบใช้ mock)

## 2. โครงโฟลเดอร์

| ที่อยู่ | หน้าที่ |
|---|---|
| `src/app/` | หน้าจอ (Expo Router) — ไฟล์ = เส้นทาง; `(app)/` = กลุ่มที่ถูกล็อก |
| `src/components/` | คอมโพเนนต์ภาษาภาพ [DS] ที่ใช้ทั้งแอป |
| `src/features/<ฟีเจอร์>/` | hook/คอมโพเนนต์/ตรรกะเฉพาะฟีเจอร์ (ไม่ใช่เส้นทาง) — `access` `appearance` `auth` `data` `exercises` `onboarding` `profile` `programs` `session` `settings` `stats` `sync` `today` และ `bootstrap.ts` (ลงทะเบียน hook ตามเหตุการณ์บัญชี) |
| `src/domain/` | ฟังก์ชันล้วน (สูตร, state machine) |
| `src/db/` | schema, migration, การเขียนข้อมูล, repository |
| `src/services/` | adapter ภายนอก (Supabase, RevenueCat, Google/Apple) |
| `src/stores/` | Zustand store (สถานะระดับแอป): `auth`, `entitlement`, `settings`, `sync`, `restTimer`, `dataVersion` (แจ้งหน้าจอรีเฟรชเมื่อข้อมูลในเครื่องเปลี่ยน) |
| `src/i18n/locales/{en,th}/*.ts` | คำแปลแยกตามหมวด (ไทยต้องมี key ครบตามอังกฤษ — ตรวจตอน typecheck) |
| `src/theme/` | design tokens, สี, ตัวอักษร |
| `src/data/` | คลังท่า (JSON สองภาษา) และเทมเพลตโปรแกรม |
| `supabase/` | `migrations/` (3 ไฟล์ ดู DATA_MODEL §5), `functions/` (`revenuecat-webhook`, `delete-account`, `_shared/entitlement-machine.ts` = สำเนาของ state machine ห้ามแก้ตรง), `tests/` (SQL ของ `npm run supabase:verify`) |
| `drizzle/` | SQL migration ที่ drizzle-kit สร้าง (ฝังเป็น `src/db/migrations.generated.ts`) |
| `__tests__/` | Jest + React Native Testing Library — โครงสร้างดู §8 |
| `scripts/` | `embed-migrations.js`, `sync-shared.js`, `verify-supabase.sh`, `contrast-report.ts`, `export-legal.ts`, `web-screenshots.js`, `serve-web.js` |
| `docs/legal/`, `store-metadata/` | ข้อความกฎหมาย (ส่งออกจาก `src/legal/content.ts` ด้วย `npm run legal:export`) และข้อความ/แบบฟอร์มสำหรับสโตร์ |

## 3. การไหลของข้อมูล offline-first และการซิงก์

```
ผู้ใช้แตะ ─▶ repo.*() ─▶ mutations.createRow/updateRow/softDeleteRow
                              │ 1) เขียน SQLite (updatedAt = max(now, เดิม+1))
                              │ 2) upsert sync_outbox(table,rowId): ใส่ซ้ำ = version+1, attempts=0
                              ▼
                     SyncEngine (เมื่อ: ได้สิทธิ์, เขียนข้อมูล (debounce 2 วิ), กลับเข้าแอป, ออนไลน์, ปุ่ม "ซิงก์ตอนนี้")
                              │ push: ต่อตาราง (พ่อก่อนลูก) อ่านแถวจริงจากคิวทีละ ≤200 แถว → upsert ขึ้น Supabase
                              │       สำเร็จ → ลบเฉพาะรายการที่ version ยังเท่าที่อ่านไว้ (ถูกแก้ระหว่างส่ง = อยู่ในคิวต่อ)
                              │       ล้มเหลว → ดู "ส่งทีละแถว" ด้านล่าง
                              │ pull: ถามเซิร์ฟเวอร์ก่อนว่ามีสิทธิ์ซิงก์ (hasSyncAccess) ไม่งั้นสถานะ waiting
                              │       select where (server_updated_at, id) > เคอร์เซอร์ (ย้อน 2 นาที D38) หน้าละ 500 แถว
                              │       merge แบบ last-write-wins ต่อระเบียน (updated_at ใหม่กว่าชนะ)
                              │       แถวที่ยังรออยู่ในคิวและใหม่กว่า = ไม่ถูกทับ; ฉบับคลาวด์ใหม่กว่า = ถอดแถวนั้นออกจากคิว
                              │ reconcile: รวมแถว profile/daily_log ที่ซ้ำ (ด้านล่าง) แล้วแจ้งหน้าจอรีเฟรช
                              ▼
                     useSync store: idle / syncing / offline / error / waiting / disabled
```

- **LWW ต่อระเบียน**: ทุกตารางมี `updated_at` (epoch ms) ฝั่ง Postgres มี trigger `<table>_sync_write` → `sync_before_write()` ปฏิเสธ (ข้ามเงียบ) การเขียนที่เก่ากว่าแถวเดิม และตั้ง `server_updated_at` (เวลาของเซิร์ฟเวอร์) ใช้เป็นเคอร์เซอร์ดึงข้อมูล จึงไม่ขึ้นกับนาฬิกาเครื่อง
- **การลบ** เป็น soft delete (`deleted_at`) เพื่อให้ซิงก์การลบข้ามเครื่องได้
- **ซิงก์ล้มเหลวต้องไม่ทำข้อมูลหาย (L)**: แถวออกจาก outbox เฉพาะเมื่อ push สำเร็จ, retry แบบ backoff (5 วิ → 15 วิ → 1 นาที → 5 นาที → 10 นาที คงที่ที่ 10 นาที), สถานะและจำนวนที่รอส่งแสดงในหน้าตั้งค่า
- **คิวมีเวอร์ชัน (D73)**: เดิมเทียบ `queuedAt` (เวลานาฬิกา) ทำให้การแก้ระหว่างที่กำลังส่งอาจถูกลบออกจากคิวโดยไม่ได้ส่ง ตอนนี้ `enqueue` เพิ่ม `sync_outbox.version` ทุกครั้งที่แถวถูกใส่คิวซ้ำ (รวมตอน `claimLocalRows`) และ `clearSent` ลบด้วยเงื่อนไข `id AND version` — ถ้า version เปลี่ยน แถวยังอยู่และถูกส่งรอบถัดไป
- **ส่งทีละแถวเมื่อเซิร์ฟเวอร์ปฏิเสธ (D73)**: ถ้า push ทั้งก้อนล้มเหลวด้วย error ที่ไม่ใช่ออฟไลน์/ไม่มีสิทธิ์ (`SyncNetworkError`/`SyncAccessDeniedError`) engine ลองส่งทีละแถวเพื่อหาแถวที่เป็นปัญหา แถวที่ผ่านถูกลบจากคิว แถวที่ไม่ผ่านถูกบันทึก `last_error` + `attempts`+1 และไม่บล็อกแถวอื่น แถวที่ `attempts` ครบ `MAX_ATTEMPTS = 5` ถือว่า "เสีย": ข้ามไม่ส่งซ้ำ **แต่ยังอยู่ในคิว** และนับรวมในจำนวนรอส่ง (สถานะ `error` จนกว่าจะแก้แถวนั้น ซึ่งรีเซ็ต `attempts`) error ออฟไลน์/ไม่มีสิทธิ์ไม่นับ `attempts` และหยุดทั้งรอบ ไม่งั้นออฟไลน์นานๆ จะทำให้ทุกแถวถูกมองว่าเสีย — ข้อจำกัด: แถวลูกของพ่อที่เสียจะล้มตาม และไม่มี UI ดูแถวเสีย
- **รวมแถวซ้ำหลังดึงข้อมูล (D73)**: `profile` ควรมีแถวเดียวต่อบัญชี และ `daily_log` แถวเดียวต่อวัน แต่สองเครื่องสร้างพร้อมกันตอนออฟไลน์ได้ (ไม่มี unique constraint ที่ซิงก์ได้) `reconcileDuplicateRows` (ทำหลัง push+pull ทุกรอบ เฉพาะเมื่อ owner ปัจจุบัน = บัญชีที่ซิงก์) ใช้ `planMerge` ใน `src/domain/recordMerge.ts`: แถวที่เหลือ = สร้างเก่าสุด (เสมอกันใช้ id น้อยกว่า) เพื่อให้ทุกเครื่องเลือกตรงกัน, แต่ละช่องใช้ค่าจากแถวที่แก้ล่าสุดที่ "มีค่า", soft delete แถวที่ซ้ำ (ผ่าน `updateRow`/`softDeleteRow` จึงซิงก์ต่อไปเครื่องอื่น) — ข้อจำกัด: ค่าที่ตั้งใจล้างเป็นว่างอาจถูกแทนด้วยค่าเก่าของแถวซ้ำ
- **ซิงก์เฉพาะบัญชีที่มีสิทธิ์ (J6)**: ตัว engine ทำงานเฉพาะเมื่อ `getAccess().allowed` และ RLS ฝั่ง Supabase ตรวจซ้ำด้วย `has_sync_access(auth.uid())` จากตาราง `user_entitlements` ที่ webhook อัปเดต; ก่อน pull engine เรียก `hasSyncAccess` เพราะ RLS ซ่อนแถวโดยไม่แจ้ง error ถ้าเซิร์ฟเวอร์ยังไม่ยืนยันสิทธิ์ (webhook มาช้า/หาย) — ถ้าไม่ผ่าน → สถานะ `waiting` ("รอยืนยันสมาชิก") ข้อมูลในเครื่องยังอยู่ครบ (D65)
- **เจ้าของข้อมูล**: ทุกแถวมี `owner_id` ('local' ก่อนล็อกอิน หรือ id ผู้ใช้) ทุก query กรองตามเจ้าของปัจจุบัน → ล็อกเอาต์/สลับบัญชีบนเครื่องเดียวกัน ข้อมูลไม่ปนและไม่หาย ล็อกอินกลับมาเห็นครบ
- **อุปกรณ์ใหม่ (B11)**: ล็อกอิน → RevenueCat `logIn(userId)` คืนสิทธิ์ → hook `onEntitled` → engine ดึงข้อมูลทุกตารางจากคลาวด์ลงเครื่อง → ขั้นตั้งค่าเริ่มต้นที่มีข้อมูลบนคลาวด์แล้วถูกข้าม (ดู §5.1)
- **HealthKit/Health Connect**: ยังไม่เชื่อม (L) — ออกแบบให้เพิ่มเป็น service ใหม่ใน `src/services/health/` ที่เขียน `daily_log` ผ่าน repo เดิมได้

### 3.1 จบเซสชันและ progression (G2, D53)

`finishSession` (`src/features/session/finish.ts`) ทำใน transaction เดียว: (1) `computeProgression` เรียก `suggestNext` ของ `src/domain/progression.ts` ต่อท่าที่มาจาก routine ได้เป้าหมายครั้งหน้า (2) โหมด linear บันทึก `fail_streak` ลง `routine_exercise` ทันที — นับ "พลาดติดกัน" ได้แม้ผู้ใช้ไม่กดอะไรในหน้าสรุป (3) `sessionRepo.finish` เก็บรายการคำแนะนำใน `workout_session.progression` (JSON, ดู DATA_MODEL) หน้าสรุปอ่านจากที่บันทึกไว้ (`suggestionsFor`) ไม่คำนวณใหม่ จึงข้อความไม่เปลี่ยนเองหลังกดยอมรับ; ยอมรับ/ข้าม/ปรับเองได้ครั้งเดียวต่อท่า (`decide` ตรวจ `decision` ว่างก่อนและเขียนแถว `routine_exercise` + `progression` ใน transaction เดียว) เซสชันที่จบแล้วเปิดหน้าเซสชันเดิมจะถูกพาไปหน้าสรุป (D56) ส่วนโหมด "กำหนดเองรายสัปดาห์" คำนวณเป้าตอนเริ่มเซสชันจากสัปดาห์ที่ฝึกจริง (D55)

## 4. State machine สิทธิ์ (SPEC B8)

ไฟล์: `src/domain/entitlement/machine.ts` (สำเนาเหมือนกันทุกตัวอักษรที่ `supabase/functions/_shared/entitlement-machine.ts` มีเทสต์กันเพี้ยน)

```
                    INITIAL_PURCHASE(TRIAL)            RENEWAL (แปลงเป็นจ่าย)
 ┌──────────────┐ ─────────────────────────▶ ┌──────────┐ ───────────────────▶ ┌────────────────────┐
 │NO_ENTITLEMENT│                            │ TRIALING │                      │ SUBSCRIBED_MONTHLY │
 └──────────────┘ ──INITIAL_PURCHASE(NORMAL)─┼──────────┼─────────────────────▶└────────────────────┘
        │                                    │CANCELLATION(ผู้ใช้)=อยู่ต่อจนหมดช่วง│ BILLING_ISSUE (มี grace)
        │ NON_RENEWING_PURCHASE(lifetime)    │EXPIRATION                       ▼
        ▼                                    ▼                         ┌───────────────┐
 ┌──────────┐ ◀── NON_RENEWING_PURCHASE ── ┌─────────┐ ◀──EXPIRATION── │ BILLING_GRACE │
 │ LIFETIME │      (จากทุกสถานะ)            │ EXPIRED │                 └───────────────┘
 └──────────┘ ──คืนเงินสินค้าซื้อขาด──────▶  └─────────┘ ──RENEWAL/INITIAL_PURCHASE──▶ SUBSCRIBED_MONTHLY
```

| จากสถานะ | เหตุการณ์ RevenueCat | ไปสถานะ | หมายเหตุ |
|---|---|---|---|
| NO_ENTITLEMENT / EXPIRED | INITIAL_PURCHASE (period TRIAL) | TRIALING | ทดลองฟรี 7 วันของสโตร์ (B1) |
| NO_ENTITLEMENT / EXPIRED | INITIAL_PURCHASE / RENEWAL (NORMAL) | SUBSCRIBED_MONTHLY | สมัครรายเดือนไม่มีทดลอง / กลับมาสมัคร |
| ทุกสถานะ | NON_RENEWING_PURCHASE (สินค้าซื้อขาด) | LIFETIME | J5 เปลี่ยนรายเดือนเป็นซื้อขาด; ถ้ารายเดือนยังต่ออายุ (`willRenew`) ตั้ง `alsoRenewingMonthly = true` |
| TRIALING | RENEWAL | SUBSCRIBED_MONTHLY | ทดลองหมด → แปลงเป็นจ่าย |
| TRIALING / SUBSCRIBED_MONTHLY | CANCELLATION (UNSUBSCRIBE ฯลฯ) | เดิม (willRenew=false) | ใช้ได้จนสิ้นช่วงทดลอง/รอบบิล (J5) |
| สถานะรายเดือนใดๆ | CANCELLATION (CUSTOMER_SUPPORT = คืนเงิน) | EXPIRED | คืนเงิน (J5) |
| สถานะรายเดือนใดๆ | UNCANCELLATION | เดิม (willRenew=true) | |
| TRIALING / SUBSCRIBED_MONTHLY | BILLING_ISSUE (grace ยังไม่หมด) | BILLING_GRACE | Google Play grace / billing retry; ไม่มี grace → คงสถานะ บันทึก `billingIssueAt` อย่างเดียว |
| สถานะรายเดือนใดๆ | EXPIRATION | EXPIRED | |
| SUBSCRIBED_MONTHLY | SUBSCRIPTION_PAUSED | เดิม (willRenew=false) | หยุดชั่วคราวมีผลเมื่อสิ้นรอบ |
| ทุกสถานะ | PRODUCT_CHANGE | เดิม | รอ RENEWAL ถัดไป |
| ทุกสถานะ | TRANSFER ฝั่งต้นทาง (บัญชีนี้เสียสิทธิ์) | EXPIRED | ล้างข้อมูลสิทธิ์ที่เหลือ (D65) |
| ทุกสถานะ | TRANSFER ฝั่งปลายทาง (บัญชีนี้ได้สิทธิ์) | สถานะของบัญชีต้นทาง (state/product/expiration/willRenew) | เมื่อดีกว่าสิทธิ์ที่มีอยู่ (ซื้อขาด > ยังไม่หมดอายุ > หมดแล้ว > ไม่เคยมี) ถ้ามีหลายบัญชีต้นทางเลือกดีที่สุด (`bestSnapshot`); ไม่งั้นคงเดิม RevenueCat ไม่ส่งเหตุการณ์อื่นตามมา (D65) |
| LIFETIME | เหตุการณ์ของรายเดือนทั้งหมด | LIFETIME | ซื้อขาดชนะเสมอ (J5 มีทั้งสองแบบ); INITIAL_PURCHASE/RENEWAL/UNCANCELLATION ของรายเดือนตั้ง `alsoRenewingMonthly = true`, EXPIRATION/CANCELLATION/SUBSCRIPTION_PAUSED ของรายเดือนตั้งเป็น false |
| LIFETIME | CANCELLATION (คืนเงินสินค้าซื้อขาด) | EXPIRED | |

ฝั่งแอปใช้ `deriveSnapshot(customerInfo, now)` (แปลง CustomerInfo → สถานะเดียวกัน) ส่วนฝั่งเซิร์ฟเวอร์ใช้ `applyEvent(snapshot, event)` กับ webhook ทั้งสองทางมีเทสต์ตารางครบทุกสถานะ (`__tests__/domain/entitlement.test.ts`, `__tests__/supabase/webhook.test.ts`)

กติกาเพิ่มเติมที่ `deriveSnapshot` / webhook ใช้:
- **ซื้อขาด + รายเดือนซ้อน (J5, D61)**: สโตร์ไม่ยกเลิกรายเดือนให้เมื่อซื้อ non-consumable จึงมี `alsoRenewingMonthly` ใน snapshot/แคช (มีความหมายเฉพาะ LIFETIME) ใช้แสดงคำเตือน 'ยกเลิกรายเดือนในสโตร์' ใน ตั้งค่า/บัญชี ถ้าไม่รู้ว่ายังต่ออายุหรือไม่ถือว่าต่ออายุ (เตือนเกินดีกว่าเก็บเงินโดยไม่รู้); เซิร์ฟเวอร์ไม่เก็บค่านี้
- **ซื้อขาดที่ถูกคืนเงิน (D64)**: รายการ `nonSubscriptionTransactions` ใช้เป็นทางสำรองให้ LIFETIME เฉพาะเมื่อไม่มี entitlement `pro` ในข้อมูลเลย (แคชเก่า); ถ้ามีแต่ไม่ active = EXPIRED
- **หมดสิทธิ์ระหว่าง billing retry (D62)**: EXPIRED ที่ยังมี `billingIssueAt` → Paywall ใช้หัวข้อปัญหาการชำระเงินและปุ่มหลัก 'แก้ไขการชำระเงิน' (เปิดหน้าจัดการสมาชิกของสโตร์) แทนการชวนสมัครใหม่
- **webhook** (`supabase/functions/revenuecat-webhook/logic.ts`): ตรวจ `Authorization` → กันซ้ำด้วย `event.id` (ตาราง `revenuecat_events`) → สนใจเฉพาะ app_user_id ที่เป็น UUID ของ Supabase และเหตุการณ์ของ entitlement `pro` → อ่านสิทธิ์ของทุกบัญชีที่เกี่ยวข้อง*ก่อน*เขียน (TRANSFER ต้องรู้สิทธิ์ต้นทางก่อนถูกตั้งเป็น EXPIRED) → เขียนบัญชีปลายทางก่อนต้นทาง (ถ้าล้มกลางทาง RevenueCat ส่งซ้ำแล้วยังอ่านสิทธิ์เดิมของต้นทางได้) → ข้ามเหตุการณ์ที่เก่ากว่าสถานะล่าสุดที่ประมวลผลแล้ว (`stale`) → บันทึก event แล้วเรียก `purge_revenuecat_events(90)` ลบบันทึกที่เก่ากว่า 90 วัน (งานเสริม: ล้มเหลวไม่ทำให้ webhook ล้ม; ใช้กันเหตุการณ์ซ้ำเท่านั้น D74)

**สิทธิ์ใช้งาน**: `hasAccess` = TRIALING | SUBSCRIBED_MONTHLY | LIFETIME | BILLING_GRACE (ทดลองและจ่ายเงินได้สิทธิ์เท่ากัน J3)

**ออฟไลน์ (B9)** — `resolveAccess()`:

| เงื่อนไข | ผล |
|---|---|
| ไม่ได้ล็อกอิน / แคชเป็นของบัญชีอื่น | ล็อก |
| LIFETIME | ใช้ได้ (ไม่หมดอายุ) |
| now ≤ expirationDate | ใช้ได้จากแคช |
| เลย expirationDate แต่ออฟไลน์ และไม่เกิน 48 ชม. | ใช้ได้ (ผ่อนผัน) แล้วตรวจใหม่เมื่อออนไลน์ |
| เลย expirationDate ขณะออนไลน์ (หรือเพิ่งตรวจสดแล้ว) หรือเกินช่วงผ่อนผัน | ล็อก (แสดง Paywall แบบ EXPIRED) |

ระหว่างตรวจสิทธิ์ครั้งแรก (`pending`) แอปแสดง loading ไม่เด้ง Paywall วูบ

ส่วนประกอบของการตัดสินสิทธิ์ใน `src/features/access/` (ทุกหน้าอ่านผ่าน `useAccess()`/`getAccess()` ที่เดียว):

| ไฟล์ | หน้าที่ |
|---|---|
| `useAccess.ts` | รวม auth + แคชสิทธิ์ (`useEntitlement`) → `resolveAccess` (ตรวจซ้ำทุกนาทีให้สิทธิ์หมดตรงเวลา) `pending` = กำลังตรวจครั้งแรก หรือแคชบอกหมดอายุแต่กำลังตรวจออนไลน์อยู่ |
| `accountFlow.ts` | เปิดแอป (`bootstrapAccount`), ล็อกอิน/ล็อกเอาต์/ลบบัญชี, ซื้อ, Restore, `refreshEntitlement`; ทะเบียน hook `onEntitled` / `onBeforeSignOut` / `onAccountDeleted`; `applyCustomerInfo` ตัดสินว่าข้อมูลจาก RevenueCat สดหรือไม่ — `requestDate` ไม่เกิน 5 นาที (`LIVE_INFO_MAX_AGE_MS`) ข้อมูลเก่ากว่า (SDK อ่านแคชตอนออฟไลน์) ไม่เขียนทับแคชของเรา เพื่อให้ช่วงผ่อนผัน 48 ชม. ทำงานจริง (D49) |
| `expiryRecheck.ts` | แคชบอกว่าถึงวันหมดอายุขณะเปิดแอปค้างไว้ → ถามสโตร์ใหม่ทันที (ครั้งเดียวต่อวันหมดอายุ) ระหว่างรอ AccessGate แสดงสถานะรอ ไม่พาไป Paywall (D50) |
| `AccessGate.tsx` | ตัวกั้นของ `(app)` + กลับเข้าขั้นตั้งค่าเริ่มต้นสำหรับผู้มีสิทธิ์อยู่แล้ว (§5.1) + รายการ `ALWAYS_ACCESSIBLE_ROUTES` (เทสต์ `__tests__/routes.test.ts` บังคับให้หน้านอก `(app)` ตรงรายการนี้) |
| `usePaywallData.ts` | โหลดแพ็กเกจ/ราคาจากสโตร์ + ตรวจสิทธิ์ทดลองของบัญชีปัจจุบัน *ก่อน* แสดง Paywall (บัญชีเปลี่ยนแล้วผลเดิมใช้ไม่ได้ → โหลดใหม่ B6) |
| `subscriptionInfo.ts` | `describeSubscription`: ข้อความสถานะ วันที่ ป้ายหน้าแรก และ `notice` (ซื้อขาดแต่รายเดือนยังต่ออายุ) ใช้ร่วม ตั้งค่า/บัญชี/หน้าแรก (B7, D66) |
| `useManageSubscriptions.ts` | เปิดหน้าจัดการสมาชิกของสโตร์ เปิดไม่ได้แล้วแจ้งผู้ใช้ (ไม่ปล่อย promise reject) |

ตรรกะของ Paywall อยู่ใน `src/domain/entitlement/paywall.ts` (ฟังก์ชันล้วน): `buildPaywallModel` (หัวข้อ `subscribe`/`winback`/`billing`/`upgrade`, ข้อเสนอทดลอง, ข้อความเปิดเผย B5, `primaryAction` = `purchase`/`fixPayment`), `billedTerms` (ยอดเรียกเก็บติดปุ่มซื้อ D60), `nextStepOnSelect` / `purchaseStillNeeded` (ลำดับซื้อ §5)

## 5. ลำดับ ตั้งค่า → Paywall → ล็อกอิน → ซื้อ/ทดลอง (SPEC B4)

```
เปิดแอปครั้งแรก
  └▶ onboarding/index (ภาษา/ธีม/สีหลัก) → onboarding/profile (ข้ามได้) → onboarding/program (เทมเพลต/สร้างเอง/ข้าม)
       ข้อมูลเก็บใน onboarding_draft (ในเครื่อง ยังไม่ผูกบัญชี) กด "เสร็จสิ้น" → onboardingDone = true → router.replace('/')
  └▶ AccessGate (ไม่มีสิทธิ์) → paywall  (โหลดราคาจากสโตร์ + ตรวจ eligibility ทดลองก่อนแสดง B6)
       ผู้ใช้แตะแพ็กเกจ → nextStepOnSelect
       ├─ needLogin: ยังไม่ล็อกอิน → login?plan=<monthly|lifetime>  (Google / Apple)
       │     สำเร็จ → accountFlow.signIn: setOwner(userId) + RevenueCat.logIn(userId)
       │     กลับ paywall?plan=… พร้อมแพ็กเกจที่เลือกไว้ (ตรวจ eligibility ใหม่ด้วยบัญชีจริง)
       │     ถ้าบัญชีมีสิทธิ์อยู่แล้ว (ติดตั้งใหม่) → เข้าหน้าแรกทันที ไม่ซื้อซ้ำ
       ├─ linkingAccount: ล็อกอินแล้วแต่ RevenueCat ยังไม่ผูกกับบัญชีนี้ → refreshEntitlement ก่อน
       │     ถ้าตรวจแล้วมีสิทธิ์ (purchaseStillNeeded = false) → router.replace('/') ไม่เปิดหน้าซื้อซ้ำ (B11, J3, D63)
       └─ purchasing: accountFlow.purchasePlan(plan)
             assertCanPurchase({authUserId, purchasesUserId}) ← กั้น 2 ชั้น (flow + adapter)
             RevenueCat.purchasePackage → customerInfo → deriveSnapshot → แคช
  └▶ entitlement active → AccessGate ปล่อยผ่าน → หน้าแรก
       onEntitled hooks (src/features/bootstrap.ts): claimLocalRows (ผูกแถว 'local' เข้าบัญชี + ใส่คิว)
         → migrateDraftWhenReady (ดึงคลาวด์รอบแรกก่อน แล้วย้าย onboarding_draft เข้าบัญชี — เฉพาะเมื่อทำตั้งค่าครบหรือเลือกโปรแกรมแล้ว D67)
         → งานเสริมที่ลงทะเบียนด้วย addEntitledTask → requestSync(0)
```

กติกาที่บังคับในโค้ด:
- `purchasePlan` และ `PurchasesService.purchase` โยน `PurchaseRequiresLoginError` ถ้ายังไม่ล็อกอินหรือ RevenueCat ยังไม่ logIn เป็นบัญชีเดียวกัน (เทสต์: `__tests__/flows/account.test.ts`)
- Restore Purchases ต้องล็อกอินก่อน (สิทธิ์ผูกบัญชี J3) — ปุ่มแสดงเสมอ แตะแล้วพาไปล็อกอิน (`login?then=restore`) ถ้ายังไม่ล็อกอิน แล้วกู้คืนต่อทันทีหลังล็อกอินสำเร็จ
- Paywall ไม่โฆษณาทดลองฟรีถ้า eligibility เป็น `ineligible` หรือ `unknown` (B6)
- ซื้อไม่สำเร็จเพราะออฟไลน์ใช้ข้อความ 'ยังไม่ถูกเรียกเก็บเงิน'; ลิงก์จัดการสมาชิกที่เปิดไม่ได้แจ้งผู้ใช้ (D63)
- **อัปเกรดเป็นซื้อขาด (D61)**: ผู้ที่ TRIALING / SUBSCRIBED_MONTHLY / BILLING_GRACE (`offersLifetimeUpgrade`) เปิด `/paywall?upgrade=lifetime` จาก ตั้งค่า ได้ — แสดงเฉพาะแพ็กเกจซื้อขาดและเตือนว่าสโตร์ไม่ยกเลิกรายเดือน/ทดลองให้ (มีลิงก์จัดการสมาชิก) Paywall ปกติพาผู้มีสิทธิ์กลับ `/` เสมอ; ขั้น `linkingAccount` ในโหมดนี้ยังซื้อต่อได้ถ้ายังไม่ใช่ LIFETIME
- ปุ่ม "มีบัญชีแล้ว" ในขั้น 1 (`login?from=onboarding`): ล็อกอินแล้วถ้ามีสิทธิ์ → ตั้ง `onboardingDone` เองแล้วย้ายร่างเข้าบัญชี → `/` — **ทางลัดนี้ไม่ตรวจข้อมูลบนคลาวด์** (ตั้งค่าเสร็จทันทีแม้ยังไม่มีโปรไฟล์/โปรแกรมบนคลาวด์; D68, OPEN_QUESTIONS Q14)

### 5.1 กลับเข้าขั้นตั้งค่าเริ่มต้นสำหรับผู้มีสิทธิ์อยู่แล้ว (SPEC C, B11, D68)

เครื่องที่ยังไม่เคยผ่านตั้งค่า (`onboardingDone = false`) แต่ล็อกอินและมีสิทธิ์อยู่แล้ว (ติดตั้งใหม่ แล้วเซสชัน Supabase + RevenueCat กลับมา) `AccessGate` → `BeforeOnboarding` ทำดังนี้:

1. ล็อกอินแล้วแต่แคชสิทธิ์ยังไม่มา (`checking`) → แสดง loading รอผลตรวจ ไม่เด้งไปขั้น 1 ทั้งที่มีสิทธิ์ — รอผลตรวจเซสชันได้นานสุด `SESSION_WAIT_MS = 3 วิ` แล้วค่อยเริ่มขั้น 1 ตามปกติ
2. มีสิทธิ์ → `resolveEntitledOnboarding(userId)` (`src/features/onboarding/resume.ts`): `waitForFirstPull` (`syncNow()` แข่งกับ timeout `FIRST_PULL_TIMEOUT_MS = 8 วิ`) — ถ้าผลไม่ใช่ `synced` → `unknown` = ไม่รู้ว่าคลาวด์มีอะไร ไม่ข้ามขั้นใด (เริ่มขั้น 1)
3. ดึงสำเร็จ → `nextOnboardingStep` (`src/domain/onboardingResume.ts`, ฟังก์ชันล้วน): ไม่มีข้อมูลร่างกายอย่างน้อยหนึ่งช่อง (`hasBodyData`; หน่วยอย่างเดียวไม่นับ) → `/onboarding/profile`; ไม่มีโปรแกรม → `/onboarding/program`; ครบ → ตั้ง `onboardingDone = true` + `migrateDraftToAccount` แล้วเข้าแอปเอง (ขั้น 1 เป็นค่าของเครื่อง จึงไม่เกี่ยวกับคลาวด์)

การย้ายร่าง (`migrateDraftToAccount`) ทำครั้งเดียวต่อร่าง (`migratedAt`), เติมเฉพาะช่องที่ว่างของโปรไฟล์ที่บัญชีมีอยู่แล้ว, ไม่ใส่ข้อมูลร่างกายถ้ากด "ข้ามไปก่อน" (`profileSkipped`), และสร้างโปรแกรมจากเทมเพลต/โปรแกรมว่างเฉพาะเมื่อบัญชียังไม่มีโปรแกรมเลย `shouldMigrateDraft` กันการย้ายกลางทาง (หลังขั้น 2 ก่อนขั้น 3) ไม่งั้นร่างถูกตีว่าย้ายแล้วและโปรแกรมที่เลือกทีหลังไม่ถูกสร้าง

**แก้ไขการตั้งค่าเริ่มต้นขณะถูกล็อก (D69)**: หน้า `/account` มีแถว 'แก้ไขการตั้งค่าเริ่มต้น' (แสดงเฉพาะเมื่อไม่มีสิทธิ์) ไป `/onboarding/profile` → `/onboarding/program` ซึ่งอ่าน/เขียน `onboarding_draft` ในเครื่องและไม่แตะ `onboardingDone` ข้อจำกัด: ร่างที่ย้ายเข้าบัญชีแล้วไม่ถูกย้ายซ้ำ การแก้ตอนถูกล็อกจึงไม่เข้าบัญชีหลังสมัครใหม่ (OPEN_QUESTIONS Q13)

## 6. โมเดลความปลอดภัย

| เรื่อง | การจัดการ |
|---|---|
| โทเค็น | Supabase session เก็บใน expo-secure-store (แบ่งชิ้นเพราะจำกัดขนาด) — เก็บเฉพาะโทเค็น |
| ข้อมูลในเครื่อง | SQLite ใน sandbox ของแอป ไม่มีข้อมูลบัตร/รหัสผ่าน ไม่มีรูป/วิดีโอ (L) |
| RLS | ทุกตารางของผู้ใช้: `user_id = auth.uid()` และ `has_sync_access(auth.uid())` สำหรับ insert/update/select; `user_entitlements` เขียนได้เฉพาะ service role (webhook) |
| Webhook | ตรวจ `Authorization` header ตรงกับ secret ที่ตั้งใน RevenueCat; ใช้ service role key เฉพาะใน Edge Function; กันซ้ำด้วย event id, ข้ามเหตุการณ์ที่เก่ากว่า, เก็บเหตุการณ์ 90 วันแล้วลบด้วย `purge_revenuecat_events` (ดู §4) |
| ลบบัญชี (B12) | Edge Function `delete-account`: ตรวจ JWT ผู้ใช้ → เพิกถอนโทเค็น Apple (เฉพาะผู้ใช้ Apple ที่ส่ง authorization code ใหม่มา = iOS; ล้มเหลวก็ลบข้อมูลต่อและรายงานผล D40) → ลบลูกค้าใน RevenueCat (ถ้าตั้งคีย์) → ลบบันทึก webhook ของผู้ใช้ (ไม่มี FK) → ลบ auth user (ตารางที่ซิงก์ลบตาม cascade); แอปลบข้อมูลในเครื่องของบัญชีนั้น + ร่างตั้งค่าเริ่มต้น (`wipeLocalData`, `draftRepo.clear`) ผู้ใช้ Apple บน Android ไม่มี code ให้เพิกถอน ต้องถอนสิทธิ์แอปเองที่ appleid.apple.com (บอกไว้ในหน้า Privacy; OPEN_QUESTIONS Q12) |
| ข้อมูลขั้นต่ำ (B13) | เก็บเฉพาะที่ใช้คำนวณ/แสดงผล: อีเมลจากผู้ให้บริการล็อกอิน (รองรับ private relay), โปรไฟล์ร่างกาย, บันทึกการฝึก ไม่มี analytics/ads SDK; Apple ขอเฉพาะอีเมล (ไม่ขอชื่อ) แต่ Supabase Auth อาจคัดลอกชื่อ/รูปจาก ID token ของ Google ไปเก็บเอง (ยังไม่ได้ตัดสินใจว่าจะตัดออกหรือประกาศ — OPEN_QUESTIONS Q16) |
| คีย์ใน .env | `EXPO_PUBLIC_*` เป็นคีย์สาธารณะ (anon key, RevenueCat public key) ความลับอยู่ใน Supabase secrets เท่านั้น |

## 7. เหตุผลที่เลือกเทคโนโลยี

| เทคโนโลยี | เหตุผล |
|---|---|
| Expo SDK 57 + Expo Router + dev build | ตามสเปค L; ทำ native config ผ่าน config plugin (CNG) ไม่ต้องแก้ ios/android เอง; ต้องใช้ dev build เพราะมี native module (RevenueCat, Google Sign-In, Apple) |
| TypeScript strict | จับข้อผิดพลาดตั้งแต่ตอนเขียน + บังคับคำแปลไทยครบทุก key ด้วยชนิดข้อมูล |
| expo-sqlite + Drizzle ORM | ฐานข้อมูลในเครื่องแบบ synchronous เร็วพอสำหรับ UI; Drizzle ให้ query แบบมีชนิด และ drizzle-kit สร้าง migration; ใช้ query builder เดียวกันกับ better-sqlite3 ในเทสต์ ทำให้เทสต์ SQL จริง |
| Supabase (Auth + Postgres + RLS + Edge Functions) | Auth รองรับ signInWithIdToken ของ Google/Apple; RLS บังคับสิทธิ์ที่ฐานข้อมูล; Edge Function รับ webhook/ลบบัญชี |
| RevenueCat | จัดการใบเสร็จทั้งสองสโตร์, free trial ของสโตร์, entitlement ข้ามแพลตฟอร์มผูกบัญชี, webhook |
| @react-native-google-signin + expo-apple-authentication | ปุ่มและ flow มาตรฐานของแต่ละแบรนด์ (B10); Android ใช้ Apple ผ่าน OAuth web ของ Supabase |
| Zustand | store เล็ก เข้าถึงนอก React ได้ (ใช้ใน service/flow) |
| Reanimated + expo-haptics | animation ติ๊กเซ็ต/สลับแท็บ + haptic (DS) |
| react-native-svg | แสงเรือง RadialGradient (DS) |
| **react-native-gifted-charts** (เลือกแทน victory-native) | ใช้ react-native-svg ที่มีอยู่แล้ว ไม่ต้องเพิ่ม Skia (เล็กกว่าและ build ง่ายกว่า), มี donut/bar/line ครบตาม I2–I4, render ในเทสต์ได้ |
| i18next + expo-localization | th/en ตามภาษาเครื่อง (C ขั้น 1) |
| Jest + RNTL + expo-router/testing-library | เทสต์ฟังก์ชันล้วนและเรนเดอร์ทั้งแอปผ่าน router กับ SQLite จริง |
| ESLint (+ i18next/no-literal-string) + Prettier | บังคับห้ามข้อความฮาร์ดโค้ดใน JSX (ฌ) |

## 8. การทดสอบ

แผนทดสอบบนเครื่องจริงและเช็กลิสต์ก่อนส่งสโตร์อยู่ที่ [TEST_PLAN.md](TEST_PLAN.md) และ [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) — ส่วนนี้อธิบายชุดเทสต์อัตโนมัติ (Jest, preset `jest-expo`, `testMatch: **/__tests__/**/*.test.ts(x)`; 55 ชุด)

| โฟลเดอร์ใน `__tests__/` | ชุด | ทดสอบอะไร |
|---|---|---|
| `domain/` | 16 | ฟังก์ชันล้วนใน `src/domain/` (SPEC ซ, N8): csv, dates, effort, entitlement (ตารางเปลี่ยนสถานะ + offline), nutrition, onboardingResume, paywall, periods, profileInput, progression, recordMerge, schedule, sessionEdit, sessionSummary, stats, units |
| `data/` | 2 | คลังท่า (สองภาษา กลุ่มกล้ามเนื้อครบ) และเทมเพลตโปรแกรม |
| `db/` | 3 | migration runner, repo ทั้งหมด, transaction ซ้อน — ใช้ SQLite จริงในหน่วยความจำผ่าน better-sqlite3 (`jest.setup.js` mock `src/db/driver.ts`; SQL, migration และ Drizzle เป็นของจริง) |
| `sync/` | 4 | engine (push/pull/LWW/outbox version/ส่งทีละแถว/รวมแถวซ้ำ/แถวเสียครบ 5 ครั้ง), เคอร์เซอร์ (`cursor`), `SupabaseSyncBackend` (เช่น `hasSyncAccess` ผ่าน RPC) |
| `supabase/` | 3 | `schema` (คอลัมน์คลาวด์ตรงกับในเครื่อง + RLS/trigger ครบทุกตาราง), `webhook` (ตรรกะ webhook รวม TRANSFER และการล้างเหตุการณ์เก่า), `deleteAccount` |
| `flows/` | 3 | ลำดับระดับ service: บัญชี/ซื้อ/ล็อกอิน (`account`), สิทธิ์ตอนออฟไลน์/ผ่อนผัน/ตรวจใหม่ตอนหมดอายุ (`offline-access`), progression ตอนจบเซสชัน (`progression`) |
| `app/` | 12 | เรนเดอร์หน้าจอผ่าน `expo-router/testing-library` กับ SQLite จริงและ service จำลอง: gate, paywall, membership, onboarding (+ `onboarding-entitled` = กลับเข้าขั้นตั้งค่า), today-programs, programs-audit, session, stats, settings, delete-account, disclaimer |
| `features/`, `components/`, `services/`, `theme/` | 2 / 1 / 2 / 1 | `subscriptionInfo`, `statsLabels` · `Stepper` · `config` (กฎ mock/release), `supabaseAuth` · `contrast` (AA ทุกสีหลักทั้งสองโหมด) |
| ระดับบนสุด | 6 | `routes` (ล็อกครบทุกหน้า B3), `shared` (สำเนา state machine ของ Edge Function เหมือนต้นฉบับทุกตัวอักษร), `i18n` / `i18n.deviceLanguage` (key th ครบ + ภาษาเริ่มต้นตามเครื่อง), `appConfig` (privacy manifest ใน `app.config.ts`), `legal` (ตรวจ placeholder + guard ก่อนปล่อย) |
| `helpers/` | — | `env.ts` → `freshEnv()` = DB ใหม่ + service จำลองชุดใหม่ + ล้าง store; `app.ts` → `entitledApp()` = แอปที่ตั้งค่าเสร็จ/ล็อกอิน/มีสิทธิ์ + ตรึงเวลา (`setClockForTests`) |

คำสั่ง:
- `npm run check` = `typecheck` + `lint` (`--max-warnings 0` รวม prettier + ห้ามข้อความฮาร์ดโค้ดใน JSX) + `jest --ci` — ต้องผ่านก่อน commit ทุกครั้ง
- `RELEASE=1 npm test` (หรือ `RELEASE=1 npx jest __tests__/legal.test.ts`) เปิด guard ที่ล้มถ้าเอกสารกฎหมายยังมี placeholder — ปกติถูก skip (นับเป็น 1 skipped ใน `npm run check`) (D74)
- `npm run supabase:verify` รัน migration ทั้ง 3 ไฟล์บน Postgres ชั่วคราวพร้อมตัวแทนของ Supabase แล้วตรวจ RLS/LWW/สิทธิ์/ลบบัญชี (D41); Edge Functions ตรวจชนิดด้วย `deno check`
- `npm run contrast` รายงาน/ตรวจ contrast ของทุกสีหลัก; `npm run preview:web` + `scripts/web-screenshots.js` สร้างภาพตรวจ (D43)
