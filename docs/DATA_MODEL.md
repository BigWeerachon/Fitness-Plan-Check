# โครงสร้างข้อมูล (DATA_MODEL)

> แหล่งความจริง: `src/db/schema.ts` (Drizzle) → migration ในเครื่อง `drizzle/0000–0003_*.sql` (+ `src/db/migrations.generated.ts`) และฝั่งคลาวด์ `supabase/migrations/*.sql` (3 ไฟล์ ดู §5–§6)
> ตารางคอลัมน์ท้ายไฟล์ (§7) ตรวจกับ schema จริงแล้ว ณ วันที่แก้ไฟล์นี้ — เทสต์ `__tests__/supabase/schema.test.ts` ตรวจเฉพาะว่าตารางที่ซิงก์บนคลาวด์ตรงกับในเครื่องทุกคอลัมน์ (ชื่อ ชนิด not null) ส่วนเอกสารนี้ไม่มีเทสต์ตรวจ ต้องปรับเองเมื่อแก้ schema

## 1. หลักการ

| เรื่อง | กติกา |
|---|---|
| แหล่งความจริงหลัก | SQLite ในเครื่อง (expo-sqlite) — ทำงานได้ครบแม้ออฟไลน์ คลาวด์เป็นสำเนาสำหรับซิงก์/ย้ายเครื่อง (SPEC A4, L) |
| คอลัมน์มาตรฐานของทุกตารางที่ซิงก์ | `id` (UUID จาก `newId()`), `owner_id`, `created_at`, `updated_at`, `deleted_at` (SPEC M) |
| เจ้าของข้อมูล | `owner_id = 'local'` ก่อนล็อกอิน → ถูก "claim" เป็น id ผู้ใช้เมื่อได้สิทธิ์ครั้งแรก (`claimLocalRows`); ทุก query กรอง `owner_id = getOwner()` (D12) |
| การลบ | soft delete (`deleted_at`) เสมอ เพื่อให้ซิงก์การลบได้และไม่ทำให้ประวัติหาย; ลบจริงเฉพาะตอนลบบัญชี (`wipeLocalData` ในเครื่อง, `auth.users` cascade บนคลาวด์) |
| เวลา | epoch milliseconds (integer/bigint) จาก `now()` |
| วันที่ | ข้อความ `YYYY-MM-DD` ตามเวลาท้องถิ่น (D22) |
| น้ำหนัก | เก็บเป็น kg เสมอ แปลงเป็น lb ตอนแสดงผล (D14) |
| การเขียน | ผ่าน `src/db/mutations.ts` เท่านั้น (ใส่ owner, `updated_at` แบบเพิ่มขึ้นเสมอ แม้นาฬิกาเครื่องถอยหลัง และคิวซิงก์ `sync_outbox` ใน transaction เดียวกัน) transaction ซ้อนได้ผ่าน `src/db/transaction.ts` (BEGIN ชั้นนอก, SAVEPOINT ชั้นใน — D42) |
| คิวซิงก์ | `sync_outbox` มีแถวเดียวต่อ (ตาราง, แถว) ใส่คิวซ้ำ = `version` + 1 และล้าง `attempts`/`last_error`; push ลบเฉพาะรายการที่ `version` ไม่เปลี่ยนระหว่างส่ง ไม่พึ่งนาฬิกา (D73) |
| ความขัดแย้ง | last-write-wins ต่อระเบียนด้วย `updated_at` ทั้งในเครื่อง (merge) และบนเซิร์ฟเวอร์ (trigger `sync_before_write`) |
| แถวที่ควรมีแถวเดียว | `profile` (ต่อบัญชี) และ `daily_log` (ต่อวัน) — ไม่มี unique constraint เพราะสองเครื่องสร้างพร้อมกันตอนออฟไลน์ได้ จึงรวมหลังดึงข้อมูล (`reconcileDuplicateRows`): เก็บแถวที่สร้างเก่าสุด, แต่ละช่องใช้ค่าล่าสุดที่ไม่ว่าง, soft delete แถวที่ซ้ำ (D73) |
| Snapshot | เซสชันเก็บชื่อกรุ๊ป/ชื่อ routine/ประเภท ณ เวลาที่ฝึก และเซ็ตเก็บกลุ่มกล้ามเนื้อ ณ เวลาที่ฝึก → สถิติไม่เปลี่ยนเมื่อแก้/ลบภายหลัง (SPEC F6, M) |
| คำแนะนำครั้งหน้า | คำนวณครั้งเดียวตอนกดจบเซสชัน แล้วเก็บใน `workout_session.progression` พร้อมการตัดสินใจของผู้ใช้ (D53) |

