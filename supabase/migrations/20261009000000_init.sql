-- Fitnese — โครงสร้างฐานข้อมูลบนคลาวด์ (SPEC L, M, J6)
-- ตารางที่ซิงก์มีคอลัมน์ตรงกับ SQLite ในเครื่อง (src/db/schema.ts) ต่างกันแค่:
--   owner_id (ในเครื่อง) → user_id uuid อ้างอิง auth.users, และมี server_updated_at สำหรับเคอร์เซอร์การดึง
-- เวลา (created_at/updated_at/deleted_at/…) เป็น epoch ms แบบ bigint เหมือนในเครื่อง
-- มีเทสต์ตรวจว่าคอลัมน์ตรงกับ schema ในเครื่อง: __tests__/supabase/schema.test.ts

-- ───────────── สิทธิ์การใช้งาน (อัปเดตโดย RevenueCat webhook เท่านั้น) ─────────────

create table public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state text not null default 'NO_ENTITLEMENT'
    check (state in ('NO_ENTITLEMENT', 'TRIALING', 'SUBSCRIBED_MONTHLY', 'LIFETIME', 'BILLING_GRACE', 'EXPIRED')),
  product_id text,
  period_type text,
  expiration_at timestamptz,
  will_renew boolean not null default false,
  billing_issue_at timestamptz,
  last_event_id text,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements enable row level security;
-- ผู้ใช้อ่านสถานะของตัวเองได้ เขียนได้เฉพาะ service role (Edge Function) — ไม่มี policy insert/update
create policy user_entitlements_read_own on public.user_entitlements
  for select to authenticated using (user_id = (select auth.uid()));

-- กันเหตุการณ์ webhook ซ้ำ (RevenueCat ส่งซ้ำได้) — เก็บเฉพาะที่จำเป็น ไม่เก็บ payload เต็ม (ข้อมูลขั้นต่ำ B13)
-- แถวของผู้ใช้ถูกลบตอนลบบัญชี (Edge Function delete-account, B12)
create table public.revenuecat_events (
  id text primary key,
  type text not null,
  app_user_id text,
  event_at timestamptz,
  received_at timestamptz not null default now()
);
create index revenuecat_events_user_idx on public.revenuecat_events (app_user_id);
alter table public.revenuecat_events enable row level security;
-- ไม่มี policy: เข้าถึงได้เฉพาะ service role

/**
 * ซิงก์ได้เมื่อมีสิทธิ์ (ช่วงทดลอง/รายเดือน/ซื้อขาด/ช่วงผ่อนผันการชำระเงิน) และยังไม่หมดอายุ — SPEC J6
 * สอดคล้องกับ hasAccess() ใน src/domain/entitlement/machine.ts
 */
create or replace function public.has_sync_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements e
    where e.user_id = uid
      and (
        e.state = 'LIFETIME'
        or (
          e.state in ('TRIALING', 'SUBSCRIBED_MONTHLY', 'BILLING_GRACE')
          and (e.expiration_at is null or e.expiration_at > now())
        )
      )
  );
$$;

revoke all on function public.has_sync_access(uuid) from public, anon;
grant execute on function public.has_sync_access(uuid) to authenticated, service_role;

-- ───────────── last-write-wins ต่อระเบียน + เคอร์เซอร์ ─────────────

create or replace function public.sync_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id cannot change' using errcode = '42501';
    end if;
    -- ฉบับที่ส่งมาเก่ากว่าบนคลาวด์ → ข้าม (ไม่ error เพื่อให้ batch upsert อื่นๆ ผ่าน) ลูกค้าจะได้ฉบับใหม่ตอนดึง
    if new.updated_at < old.updated_at then
      return null;
    end if;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

-- ───────────── ตารางที่ซิงก์ ─────────────

