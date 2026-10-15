# โครงสร้างข้อมูล (DATA_MODEL)

> แหล่งความจริง: `src/db/schema.ts` (Drizzle) → migration ในเครื่อง `drizzle/0000–0006_*.sql` (+ `src/db/migrations.generated.ts`) — **ไม่มีฝั่งคลาวด์แล้ว** (แอปออฟไลน์ล้วน D81, [SPEC_CHANGES.md](SPEC_CHANGES.md)) ข้อมูลผู้ใช้อยู่ใน SQLite บนเครื่องเท่านั้น
> ตารางคอลัมน์ท้ายไฟล์ (§7) ตรวจกับ schema จริง ณ วันที่แก้ไฟล์นี้ — เอกสารนี้ไม่มีเทสต์ตรวจ ต้องปรับเองเมื่อแก้ schema (ส่วนไฟล์สำรองมีเทสต์ round-trip ทุกตารางใน `__tests__/db/backup.test.ts`)

## 1. หลักการ

| เรื่อง | กติกา |
|---|---|
| แหล่งความจริงเดียว | SQLite ในเครื่อง (expo-sqlite) — ไม่มีคลาวด์/ซิงก์ การย้ายเครื่องทำด้วยไฟล์สำรอง (D82) (SPEC_CHANGES A4, L) |
| คอลัมน์มาตรฐานของตารางผู้ใช้ 11 ตาราง | `id` (UUID จาก `newId()`), `owner_id`, `created_at`, `updated_at`, `deleted_at` (SPEC M) — คงไว้จากยุคซิงก์เพื่อลดการรื้อ schema |
| เจ้าของข้อมูล | `owner_id = 'local'` เสมอ (`getOwner()` คืนค่าคงที่ D81); ทุก query ยังกรอง `owner_id = getOwner()` · migration `0005_reown_local_rows` ย้ายแถวที่เคยผูก id ผู้ใช้ (ยุคล็อกอิน) มาเป็น `'local'` |
| การลบ | soft delete (`deleted_at`) สำหรับรายการที่ผู้ใช้ลบในแอป (ประวัติไม่หาย, ทุก query กรอง `deleted_at IS NULL`); ลบจริงเมื่อ “ลบข้อมูลทั้งหมดในเครื่องนี้” (`wipeLocalData`) หรือกู้คืนจากไฟล์ (แทนที่ทั้งหมด) · แถวที่ลบแล้วไม่ถูกส่งออกในไฟล์สำรอง |
| เวลา | epoch milliseconds (integer) จาก `now()` |
| วันที่ | ข้อความ `YYYY-MM-DD` ตามเวลาท้องถิ่น (D22) |
| น้ำหนัก | เก็บเป็น kg เสมอ แปลงเป็น lb ตอนแสดงผล (D14) |
| การเขียน | ผ่าน `src/db/mutations.ts` เท่านั้น (ใส่ owner, `updated_at` แบบเพิ่มขึ้นเสมอแม้นาฬิกาเครื่องถอยหลัง และแจ้งหน้าจอผ่าน `onLocalWrite`) — ไม่มีคิวซิงก์แล้ว · transaction ซ้อนได้ผ่าน `src/db/transaction.ts` (BEGIN ชั้นนอก, SAVEPOINT ชั้นใน — D42) |
| แถวที่ควรมีแถวเดียว | `profile` (หนึ่งแถว) และ `daily_log` (ต่อวัน) — ไม่มี unique constraint (ฐานข้อมูลที่อัปเกรดจากยุคซิงก์อาจมีแถวซ้ำจากหลายบัญชีหลัง `0005`) repo จึงเลือกแถวที่แก้ล่าสุด (`profileRepo`, `dailyLogRepo` เรียง `updated_at` มากสุดก่อน) |
| Snapshot | เซสชันเก็บชื่อกรุ๊ป/ชื่อ routine/ประเภท ณ เวลาที่ฝึก และเซ็ตเก็บกลุ่มกล้ามเนื้อ ณ เวลาที่ฝึก → สถิติไม่เปลี่ยนเมื่อแก้/ลบภายหลัง (SPEC F6, M) |
| คำแนะนำครั้งหน้า | คำนวณครั้งเดียวตอนกดจบเซสชัน แล้วเก็บใน `workout_session.progression` พร้อมการตัดสินใจของผู้ใช้ (D53) |