## 2. ความสัมพันธ์

```
profile (1 ต่อบัญชี) ── activeProgramId ──▶ program
program 1──* routine 1──* routine_exercise ──▶ exercise (built-in id หรือ custom_exercise.id)
program 1──* week_plan *──1 routine            (แถวละ routine: วันในสัปดาห์ + เปิด/ปิด)
day_override (วันที่เฉพาะ: rest | routine | empty) ──▶ routine
workout_session (snapshot: program_name, routine_name, routine_type; progression = JSON คำแนะนำครั้งหน้า)
   1──* session_exercise (snapshot: exercise_name, muscle_group) 1──* session_set (snapshot: muscle_group)
daily_log (วันละแถว: น้ำหนักตัว, แคลอรี่ที่กิน, แคลอรี่ที่ใช้ที่กรอกเอง)

ในเครื่องเท่านั้น: app_settings, onboarding_draft, entitlement_cache, sync_outbox, sync_state
บนคลาวด์เท่านั้น: user_entitlements, revenuecat_events
```

ไม่มี foreign key บังคับระหว่างตารางที่ซิงก์ (ทั้งในเครื่องและบนคลาวด์ — บนคลาวด์มีเฉพาะ `user_id → auth.users`) เพราะแถวอาจมาถึงต่างลำดับระหว่างซิงก์ (เช่น routine มาก่อน program) — ความถูกต้องดูแลในชั้น repo และการลบเป็นแบบ cascade ในโค้ด (เช่น ลบโปรแกรม → soft delete routine/ท่า/ตารางของโปรแกรมนั้น; ลบ routine → ลบ day_override ที่ชี้มา D59)

## 3. ค่าที่เป็นชุด (enum)

| ชนิด | ค่า |
|---|---|
| Sex | `male`, `female` |
| ActivityLevel | `sedentary` (×1.2), `light` (×1.375), `moderate` (×1.55), `active` (×1.725), `very_active` (×1.9) |
| Goal | `lose`, `maintain`, `gain` |
| WeightUnit / LengthUnit | `kg`/`lb`, `cm`/`ftin` |
| RoutineType (SPEC F5) | `push`, `pull`, `legs`, `upper`, `lower`, `full_body`, `other` |
| ProgressionMode (SPEC G2) | `off`, `double`, `linear`, `custom` |
| ProgressionDecision | `accepted`, `skipped`, `adjusted` (หรือ `null` = ยังไม่ตัดสินใจ) |
| เหตุผลของคำแนะนำ (`SessionProgression.reason`) | `increase`, `repeat`, `addRep`, `deload`, `custom`, `off`, `first` |
| Intensity (MET) | `light` 3.5, `moderate` 5, `hard` 6 (แก้ได้ในโปรไฟล์ ช่วง 1–15) |
| RIR / RPE (`routine_exercise`) | RIR จำนวนเต็ม 0–10, RPE 1–10 เพิ่มทีละ 0.5, ว่าง = ไม่ระบุ (`src/domain/effort.ts`) |
| SessionStatus | `active`, `completed` |
| OverrideKind | `rest`, `routine`, `empty` |
| MuscleGroup (SPEC F8) | chest, back, shoulders, biceps, triceps, forearms, quads, hamstrings, glutes, calves, core |
| Equipment | barbell, dumbbell, machine, cable, bodyweight, kettlebell, band, other |
| EntitlementState (B8) | `NO_ENTITLEMENT`, `TRIALING`, `SUBSCRIBED_MONTHLY`, `LIFETIME`, `BILLING_GRACE`, `EXPIRED` |
| สถานะซิงก์ (ไม่เก็บใน DB — `src/stores/sync.ts`) | `idle`, `syncing`, `offline`, `error`, `waiting`, `disabled` |

