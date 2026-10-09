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
│  access/  accountFlow (ลำดับ B4), useAccess (B8), AccessGate (B3)          │
├──────────────────────────────────────────────────────────────────────────┤
│ Domain (src/domain/*) — ฟังก์ชันล้วน มี unit test ครบ (SPEC ซ, N8)          │
│  entitlement/machine (state machine สิทธิ์), entitlement/paywall (B4–B6)   │
│  nutrition (H2), progression (G2), schedule (D/E), stats (I)              │
├──────────────────────────────────────────────────────────────────────────┤
│ Data (src/db/*) — expo-sqlite + Drizzle = แหล่งความจริงหลัก (offline-first) │
│  schema, migrate (user_version), mutations (เขียน+คิว outbox), repos/*      │
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
| `src/features/<ฟีเจอร์>/` | hook/คอมโพเนนต์/ตรรกะเฉพาะฟีเจอร์ (ไม่ใช่เส้นทาง) |
| `src/domain/` | ฟังก์ชันล้วน (สูตร, state machine) |
| `src/db/` | schema, migration, การเขียนข้อมูล, repository |
| `src/services/` | adapter ภายนอก (Supabase, RevenueCat, Google/Apple) |
| `src/stores/` | Zustand store (สถานะ UI ระดับแอป) |
| `src/i18n/locales/{en,th}/*.ts` | คำแปลแยกตามหมวด (ไทยต้องมี key ครบตามอังกฤษ — ตรวจตอน typecheck) |
| `src/theme/` | design tokens, สี, ตัวอักษร |
| `src/data/` | คลังท่า (JSON สองภาษา) และเทมเพลตโปรแกรม |
| `supabase/` | SQL migration, RLS, Edge Functions |
| `drizzle/` | SQL migration ที่ drizzle-kit สร้าง (ฝังเป็น `src/db/migrations.generated.ts`) |
| `__tests__/` | Jest + React Native Testing Library |

## 3. การไหลของข้อมูล offline-first และการซิงก์

```
ผู้ใช้แตะ ─▶ repo.*() ─▶ mutations.createRow/updateRow/softDeleteRow
                              │ 1) เขียน SQLite (updatedAt = max(now, เดิม+1))
                              │ 2) upsert sync_outbox(table,rowId)  ← คิวในเครื่อง
                              ▼
                     SyncEngine (เมื่อ: ได้สิทธิ์, เขียนข้อมูล (debounce), กลับเข้าแอป, ออนไลน์)
                              │ push: อ่านแถวจริงจากคิว → upsert ขึ้น Supabase (ทีละตาราง พ่อก่อนลูก)
                              │       สำเร็จ → ลบออกจากคิว | ล้มเหลว → attempts+1, เก็บ error, backoff
                              │ pull: select * where server_updated_at > cursor (ต่อตาราง)
                              │       merge แบบ last-write-wins ต่อระเบียน (updated_at ใหม่กว่าชนะ)
                              │       แถวที่ยังรออยู่ในคิวและใหม่กว่า = ไม่ถูกทับ
                              ▼
                     useSync store: idle / syncing / offline / error / waiting-entitlement / disabled
```

- **LWW ต่อระเบียน**: ทุกตารางมี `updated_at` (epoch ms) ฝั่ง Postgres มี trigger `lww_guard` ปฏิเสธการเขียนที่เก่ากว่าแถวเดิม และ `server_updated_at` (ตั้งโดยเซิร์ฟเวอร์) ใช้เป็นเคอร์เซอร์ดึงข้อมูล จึงไม่ขึ้นกับนาฬิกาเครื่อง
- **การลบ** เป็น soft delete (`deleted_at`) เพื่อให้ซิงก์การลบข้ามเครื่องได้
- **ซิงก์ล้มเหลวต้องไม่ทำข้อมูลหาย (L)**: แถวออกจาก outbox เฉพาะเมื่อ push สำเร็จ, retry แบบ exponential backoff (5 วิ → สูงสุด 10 นาที), สถานะแสดงในหน้าตั้งค่า
- **ซิงก์เฉพาะบัญชีที่มีสิทธิ์ (J6)**: ตัว engine ทำงานเฉพาะเมื่อ `useAccess().allowed` และ RLS ฝั่ง Supabase ตรวจซ้ำด้วย `has_sync_access(auth.uid())` จากตาราง `user_entitlements` ที่ webhook อัปเดต ถ้าถูกปฏิเสธ → สถานะ `waiting-entitlement` ข้อมูลในเครื่องยังอยู่ครบ
- **เจ้าของข้อมูล**: ทุกแถวมี `owner_id` ('local' ก่อนล็อกอิน หรือ id ผู้ใช้) ทุก query กรองตามเจ้าของปัจจุบัน → ล็อกเอาต์/สลับบัญชีบนเครื่องเดียวกัน ข้อมูลไม่ปนและไม่หาย ล็อกอินกลับมาเห็นครบ
- **อุปกรณ์ใหม่ (B11)**: ล็อกอิน → RevenueCat `logIn(userId)` คืนสิทธิ์ → engine ดึงข้อมูลทุกตารางจากคลาวด์ลงเครื่อง
- **HealthKit/Health Connect**: ยังไม่เชื่อม (L) — ออกแบบให้เพิ่มเป็น service ใหม่ใน `src/services/health/` ที่เขียน `daily_log` ผ่าน repo เดิมได้

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
| ทุกสถานะ (ยกเว้น LIFETIME) | NON_RENEWING_PURCHASE (สินค้าซื้อขาด) | LIFETIME | J5 เปลี่ยนรายเดือนเป็นซื้อขาด |
| TRIALING | RENEWAL | SUBSCRIBED_MONTHLY | ทดลองหมด → แปลงเป็นจ่าย |
| TRIALING / SUBSCRIBED_MONTHLY | CANCELLATION (UNSUBSCRIBE ฯลฯ) | เดิม (willRenew=false) | ใช้ได้จนสิ้นช่วงทดลอง/รอบบิล (J5) |
| สถานะรายเดือนใดๆ | CANCELLATION (CUSTOMER_SUPPORT = คืนเงิน) | EXPIRED | คืนเงิน (J5) |
| สถานะรายเดือนใดๆ | UNCANCELLATION | เดิม (willRenew=true) | |
| TRIALING / SUBSCRIBED_MONTHLY | BILLING_ISSUE (grace ยังไม่หมด) | BILLING_GRACE | Google Play grace / billing retry |
| สถานะรายเดือนใดๆ | EXPIRATION | EXPIRED | |
| SUBSCRIBED_MONTHLY | SUBSCRIPTION_PAUSED | เดิม (willRenew=false) | หยุดชั่วคราวมีผลเมื่อสิ้นรอบ |
| ทุกสถานะ | PRODUCT_CHANGE | เดิม | รอ RENEWAL ถัดไป |
| ทุกสถานะ | TRANSFER (บัญชีนี้เสียสิทธิ์) | EXPIRED | |
| LIFETIME | เหตุการณ์ของรายเดือนทั้งหมด | LIFETIME | ซื้อขาดชนะเสมอ (J5 มีทั้งสองแบบ) |
| LIFETIME | CANCELLATION (คืนเงินสินค้าซื้อขาด) | EXPIRED | |

ฝั่งแอปใช้ `deriveSnapshot(customerInfo, now)` (แปลง CustomerInfo → สถานะเดียวกัน) ส่วนฝั่งเซิร์ฟเวอร์ใช้ `applyEvent(snapshot, event)` กับ webhook ทั้งสองทางมีเทสต์ตารางครบทุกสถานะ (`__tests__/domain/entitlement.test.ts`)

**สิทธิ์ใช้งาน**: `hasAccess` = TRIALING | SUBSCRIBED_MONTHLY | LIFETIME | BILLING_GRACE (ทดลองและจ่ายเงินได้สิทธิ์เท่ากัน J3)

**ออฟไลน์ (B9)** — `resolveAccess()`:

| เงื่อนไข | ผล |
|---|---|
| ไม่ได้ล็อกอิน / แคชเป็นของบัญชีอื่น | ล็อก |
| LIFETIME | ใช้ได้ (ไม่หมดอายุ) |
| now ≤ expirationDate | ใช้ได้จากแคช |
| เลย expirationDate แต่ออฟไลน์ และไม่เกิน 48 ชม. | ใช้ได้ (ผ่อนผัน) แล้วตรวจใหม่เมื่อออนไลน์ |
| เลย expirationDate ขณะออนไลน์ หรือเกินช่วงผ่อนผัน | ล็อก (แสดง Paywall แบบ EXPIRED) |

ระหว่างตรวจสิทธิ์ครั้งแรก (`pending`) แอปแสดง loading ไม่เด้ง Paywall วูบ

## 5. ลำดับ ตั้งค่า → Paywall → ล็อกอิน → ซื้อ/ทดลอง (SPEC B4)

```
เปิดแอปครั้งแรก
  └▶ onboarding/index (ภาษา/ธีม/สีหลัก) → onboarding/profile (ข้ามได้) → onboarding/program (เทมเพลต/สร้างเอง/ข้าม)
       ข้อมูลเก็บใน onboarding_draft (ในเครื่อง ยังไม่ผูกบัญชี)
  └▶ paywall  (โหลดราคาจากสโตร์ + ตรวจ eligibility ทดลองก่อนแสดง B6)
       ผู้ใช้แตะแพ็กเกจ
       ├─ ยังไม่ล็อกอิน → login?plan=<monthly|lifetime>  (Google / Apple)
       │     สำเร็จ → accountFlow.signIn: setOwner(userId) + RevenueCat.logIn(userId)
       │     กลับ paywall?plan=… พร้อมแพ็กเกจที่เลือกไว้ (ตรวจ eligibility ใหม่ด้วยบัญชีจริง)
       │     ถ้าบัญชีมีสิทธิ์อยู่แล้ว (ติดตั้งใหม่) → เข้าหน้าแรกทันที ไม่ซื้อซ้ำ
       └─ ล็อกอินแล้ว → accountFlow.purchasePlan(plan)
             assertCanPurchase({authUserId, purchasesUserId}) ← กั้น 2 ชั้น (flow + adapter)
             RevenueCat.purchasePackage → customerInfo → deriveSnapshot → แคช
  └▶ entitlement active → AccessGate ปล่อยผ่าน → หน้าแรก
       onEntitled hooks: ย้าย onboarding_draft เข้าบัญชี (profile, โปรแกรมจากเทมเพลต, ตารางสัปดาห์) + เริ่มซิงก์
```

กติกาที่บังคับในโค้ด:
- `purchasePlan` และ `PurchasesService.purchase` โยน `PurchaseRequiresLoginError` ถ้ายังไม่ล็อกอินหรือ RevenueCat ยังไม่ logIn เป็นบัญชีเดียวกัน (เทสต์: `__tests__/flows/account.test.ts`)
- Restore Purchases ต้องล็อกอินก่อน (สิทธิ์ผูกบัญชี J3) — ปุ่มแสดงเสมอ แตะแล้วพาไปล็อกอินถ้ายังไม่ล็อกอิน
- Paywall ไม่โฆษณาทดลองฟรีถ้า eligibility เป็น `ineligible` หรือ `unknown` (B6)

## 6. โมเดลความปลอดภัย

| เรื่อง | การจัดการ |
|---|---|
| โทเค็น | Supabase session เก็บใน expo-secure-store (แบ่งชิ้นเพราะจำกัดขนาด) — เก็บเฉพาะโทเค็น |
| ข้อมูลในเครื่อง | SQLite ใน sandbox ของแอป ไม่มีข้อมูลบัตร/รหัสผ่าน ไม่มีรูป/วิดีโอ (L) |
| RLS | ทุกตารางของผู้ใช้: `user_id = auth.uid()` และ `has_sync_access(auth.uid())` สำหรับ insert/update/select; `user_entitlements` เขียนได้เฉพาะ service role (webhook) |
| Webhook | ตรวจ `Authorization` header ตรงกับ secret ที่ตั้งใน RevenueCat; ใช้ service role key เฉพาะใน Edge Function |
| ลบบัญชี (B12) | Edge Function `delete-account`: ตรวจ JWT ผู้ใช้ → เพิกถอนโทเค็น Apple (ถ้าล็อกอินด้วย Apple; ใช้ authorization code ใหม่ที่แอปขอระหว่างยืนยันการลบ) → ลบข้อมูลทุกตาราง → ลบ auth user; แอปลบข้อมูลในเครื่องของบัญชีนั้น |
| ข้อมูลขั้นต่ำ (B13) | เก็บเฉพาะที่ใช้คำนวณ/แสดงผล: อีเมลจากผู้ให้บริการล็อกอิน (รองรับ private relay), โปรไฟล์ร่างกาย, บันทึกการฝึก ไม่มี analytics/ads SDK |
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

ดู [TEST_PLAN.md](TEST_PLAN.md) — คำสั่งรวม `npm run check` = typecheck + lint + jest