## 2. ความสัมพันธ์

```
profile (1 แถว) ── activeProgramId ──▶ program
program 1──* routine 1──* routine_exercise ──▶ exercise (built-in id หรือ custom_exercise.id)
program 1──* week_plan *──1 routine            (แถวละ routine: วันในสัปดาห์ + เปิด/ปิด)
day_override (วันที่เฉพาะ: rest | routine | empty) ──▶ routine
workout_session (snapshot: program_name, routine_name, routine_type; progression = JSON คำแนะนำครั้งหน้า)
   1──* session_exercise (snapshot: exercise_name, muscle_group) 1──* session_set (snapshot: muscle_group)
daily_log (วันละแถว: น้ำหนักตัว, แคลอรี่ที่กิน, แคลอรี่ที่ใช้ที่กรอกเอง)

ตารางของเครื่อง (ไม่อยู่ในไฟล์สำรอง): app_settings, onboarding_draft, entitlement_cache
```

ไม่มี foreign key บังคับระหว่างตารางผู้ใช้ (ออกแบบไว้ตั้งแต่ยุคซิงก์ และไฟล์สำรองกู้คืนโดยไม่ตรวจความสัมพันธ์ข้ามตาราง — D82) — ความถูกต้องดูแลในชั้น repo และการลบเป็นแบบ cascade ในโค้ด (เช่น ลบโปรแกรม → soft delete routine/ท่า/ตารางของโปรแกรมนั้น; ลบ routine → ลบ day_override ที่ชี้มา D59)

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

## 4. ตารางและหน้าที่

| ตาราง | ในไฟล์สำรอง | หน้าที่ | SPEC |
|---|---|---|---|
| `profile` | ✔ | ข้อมูลร่างกาย หน่วย เป้าหมาย % ลด/เพิ่ม โปรตีน ไขมัน MET ตัวจับเวลาพัก วันเริ่มสัปดาห์ ก้าวน้ำหนัก โปรแกรมที่ใช้งาน | H1–H2, K, E |
| `custom_exercise` | ✔ | ท่าที่ผู้ใช้สร้าง/แก้ไขเอง (กล้ามเนื้อหลัก/รอง อุปกรณ์ หมายเหตุ) — ท่าในตัวอยู่ใน `src/data/exercises.json` | F7–F8 |
| `program` | ✔ | กรุ๊ปโปรแกรม (จากเทมเพลตหรือสร้างเอง) | F1–F4 |
| `routine` | ✔ | routine ในกรุ๊ป + แท็กประเภท | F2, F5 |
| `routine_exercise` | ✔ | ท่าใน routine: เซ็ต ช่วงครั้ง โหมด progression ก้าวน้ำหนัก RIR/RPE เวลาพัก รอบสัปดาห์ (custom) เป้าหมายปัจจุบัน จำนวนครั้งที่พลาด | G2 |
| `week_plan` | ✔ | ตารางประจำสัปดาห์ต่อโปรแกรม (วัน 0–6 + เปิด/ปิด) | E |
| `day_override` | ✔ | เปลี่ยนแผนเฉพาะวันที่ โดยไม่แก้ตารางหลัก (วันเดียวอาจมีหลายแถว ใช้แถวที่แก้ล่าสุด D59) | E, D |
| `workout_session` | ✔ | เซสชันการฝึก + snapshot + เวลา ความหนัก kcal น้ำหนักตัว ณ ตอนนั้น บันทึกย้อนหลังหรือไม่ (`backfilled`) และ `progression` (JSON คำแนะนำครั้งหน้า + การตัดสินใจ) | G1–G2, I1, M |
| `session_exercise` | ✔ | ท่าในเซสชัน (snapshot ชื่อ/กล้ามเนื้อ) ลำดับ เวลาพักเฉพาะท่า | G1 |
| `session_set` | ✔ | เซ็ต: เป้าหมาย/ค่าครั้งก่อน/ค่าจริง เสร็จหรือไม่ + snapshot กล้ามเนื้อ | G1, I2 |
| `daily_log` | ✔ | น้ำหนักตัว, แคลอรี่ที่กิน (H4), แคลอรี่ที่ใช้ที่กรอกเอง (H3) | H3–H4, I3–I4 |
| `app_settings` | เฉพาะ `onboardingDone` | ค่าของเครื่อง: ภาษา ธีม สีหลัก ตัวชี้วัด/มุมมองสถิติ ผ่านขั้นตั้งค่าแล้วหรือยัง (`onboardingDone`) วันที่สำรองล่าสุด (`lastBackupAt`) — “ลบข้อมูลทั้งหมด” ลบเฉพาะ `onboardingDone`/`lastBackupAt` | C, K |
| `onboarding_draft` | — | คำตอบขั้นตั้งค่าเริ่มต้นก่อนได้สิทธิ์ (แถวเดียว id `draft`) → นำเข้าข้อมูลหลักเมื่อทำครบและมีสิทธิ์ (เติมเฉพาะช่องที่ว่าง; `migrated_to` = `'local'`) ล้างเมื่อลบข้อมูลทั้งหมด/กู้คืนจากไฟล์ ดู `data` ด้านล่าง | C, M |
| `entitlement_cache` | — | แคชสถานะสิทธิ์ของเครื่อง (แถวเดียว `user_id = 'local'` — migration `0006`) สำหรับออฟไลน์ (B9) ล้างเมื่อลบข้อมูลทั้งหมด ไม่ถูกแตะตอนกู้คืนจากไฟล์ รวม `also_renewing_monthly` = ซื้อขาดแล้วแต่รายเดือนยังต่ออายุ (ใช้เตือนให้ยกเลิกในสโตร์ J5) | B8–B9, J5 |