## 4. ตารางและหน้าที่

| ตาราง | ซิงก์ | หน้าที่ | SPEC |
|---|---|---|---|
| `profile` | ✔ | ข้อมูลร่างกาย หน่วย เป้าหมาย % ลด/เพิ่ม โปรตีน ไขมัน MET ตัวจับเวลาพัก วันเริ่มสัปดาห์ ก้าวน้ำหนัก โปรแกรมที่ใช้งาน | H1–H2, K, E |
| `custom_exercise` | ✔ | ท่าที่ผู้ใช้สร้าง/แก้ไขเอง (กล้ามเนื้อหลัก/รอง อุปกรณ์ หมายเหตุ) — ท่าในตัวอยู่ใน `src/data/exercises.json` | F7–F8 |
| `program` | ✔ | กรุ๊ปโปรแกรม (จากเทมเพลตหรือสร้างเอง) | F1–F4 |
| `routine` | ✔ | routine ในกรุ๊ป + แท็กประเภท | F2, F5 |
| `routine_exercise` | ✔ | ท่าใน routine: เซ็ต ช่วงครั้ง โหมด progression ก้าวน้ำหนัก RIR/RPE เวลาพัก รอบสัปดาห์ (custom) เป้าหมายปัจจุบัน จำนวนครั้งที่พลาด | G2 |
| `week_plan` | ✔ | ตารางประจำสัปดาห์ต่อโปรแกรม (วัน 0–6 + เปิด/ปิด) | E |
| `day_override` | ✔ | เปลี่ยนแผนเฉพาะวันที่ โดยไม่แก้ตารางหลัก (วันเดียวอาจมีหลายแถวจากสองเครื่อง ใช้แถวที่แก้ล่าสุด D59) | E, D |
| `workout_session` | ✔ | เซสชันการฝึก + snapshot + เวลา ความหนัก kcal น้ำหนักตัว ณ ตอนนั้น บันทึกย้อนหลังหรือไม่ (`backfilled`) และ `progression` (JSON คำแนะนำครั้งหน้า + การตัดสินใจ) | G1–G2, I1, M |
| `session_exercise` | ✔ | ท่าในเซสชัน (snapshot ชื่อ/กล้ามเนื้อ) ลำดับ เวลาพักเฉพาะท่า | G1 |
| `session_set` | ✔ | เซ็ต: เป้าหมาย/ค่าครั้งก่อน/ค่าจริง เสร็จหรือไม่ + snapshot กล้ามเนื้อ | G1, I2 |
| `daily_log` | ✔ | น้ำหนักตัว, แคลอรี่ที่กิน (H4), แคลอรี่ที่ใช้ที่กรอกเอง (H3) | H3–H4, I3–I4 |
| `app_settings` | — | ภาษา ธีม สีหลัก ผ่านขั้นตั้งค่าแล้วหรือยัง ตัวชี้วัดสถิติ ผู้ใช้ล่าสุดที่จำไว้ (ตั้งค่าของเครื่อง ใช้ได้ก่อนล็อกอิน; ไม่มีโทเค็น) | C, K |
| `onboarding_draft` | — | คำตอบขั้นตั้งค่าเริ่มต้นก่อนล็อกอิน (แถวเดียว id `draft`) → ย้ายเข้าบัญชีเมื่อทำครบและมีสิทธิ์ (เติมเฉพาะช่องที่ว่าง; ล้างเมื่อลบบัญชี) ดู `data` ด้านล่าง | C, B11 |
| `entitlement_cache` | — | แคชสถานะสิทธิ์ล่าสุดต่อบัญชี สำหรับออฟไลน์ (B9) รวม `also_renewing_monthly` = ซื้อขาดแล้วแต่รายเดือนยังต่ออายุ (ใช้เตือนให้ยกเลิกในสโตร์ J5) | B8–B9, J5 |
| `sync_outbox` | — | คิวแถวที่รอส่งขึ้นคลาวด์ (unique ต่อ ตาราง+แถว) มี `version` กันการลบคิวที่ถูกแก้ระหว่างส่ง, `attempts` นับเฉพาะการถูกเซิร์ฟเวอร์ปฏิเสธ (ครบ 5 = แถวเสีย: ข้ามแต่ยังอยู่ในคิวและนับเป็นรอส่ง), `last_error` | L |
| `sync_state` | — | เคอร์เซอร์การดึงต่อบัญชีต่อตาราง (คีย์ `cursor:<userId>:<table>` ค่า `<เวลา ISO>|<id>`) | L |

