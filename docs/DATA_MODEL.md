# โครงสร้างข้อมูล (DATA_MODEL)

> แหล่งความจริง: `src/db/schema.ts` (Drizzle) → migration ในเครื่อง `drizzle/*.sql` (+ `src/db/migrations.generated.ts`) และฝั่งคลาวด์ `supabase/migrations/*.sql`
> ตารางคอลัมน์ท้ายไฟล์สร้างจาก schema จริง — เทสต์ `__tests__/supabase/schema.test.ts` ตรวจว่าคลาวด์ตรงกับในเครื่องทุกคอลัมน์

## 1. หลักการ

| เรื่อง | กติกา |
|---|---|
| แหล่งความจริงหลัก | SQLite ในเครื่อง (expo-sqlite) — ทำงานได้ครบแม้ออฟไลน์ คลาวด์เป็นสำเนาสำหรับซิงก์/ย้ายเครื่อง (SPEC A4, L) |
| คอลัมน์มาตรฐานของทุกตารางที่ซิงก์ | `id` (UUID จาก `newId()`), `owner_id`, `created_at`, `updated_at`, `deleted_at` (SPEC M) |
| เจ้าของข้อมูล | `owner_id = 'local'` ก่อนล็อกอิน → ถูก "claim" เป็น id ผู้ใช้เมื่อได้สิทธิ์ครั้งแรก; ทุก query กรอง `owner_id = getOwner()` (D12) |
| การลบ | soft delete (`deleted_at`) เสมอ เพื่อให้ซิงก์การลบได้และไม่ทำให้ประวัติหาย; ลบจริงเฉพาะตอนลบบัญชี |
| เวลา | epoch milliseconds (integer/bigint) จาก `now()` |
| วันที่ | ข้อความ `YYYY-MM-DD` ตามเวลาท้องถิ่น (D22) |
| น้ำหนัก | เก็บเป็น kg เสมอ แปลงเป็น lb ตอนแสดงผล (D14) |
| การเขียน | ผ่าน `src/db/mutations.ts` เท่านั้น (ใส่ owner, `updated_at` แบบเพิ่มขึ้นเสมอ และคิวซิงก์ `sync_outbox` ใน transaction เดียวกัน) |
| ความขัดแย้ง | last-write-wins ต่อระเบียนด้วย `updated_at` ทั้งในเครื่อง (merge) และบนเซิร์ฟเวอร์ (trigger) |
| Snapshot | เซสชันเก็บชื่อกรุ๊ป/ชื่อ routine/ประเภท ณ เวลาที่ฝึก และเซ็ตเก็บกลุ่มกล้ามเนื้อ ณ เวลาที่ฝึก → สถิติไม่เปลี่ยนเมื่อแก้/ลบภายหลัง (SPEC F6, M) |

## 2. ความสัมพันธ์

```
profile (1 ต่อบัญชี) ── activeProgramId ──▶ program
program 1──* routine 1──* routine_exercise ──▶ exercise (built-in id หรือ custom_exercise.id)
program 1──* week_plan *──1 routine            (แถวละ routine: วันในสัปดาห์ + เปิด/ปิด)
day_override (วันที่เฉพาะ: rest | routine | empty) ──▶ routine
workout_session (snapshot: program_name, routine_name, routine_type)
   1──* session_exercise (snapshot: exercise_name, muscle_group) 1──* session_set (snapshot: muscle_group)
daily_log (วันละแถว: น้ำหนักตัว, แคลอรี่ที่กิน, แคลอรี่ที่ใช้ที่กรอกเอง)

ในเครื่องเท่านั้น: app_settings, onboarding_draft, entitlement_cache, sync_outbox, sync_state
บนคลาวด์เท่านั้น: user_entitlements, revenuecat_events
```

ไม่มี foreign key บังคับระหว่างตารางที่ซิงก์ เพราะแถวอาจมาถึงต่างลำดับระหว่างซิงก์ (เช่น routine มาก่อน program) — ความถูกต้องดูแลในชั้น repo และการลบเป็นแบบ cascade ในโค้ด (เช่น ลบโปรแกรม → soft delete routine/ท่า/ตารางของโปรแกรมนั้น)

## 3. ค่าที่เป็นชุด (enum)

| ชนิด | ค่า |
|---|---|
| Sex | `male`, `female` |
| ActivityLevel | `sedentary` (×1.2), `light` (×1.375), `moderate` (×1.55), `active` (×1.725), `very_active` (×1.9) |
| Goal | `lose`, `maintain`, `gain` |
| WeightUnit / LengthUnit | `kg`/`lb`, `cm`/`ftin` |
| RoutineType (SPEC F5) | `push`, `pull`, `legs`, `upper`, `lower`, `full_body`, `other` |
| ProgressionMode (SPEC G2) | `off`, `double`, `linear`, `custom` |
| Intensity (MET) | `light` 3.5, `moderate` 5, `hard` 6 (แก้ได้ในโปรไฟล์) |
| SessionStatus | `active`, `completed` |
| OverrideKind | `rest`, `routine`, `empty` |
| MuscleGroup (SPEC F8) | chest, back, shoulders, biceps, triceps, forearms, quads, hamstrings, glutes, calves, core |
| Equipment | barbell, dumbbell, machine, cable, bodyweight, kettlebell, band, other |
| EntitlementState (B8) | `NO_ENTITLEMENT`, `TRIALING`, `SUBSCRIBED_MONTHLY`, `LIFETIME`, `BILLING_GRACE`, `EXPIRED` |