### โครงสร้าง JSON ที่ควรรู้

| คอลัมน์ | รูปแบบ |
|---|---|
| `workout_session.progression` | `SessionProgression[]` — ต่อท่าที่มาจาก routine: `sessionExerciseId`, `routineExerciseId`, `exerciseId`, `exerciseName`, `targetWeightKg` (null ได้), `targetReps`, `reason`, `failStreak`, `deloadOffered`, `decision` (null จนกว่าผู้ใช้ยอมรับ/ข้าม/ปรับ ตัดสินได้ครั้งเดียวต่อท่า) ค่า `null` ทั้งคอลัมน์ = เซสชันที่ยังไม่จบ/เซสชันเก่าก่อน migration |
| `routine_exercise.custom_weeks` | `{ reps, percent }[]` รอบสัปดาห์ของโหมด custom (วนซ้ำ นับจาก `progression_started_at`) |
| `week_plan.days` | `number[]` วัน 0 = อาทิตย์ … 6 = เสาร์ |
| `custom_exercise.secondary_muscles` | `MuscleGroup[]` |
| `onboarding_draft.data` | `sex, age, heightCm, weightKg, activityLevel, goal, weightUnit, lengthUnit, profileSkipped, quickStart` โดย `quickStart` = `{kind:'template',key}` \| `{kind:'custom'}` \| `{kind:'skip'}`; `profileSkipped = true` ⇒ ข้อมูลร่างกายถูกล้างและไม่ถูกนำเข้าข้อมูลหลัก (D67) |

### ดัชนีในเครื่อง

`profile_owner_idx`, `custom_exercise_owner_idx`, `program_owner_idx`, `routine_program_idx`, `routine_owner_idx`, `routine_exercise_routine_idx`, `routine_exercise_owner_idx`, `week_plan_program_idx`, `week_plan_owner_idx`, `day_override_owner_date_idx` (owner, date), `workout_session_owner_date_idx` (owner, date), `session_exercise_session_idx`, `session_set_session_idx`, `session_set_exercise_idx`, `daily_log_owner_date_idx` (owner, date)

## 5. ไฟล์สำรองข้อมูล (D82)

รูปแบบและการตรวจอยู่ใน `src/domain/backup.ts` (ฟังก์ชันล้วน) การอ่าน/เขียนฐานข้อมูลอยู่ใน `src/db/backup.ts`