### โครงสร้าง JSON ที่ควรรู้

| คอลัมน์ | รูปแบบ |
|---|---|
| `workout_session.progression` | `SessionProgression[]` — ต่อท่าที่มาจาก routine: `sessionExerciseId`, `routineExerciseId`, `exerciseId`, `exerciseName`, `targetWeightKg` (null ได้), `targetReps`, `reason`, `failStreak`, `deloadOffered`, `decision` (null จนกว่าผู้ใช้ยอมรับ/ข้าม/ปรับ ตัดสินได้ครั้งเดียวต่อท่า) ค่า `null` ทั้งคอลัมน์ = เซสชันที่ยังไม่จบ/เซสชันเก่าก่อน migration |
| `routine_exercise.custom_weeks` | `{ reps, percent }[]` รอบสัปดาห์ของโหมด custom (วนซ้ำ นับจาก `progression_started_at`) |
| `week_plan.days` | `number[]` วัน 0 = อาทิตย์ … 6 = เสาร์ |
| `custom_exercise.secondary_muscles` | `MuscleGroup[]` |
| `onboarding_draft.data` | `sex, age, heightCm, weightKg, activityLevel, goal, weightUnit, lengthUnit, profileSkipped, quickStart` โดย `quickStart` = `{kind:'template',key}` \| `{kind:'custom'}` \| `{kind:'skip'}`; `profileSkipped = true` ⇒ ข้อมูลร่างกายถูกล้างและไม่ถูกย้ายเข้าบัญชี (D67) |

### ดัชนีในเครื่อง

`profile_owner_idx`, `custom_exercise_owner_idx`, `program_owner_idx`, `routine_program_idx`, `routine_owner_idx`, `routine_exercise_routine_idx`, `routine_exercise_owner_idx`, `week_plan_program_idx`, `week_plan_owner_idx`, `day_override_owner_date_idx` (owner, date), `workout_session_owner_date_idx` (owner, date), `session_exercise_session_idx`, `session_set_session_idx`, `session_set_exercise_idx`, `daily_log_owner_date_idx` (owner, date) และ unique `sync_outbox_row_idx` (table_name, row_id)

## 5. ฝั่งคลาวด์ (Supabase)

ไฟล์ migration (รันตามลำดับชื่อ; `npm run supabase:verify` รันทั้งสามไฟล์บน Postgres จริงแล้วรัน `supabase/tests/rls_test.sql`):

| ไฟล์ | ทำอะไร |
|---|---|
| `20261009000000_init.sql` | `user_entitlements`, `revenuecat_events` (+ index `revenuecat_events_user_idx`), ฟังก์ชัน `has_sync_access(uid)` และ `sync_before_write()`, ตารางที่ซิงก์ทั้ง 11 ตาราง, RLS + policy + ดัชนีเคอร์เซอร์ + trigger ของทุกตาราง |
| `20261010000000_session_progression.sql` | `alter table public.workout_session add column progression jsonb` (ตรงกับ drizzle `0001`) — D53 |
| `20261011000000_revenuecat_events_retention.sql` | index `revenuecat_events_received_idx (received_at)` + ฟังก์ชัน `purge_revenuecat_events(retain_days integer default 90)` — D74 |