## 4. ตารางและหน้าที่

| ตาราง | ซิงก์ | หน้าที่ | SPEC |
|---|---|---|---|
| `profile` | ✔ | ข้อมูลร่างกาย หน่วย เป้าหมาย % ลด/เพิ่ม โปรตีน ไขมัน MET ตัวจับเวลาพัก วันเริ่มสัปดาห์ ก้าวน้ำหนัก โปรแกรมที่ใช้งาน | H1–H2, K, E |
| `custom_exercise` | ✔ | ท่าที่ผู้ใช้สร้าง (กล้ามเนื้อหลัก/รอง อุปกรณ์ หมายเหตุ) — ท่าในตัวอยู่ใน `src/data/exercises.json` | F7–F8 |
| `program` | ✔ | กรุ๊ปโปรแกรม (จากเทมเพลตหรือสร้างเอง) | F1–F4 |
| `routine` | ✔ | routine ในกรุ๊ป + แท็กประเภท | F2, F5 |
| `routine_exercise` | ✔ | ท่าใน routine: เซ็ต ช่วงครั้ง โหมด progression ก้าวน้ำหนัก RIR/RPE เวลาพัก รอบสัปดาห์ (custom) เป้าหมายปัจจุบัน จำนวนครั้งที่พลาด | G2 |
| `week_plan` | ✔ | ตารางประจำสัปดาห์ต่อโปรแกรม (วัน 0–6 + เปิด/ปิด) | E |
| `day_override` | ✔ | เปลี่ยนแผนเฉพาะวันที่ โดยไม่แก้ตารางหลัก | E, D |
| `workout_session` | ✔ | เซสชันการฝึก + snapshot + เวลา ความหนัก kcal น้ำหนักตัว ณ ตอนนั้น บันทึกย้อนหลังหรือไม่ | G1, I1, M |
| `session_exercise` | ✔ | ท่าในเซสชัน (snapshot ชื่อ/กล้ามเนื้อ) ลำดับ เวลาพักเฉพาะท่า | G1 |
| `session_set` | ✔ | เซ็ต: เป้าหมาย/ค่าครั้งก่อน/ค่าจริง เสร็จหรือไม่ + snapshot กล้ามเนื้อ | G1, I2 |
| `daily_log` | ✔ | น้ำหนักตัว, แคลอรี่ที่กิน (H4), แคลอรี่ที่ใช้ที่กรอกเอง (H3) | H3–H4, I3–I4 |
| `app_settings` | — | ภาษา ธีม สีหลัก ผ่านขั้นตั้งค่าแล้วหรือยัง ตัวชี้วัดสถิติ (ตั้งค่าของเครื่อง ใช้ได้ก่อนล็อกอิน) | C, K |
| `onboarding_draft` | — | คำตอบขั้นตั้งค่าเริ่มต้นก่อนล็อกอิน → ย้ายเข้าบัญชีเมื่อได้สิทธิ์ (เติมเฉพาะช่องที่ว่าง) | C, B11 |
| `entitlement_cache` | — | แคชสถานะสิทธิ์ล่าสุดต่อบัญชี สำหรับออฟไลน์ (B9) | B8–B9 |
| `sync_outbox` | — | คิวแถวที่รอส่งขึ้นคลาวด์ (unique ต่อแถว) | L |
| `sync_state` | — | เคอร์เซอร์การดึงต่อบัญชีต่อตาราง | L |

## 5. ฝั่งคลาวด์ (Supabase)

- ตารางที่ซิงก์ชื่อเดียวกับในเครื่อง: `owner_id` → `user_id uuid references auth.users on delete cascade` และเพิ่ม `server_updated_at timestamptz` (ตั้งโดย trigger) ชนิดคอลัมน์: text → text, integer → bigint, real → double precision, boolean → boolean, JSON → jsonb
- RLS: อ่าน/เพิ่ม/แก้ได้เฉพาะแถวของตัวเอง **และ** เมื่อ `has_sync_access(auth.uid())` (ทดลอง/รายเดือน/ซื้อขาด/ช่วงผ่อนผัน ที่ยังไม่หมดอายุ) — ไม่มี policy ลบ (J6)
- Trigger `sync_before_write`: ห้ามเปลี่ยน `user_id`, ข้ามการเขียนที่ `updated_at` เก่ากว่าบนเซิร์ฟเวอร์ (LWW), ตั้ง `server_updated_at = clock_timestamp()`
- `user_entitlements` เขียนได้เฉพาะ Edge Function `revenuecat-webhook` (service role); ผู้ใช้อ่านของตัวเองได้
- `revenuecat_events` กันเหตุการณ์ซ้ำ (id ของ event)
- ดัชนี `(user_id, server_updated_at, id)` ทุกตาราง สำหรับการดึงแบบเคอร์เซอร์ (D38)
- ตรวจบน Postgres จริงได้ด้วย `npm run supabase:verify`

## 6. การเปลี่ยน schema

1. แก้ `src/db/schema.ts`
2. `npm run db:generate` → สร้าง `drizzle/NNNN_*.sql` และ `src/db/migrations.generated.ts` (ตัวรันใช้ `PRAGMA user_version`, ทีละ migration ใน transaction — D13)
3. เพิ่ม migration ใหม่ใน `supabase/migrations/` ให้คอลัมน์ตรงกัน (เทสต์ schema parity จะล้มถ้าลืม)
4. `npm run check` และ `npm run supabase:verify`

## 7. คอลัมน์ทั้งหมด (สร้างจาก schema)

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
