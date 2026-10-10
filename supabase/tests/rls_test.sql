-- ตรวจ RLS / last-write-wins / การจำกัดซิงก์ตามสิทธิ์ บน Postgres จริง (scripts/verify-supabase.sh)
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

create or replace function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

-- 1) ไม่มีสิทธิ์ → เขียนไม่ได้ (J6)
select pg_temp.act_as('11111111-1111-4111-8111-111111111111') as _ \gset
do $$ begin
  begin
    insert into public.program (id, user_id, created_at, updated_at, name)
    values ('p1', '11111111-1111-4111-8111-111111111111', 1, 1, 'A');
    raise exception 'FAIL: insert without entitlement was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 2) มีสิทธิ์ (ทดลอง) → เขียน/อ่านของตัวเองได้
insert into public.user_entitlements (user_id, state, expiration_at)
values ('11111111-1111-4111-8111-111111111111', 'TRIALING', now() + interval '7 days'),
       ('22222222-2222-4222-8222-222222222222', 'LIFETIME', null);

select pg_temp.act_as('11111111-1111-4111-8111-111111111111') as _ \gset
insert into public.program (id, user_id, created_at, updated_at, name)
values ('p1', '11111111-1111-4111-8111-111111111111', 1, 100, 'A');
insert into public.week_plan (id, user_id, created_at, updated_at, program_id, routine_id, days, enabled)
values ('w1', '11111111-1111-4111-8111-111111111111', 1, 1, 'p1', 'r1', '[1,3,5]', true);

-- เขียนแถวในชื่อคนอื่นไม่ได้
do $$ begin
  begin
    insert into public.program (id, user_id, created_at, updated_at, name)
    values ('p-x', '22222222-2222-4222-8222-222222222222', 1, 1, 'X');
    raise exception 'FAIL: wrote a row for another user';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 3) last-write-wins: ฉบับเก่ากว่าถูกข้าม ฉบับใหม่กว่าเขียนทับ (ผ่าน upsert แบบที่แอปใช้)
insert into public.program (id, user_id, created_at, updated_at, name)
values ('p1', '11111111-1111-4111-8111-111111111111', 1, 50, 'stale')
on conflict (id) do update set name = excluded.name, updated_at = excluded.updated_at;
do $$ begin
  if (select name from public.program where id = 'p1') <> 'A' then raise exception 'FAIL: stale write overwrote newer row'; end if;
end $$;
insert into public.program (id, user_id, created_at, updated_at, name)
values ('p1', '11111111-1111-4111-8111-111111111111', 1, 200, 'B')
on conflict (id) do update set name = excluded.name, updated_at = excluded.updated_at;
do $$ begin
  if (select name from public.program where id = 'p1') <> 'B' then raise exception 'FAIL: newer write was not applied'; end if;
end $$;

-- ลบจริงไม่ได้ (soft delete เท่านั้น)
delete from public.program where id = 'p1';
do $$ begin
  if not exists (select 1 from public.program where id = 'p1') then raise exception 'FAIL: hard delete was allowed'; end if;
end $$;

-- เปลี่ยนเจ้าของไม่ได้
do $$ begin
  begin
    update public.program set user_id = '22222222-2222-4222-8222-222222222222' where id = 'p1';
    raise exception 'FAIL: user_id changed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 4) อีกบัญชีมองไม่เห็นข้อมูลของบัญชีแรก
select pg_temp.act_as('22222222-2222-4222-8222-222222222222') as _ \gset
do $$ begin
  if exists (select 1 from public.program) then raise exception 'FAIL: saw another user''s rows'; end if;
  if (select count(*) from public.user_entitlements) <> 1 then raise exception 'FAIL: entitlement visibility'; end if;
end $$;
-- ผู้ใช้แก้สิทธิ์ของตัวเองไม่ได้
update public.user_entitlements set state = 'LIFETIME';
reset role;
do $$ begin
  if (select state from public.user_entitlements where user_id = '11111111-1111-4111-8111-111111111111') <> 'TRIALING'
  then raise exception 'FAIL: user changed an entitlement'; end if;
end $$;

-- 5) สิทธิ์หมด → อ่าน/เขียนบนคลาวด์ไม่ได้ แต่ข้อมูลบนคลาวด์ยังอยู่ (กลับมาซิงก์ได้เมื่อสมัครใหม่)
update public.user_entitlements set state = 'EXPIRED', expiration_at = now() - interval '1 day'
where user_id = '11111111-1111-4111-8111-111111111111';
select pg_temp.act_as('11111111-1111-4111-8111-111111111111') as _ \gset
do $$ begin
  if exists (select 1 from public.program) then raise exception 'FAIL: expired user can still read'; end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.program where id = 'p1') then raise exception 'FAIL: data removed on expiry'; end if;
end $$;

-- ทดลองที่เลยวันหมดอายุแล้วแต่ webhook ยังไม่มา → ถือว่าไม่มีสิทธิ์
update public.user_entitlements set state = 'TRIALING', expiration_at = now() - interval '1 minute'
where user_id = '11111111-1111-4111-8111-111111111111';
do $$ begin
  if public.has_sync_access('11111111-1111-4111-8111-111111111111') then raise exception 'FAIL: stale trial still syncs'; end if;
  if not public.has_sync_access('22222222-2222-4222-8222-222222222222') then raise exception 'FAIL: lifetime cannot sync'; end if;
end $$;

-- 6) anon เข้าไม่ได้เลย
set role anon;
do $$ begin
  begin
    perform 1 from public.program;
    raise exception 'FAIL: anon can read';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 7) ลบบัญชี → ข้อมูลทั้งหมดของบัญชีถูกลบตาม (on delete cascade)
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
do $$ begin
  if exists (select 1 from public.program where user_id = '11111111-1111-4111-8111-111111111111')
     or exists (select 1 from public.week_plan where user_id = '11111111-1111-4111-8111-111111111111')
     or exists (select 1 from public.user_entitlements where user_id = '11111111-1111-4111-8111-111111111111')
  then raise exception 'FAIL: account data survived deletion'; end if;
end $$;

select 'ALL SUPABASE SQL CHECKS PASSED' as result;