- ตารางที่ซิงก์ชื่อเดียวกับในเครื่อง: `owner_id` → `user_id uuid not null references auth.users on delete cascade` และเพิ่ม `server_updated_at timestamptz not null default clock_timestamp()` (ตั้งโดย trigger) ชนิดคอลัมน์: text → text, integer → bigint, real → double precision, boolean → boolean, JSON → jsonb
- RLS: อ่าน/เพิ่ม/แก้ได้เฉพาะแถวของตัวเอง **และ** เมื่อ `has_sync_access(auth.uid())` (`LIFETIME` หรือ `TRIALING`/`SUBSCRIBED_MONTHLY`/`BILLING_GRACE` ที่ `expiration_at` ว่างหรือยังไม่ถึง) — ไม่มี policy ลบ (J6) และ `revoke all ... from anon` ทุกตาราง; ชื่อ policy `<table>_select_own` / `_insert_own` / `_update_own`
- Trigger `<table>_sync_write` เรียก `sync_before_write()` ก่อน insert/update: ห้ามเปลี่ยน `user_id`, ข้ามการเขียนที่ `updated_at` เก่ากว่าบนเซิร์ฟเวอร์ (LWW, คืน null ไม่ error), ตั้ง `server_updated_at = clock_timestamp()`
- `user_entitlements` เขียนได้เฉพาะ Edge Function `revenuecat-webhook` (service role); ผู้ใช้อ่านของตัวเองได้ (`user_entitlements_read_own`) เซิร์ฟเวอร์ไม่เก็บ `also_renewing_monthly` (ใช้แสดงคำเตือนในแอปเท่านั้น)
- `revenuecat_events` กันเหตุการณ์ซ้ำ (id ของ event) เก็บเฉพาะ id/type/app_user_id/event_at/received_at (ไม่เก็บ payload เต็ม B13) ไม่มี policy = เข้าถึงได้เฉพาะ service role; webhook เรียก `purge_revenuecat_events(90)` หลังบันทึกทุกครั้ง (ล้มเหลวไม่ทำให้ webhook ล้ม) — ฟังก์ชัน `security definer`, ถอนสิทธิ์จาก public/anon/authenticated, ให้เฉพาะ `service_role`; ถ้าอยากลบตามเวลาโดยไม่พึ่งทราฟฟิกให้ตั้ง pg_cron ตามคอมเมนต์ในไฟล์ migration
- ดัชนี `<table>_sync_cursor_idx (user_id, server_updated_at, id)` ทุกตารางที่ซิงก์ สำหรับการดึงแบบเคอร์เซอร์ (D38)
- ตรวจบน Postgres จริงได้ด้วย `npm run supabase:verify`

## 6. การเปลี่ยน schema

1. แก้ `src/db/schema.ts` (ห้ามแก้ migration เก่า)
2. `npm run db:generate` → `drizzle-kit generate` สร้าง `drizzle/NNNN_*.sql` แล้ว `scripts/embed-migrations.js` สร้าง `src/db/migrations.generated.ts` (ตัวรันใช้ `PRAGMA user_version`, ทีละ migration ใน transaction — D13)
3. เพิ่ม migration ใหม่ใน `supabase/migrations/` ให้คอลัมน์ตรงกัน — ตารางที่ซิงก์เท่านั้น (เทสต์ schema parity อ่านทั้งโฟลเดอร์ รวม `alter table ... add column` และจะล้มถ้าลืม) ตารางในเครื่องอย่าง `entitlement_cache`/`sync_outbox` ไม่ต้องมีบนคลาวด์
4. ปรับตารางใน §4 และ §7 ของไฟล์นี้
5. `npm run check` และ `npm run supabase:verify`

ประวัติ migration ในเครื่อง (drizzle):

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `0000_init.sql` | ทุกตาราง + ดัชนี |
| `0001_uneven_albert_cleary.sql` | `workout_session.progression` (text/JSON) |
| `0002_charming_mikhail_rasputin.sql` | `entitlement_cache.also_renewing_monthly` (integer, default false, not null) |
| `0003_third_rocket_raccoon.sql` | `sync_outbox.version` (integer, default 1, not null) |

## 7. คอลัมน์ทั้งหมด (สร้างจาก schema)

> ตารางในเครื่องด้านล่างสร้างจาก `src/db/schema.ts` โดยอ่าน `getTableConfig` ของ Drizzle (ชนิด/ว่างได้/ค่าเริ่มต้น) ณ วันที่ตรวจล่าสุดของไฟล์นี้ — ใน `package.json` และ `scripts/` ไม่มีสคริปต์สร้างเอกสารนี้ จึงต้องทำซ้ำเองเมื่อแก้ schema ("ชนิด" เป็นชนิดของ Drizzle: Text/Integer/Real, JSON = text ที่เก็บ JSON, boolean = integer 0/1)