```text
{
  "format": "fitnese-backup",
  "formatVersion": 1,
  "schemaVersion": <จำนวน migration ของแอปที่ส่งออก>,
  "appVersion": "1.0.0",
  "exportedAt": <epoch ms>,
  "settings": { "onboardingDone": true },
  "tables": { "profile": [ … ], "program": [ … ], …ครบ 11 ตารางผู้ใช้ }
}
```

- แถวในไฟล์ใช้ชื่อคอลัมน์แบบ camelCase ของ Drizzle **ไม่มี `ownerId`** และไม่มีแถวที่ `deletedAt` ไม่ว่าง
- กู้คืน: ตรวจขนาด ≤ 50 MB, JSON, `format`, `formatVersion`/`schemaVersion` ไม่ใหม่กว่าแอป, ครบทุกตารางที่ schema ของไฟล์ควรมี, ชนิดค่าทุกคอลัมน์, id ซ้ำ → แทนที่ตารางผู้ใช้ทั้งหมด + ลบ `onboarding_draft` ในทรานแซกชันเดียว ตั้ง owner เป็น `'local'`
- ไฟล์จาก schema เก่า: คอลัมน์ที่ขาดได้ค่าเริ่มต้นของคอลัมน์ (หรือ null ถ้าว่างได้) ขาดคอลัมน์บังคับที่ไม่มีค่าเริ่มต้น/มีคอลัมน์ที่ไม่รู้จัก = ไฟล์เสีย; ตารางที่เพิ่มทีหลังต้องประกาศ `introducedIn` ตารางที่แอปไม่รู้จักถูกข้าม
- ไม่ตรวจค่า enum และความสัมพันธ์ข้ามตาราง; ค่าของเครื่องและแคชสิทธิ์ไม่อยู่ในไฟล์

## 6. การเปลี่ยน schema

1. แก้ `src/db/schema.ts` (ห้ามแก้ migration เก่า)
2. `npm run db:generate` → `drizzle-kit generate` สร้าง `drizzle/NNNN_*.sql` แล้ว `scripts/embed-migrations.js` สร้าง `src/db/migrations.generated.ts` (ตัวรันใช้ `PRAGMA user_version`, ทีละ migration ใน transaction — D13) — migration ต้องรักษาข้อมูลเดิมของผู้ใช้ (ไม่มีสำเนาบนคลาวด์ให้กู้)
3. ความเข้ากันได้ของไฟล์สำรอง: คอลัมน์ใหม่ในตารางผู้ใช้ต้องมีค่าเริ่มต้นหรือว่างได้ ตารางผู้ใช้ใหม่ต้องเพิ่มใน `USER_TABLES` (สำรอง/ลบข้อมูลทั้งหมดใช้รายการนี้) และประกาศ `introducedIn` แล้วเพิ่มเทสต์ไฟล์จาก schema เก่าใน `__tests__/domain/backup.test.ts`
4. ปรับตารางใน §4 และ §7 ของไฟล์นี้
5. `npm run check`

ประวัติ migration ในเครื่อง (drizzle):

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `0000_init.sql` | ทุกตาราง + ดัชนี |
| `0001_uneven_albert_cleary.sql` | `workout_session.progression` (text/JSON) |
| `0002_charming_mikhail_rasputin.sql` | `entitlement_cache.also_renewing_monthly` (integer, default false, not null) |
| `0003_third_rocket_raccoon.sql` | `sync_outbox.version` (ยุคซิงก์ — ตารางถูกลบใน `0004`) |
| `0004_drop_sync_tables.sql` | `DROP TABLE sync_outbox`, `DROP TABLE sync_state` (D81) |
| `0005_reown_local_rows.sql` | ย้าย `owner_id` ของทุกตารางผู้ใช้เป็น `'local'` (D81) |
| `0006_local_entitlement_cache.sql` | เก็บแถวแคชสิทธิ์ที่ตรวจล่าสุดเป็นของ `'local'`, ลบค่าเซสชันล็อกอินเก่าใน `app_settings`, ตั้ง `onboarding_draft.migrated_to = 'local'` (D81.2) |

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