create table public.profile (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  sex text,
  age bigint,
  height_cm double precision,
  weight_kg double precision,
  activity_level text,
  goal text,
  weight_unit text not null default 'kg',
  length_unit text not null default 'cm',
  deficit_pct bigint not null default 20,
  surplus_pct bigint not null default 10,
  protein_per_kg double precision,
  fat_pct bigint not null default 25,
  met_light double precision not null default 3.5,
  met_moderate double precision not null default 5,
  met_hard double precision not null default 6,
  rest_timer_enabled boolean not null default true,
  rest_timer_sec bigint not null default 90,
  week_start bigint not null default 1,
  weight_step_kg double precision not null default 2.5,
  active_program_id text,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.custom_exercise (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  name text not null,
  primary_muscle text not null,
  secondary_muscles jsonb not null default '[]',
  equipment text not null default 'other',
  notes text,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.program (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  name text not null,
  template_key text,
  sort_order bigint not null default 0,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.routine (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  program_id text not null,
  name text not null,
  type text not null default 'other',
  sort_order bigint not null default 0,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.routine_exercise (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  routine_id text not null,
  exercise_id text not null,
  sort_order bigint not null default 0,
  sets bigint not null default 3,
  rep_min bigint not null default 8,
  rep_max bigint not null default 12,
  progression_mode text not null default 'double',
  weight_step_kg double precision not null default 2.5,
  rir bigint,
  rpe double precision,
  rest_sec bigint,
  custom_weeks jsonb,
  base_weight_kg double precision,
  target_weight_kg double precision,
  target_reps bigint,
  fail_streak bigint not null default 0,
  progression_started_at bigint,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.week_plan (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  program_id text not null,
  routine_id text not null,
  days jsonb not null default '[]',
  enabled boolean not null default true,
  sort_order bigint not null default 0,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.day_override (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  date text not null,
  kind text not null,
  routine_id text,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.workout_session (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  date text not null,
  routine_id text,
  program_id text,
  program_name text,
  routine_name text,
  routine_type text,
  started_at bigint not null,
  ended_at bigint,
  duration_sec bigint,
  intensity text,
  kcal double precision,
  body_weight_kg double precision,
  status text not null default 'active',
  backfilled boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.session_exercise (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  session_id text not null,
  exercise_id text not null,
  exercise_name text not null,
  muscle_group text not null,
  routine_exercise_id text,
  sort_order bigint not null default 0,
  rest_sec bigint,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.session_set (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  session_id text not null,
  session_exercise_id text not null,
  exercise_id text not null,
  muscle_group text not null,
  set_index bigint not null,
  weight_kg double precision,
  reps bigint,
  target_weight_kg double precision,
  target_reps bigint,
  prev_weight_kg double precision,
  prev_reps bigint,
  done boolean not null default false,
  completed_at bigint,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.daily_log (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  date text not null,
  kcal_expenditure_override double precision,
  kcal_intake double precision,
  body_weight_kg double precision,
  server_updated_at timestamptz not null default clock_timestamp()
);

-- ───────────── RLS, ดัชนีเคอร์เซอร์ และ trigger ของทุกตารางที่ซิงก์ ─────────────
-- อ่าน/เพิ่ม/แก้ได้เฉพาะแถวของตัวเองและเมื่อมีสิทธิ์ (J6); ไม่มี policy delete — ลบแบบ soft delete (deleted_at) เท่านั้น
-- การลบจริงทำเฉพาะตอนลบบัญชี (auth.users on delete cascade ผ่าน Edge Function delete-account)

do $$
declare
  t text;
begin
  foreach t in array array[
    'profile', 'custom_exercise', 'program', 'routine', 'routine_exercise', 'week_plan',
    'day_override', 'workout_session', 'session_exercise', 'session_set', 'daily_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create index %I on public.%I (user_id, server_updated_at, id)', t || '_sync_cursor_idx', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (user_id = (select auth.uid()) and public.has_sync_access((select auth.uid())))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()) and public.has_sync_access((select auth.uid())))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = (select auth.uid()) and public.has_sync_access((select auth.uid())))
         with check (user_id = (select auth.uid()) and public.has_sync_access((select auth.uid())))',
      t || '_update_own', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.sync_before_write()',
      t || '_sync_write', t);
  end loop;
end;
$$;