### `app_settings`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `key` | Text |  |  |
| `value` | Text |  |  |

### `custom_exercise`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `name` | Text |  |  |
| `primary_muscle` | Text |  |  |
| `secondary_muscles` | JSON (text) |  | `[]` |
| `equipment` | Text |  | `"other"` |
| `notes` | Text | ได้ |  |

### `daily_log`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `date` | Text |  |  |
| `kcal_expenditure_override` | Real | ได้ |  |
| `kcal_intake` | Real | ได้ |  |
| `body_weight_kg` | Real | ได้ |  |

### `day_override`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `date` | Text |  |  |
| `kind` | Text |  |  |
| `routine_id` | Text | ได้ |  |

### `entitlement_cache`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `user_id` | Text |  |  |
| `state` | Text |  |  |
| `product_id` | Text | ได้ |  |
| `period_type` | Text | ได้ |  |
| `expiration_date` | Integer | ได้ |  |
| `will_renew` | boolean (integer) |  | `false` |
| `billing_issue_at` | Integer | ได้ |  |
| `verified_at` | Integer |  |  |
| `also_renewing_monthly` | boolean (integer) |  | `false` |

### `onboarding_draft`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `data` | JSON (text) |  |  |
| `updated_at` | Integer |  |  |
| `migrated_at` | Integer | ได้ |  |
| `migrated_to` | Text | ได้ |  |

### `profile`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `sex` | Text | ได้ |  |
| `age` | Integer | ได้ |  |
| `height_cm` | Real | ได้ |  |
| `weight_kg` | Real | ได้ |  |
| `activity_level` | Text | ได้ |  |
| `goal` | Text | ได้ |  |
| `weight_unit` | Text |  | `"kg"` |
| `length_unit` | Text |  | `"cm"` |
| `deficit_pct` | Integer |  | `20` |
| `surplus_pct` | Integer |  | `10` |
| `protein_per_kg` | Real | ได้ |  |
| `fat_pct` | Integer |  | `25` |
| `met_light` | Real |  | `3.5` |
| `met_moderate` | Real |  | `5` |
| `met_hard` | Real |  | `6` |
| `rest_timer_enabled` | boolean (integer) |  | `true` |
| `rest_timer_sec` | Integer |  | `90` |
| `week_start` | Integer |  | `1` |
| `weight_step_kg` | Real |  | `2.5` |
| `active_program_id` | Text | ได้ |  |

### `program`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `name` | Text |  |  |
| `template_key` | Text | ได้ |  |
| `sort_order` | Integer |  | `0` |

### `routine`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `program_id` | Text |  |  |
| `name` | Text |  |  |
| `type` | Text |  | `"other"` |
| `sort_order` | Integer |  | `0` |

### `routine_exercise`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `routine_id` | Text |  |  |
| `exercise_id` | Text |  |  |
| `sort_order` | Integer |  | `0` |
| `sets` | Integer |  | `3` |
| `rep_min` | Integer |  | `8` |
| `rep_max` | Integer |  | `12` |
| `progression_mode` | Text |  | `"double"` |
| `weight_step_kg` | Real |  | `2.5` |
| `rir` | Integer | ได้ |  |
| `rpe` | Real | ได้ |  |
| `rest_sec` | Integer | ได้ |  |
| `custom_weeks` | JSON (text) | ได้ |  |
| `base_weight_kg` | Real | ได้ |  |
| `target_weight_kg` | Real | ได้ |  |
| `target_reps` | Integer | ได้ |  |
| `fail_streak` | Integer |  | `0` |
| `progression_started_at` | Integer | ได้ |  |

### `session_exercise`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `session_id` | Text |  |  |
| `exercise_id` | Text |  |  |
| `exercise_name` | Text |  |  |
| `muscle_group` | Text |  |  |
| `routine_exercise_id` | Text | ได้ |  |
| `sort_order` | Integer |  | `0` |
| `rest_sec` | Integer | ได้ |  |

### `session_set`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `session_id` | Text |  |  |
| `session_exercise_id` | Text |  |  |
| `exercise_id` | Text |  |  |
| `muscle_group` | Text |  |  |
| `set_index` | Integer |  |  |
| `weight_kg` | Real | ได้ |  |
| `reps` | Integer | ได้ |  |
| `target_weight_kg` | Real | ได้ |  |
| `target_reps` | Integer | ได้ |  |
| `prev_weight_kg` | Real | ได้ |  |
| `prev_reps` | Integer | ได้ |  |
| `done` | boolean (integer) |  | `false` |
| `completed_at` | Integer | ได้ |  |

### `sync_outbox`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Integer |  |  |
| `table_name` | Text |  |  |
| `row_id` | Text |  |  |
| `owner_id` | Text |  |  |
| `queued_at` | Integer |  |  |
| `version` | Integer |  | `1` |
| `attempts` | Integer |  | `0` |
| `last_error` | Text | ได้ |  |

### `sync_state`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `key` | Text |  |  |
| `value` | Text |  |  |

### `week_plan`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `program_id` | Text |  |  |
| `routine_id` | Text |  |  |
| `days` | JSON (text) |  | `[]` |
| `enabled` | boolean (integer) |  | `true` |
| `sort_order` | Integer |  | `0` |

### `workout_session`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | Text |  |  |
| `owner_id` | Text |  | `"local"` |
| `created_at` | Integer |  |  |
| `updated_at` | Integer |  |  |
| `deleted_at` | Integer | ได้ |  |
| `date` | Text |  |  |
| `routine_id` | Text | ได้ |  |
| `program_id` | Text | ได้ |  |
| `program_name` | Text | ได้ |  |
| `routine_name` | Text | ได้ |  |
| `routine_type` | Text | ได้ |  |
| `started_at` | Integer |  |  |
| `ended_at` | Integer | ได้ |  |
| `duration_sec` | Integer | ได้ |  |
| `intensity` | Text | ได้ |  |
| `kcal` | Real | ได้ |  |
| `body_weight_kg` | Real | ได้ |  |
| `status` | Text |  | `"active"` |
| `backfilled` | boolean (integer) |  | `false` |
| `progression` | JSON (text) | ได้ |  |


### ตารางที่มีเฉพาะบนคลาวด์ (Postgres)

ตารางที่ซิงก์บนคลาวด์มีคอลัมน์เหมือนข้างต้นทุกตัว ยกเว้น `owner_id` → `user_id uuid not null` (อ้าง `auth.users` on delete cascade, ไม่มีค่าเริ่มต้น) และมี `server_updated_at timestamptz not null` เพิ่ม; ชนิด Integer → `bigint`, Real → `double precision`, boolean → `boolean`, JSON → `jsonb` (ค่าเริ่มต้นของ JSON เช่น `'[]'`) สองตารางต่อไปนี้ไม่มีในเครื่อง (จาก `20261009000000_init.sql`)

#### `user_entitlements`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `user_id` | uuid (PK, อ้าง `auth.users` on delete cascade) |  |  |
| `state` | text (check ต้องเป็นหนึ่งในหกสถานะของ EntitlementState) |  | `'NO_ENTITLEMENT'` |
| `product_id` | text | ได้ |  |
| `period_type` | text | ได้ |  |
| `expiration_at` | timestamptz | ได้ |  |
| `will_renew` | boolean |  | `false` |
| `billing_issue_at` | timestamptz | ได้ |  |
| `last_event_id` | text | ได้ |  |
| `last_event_at` | timestamptz | ได้ |  |
| `updated_at` | timestamptz |  | `now()` |

#### `revenuecat_events`

| คอลัมน์ | ชนิด | ว่างได้ | ค่าเริ่มต้น |
|---|---|---|---|
| `id` | text (PK = event id ของ RevenueCat) |  |  |
| `type` | text |  |  |
| `app_user_id` | text | ได้ |  |
| `event_at` | timestamptz | ได้ |  |
| `received_at` | timestamptz |  | `now()` |
