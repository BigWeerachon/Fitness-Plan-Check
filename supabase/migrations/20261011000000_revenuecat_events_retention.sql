-- เก็บบันทึก webhook ของ RevenueCat ไว้แค่ 90 วัน (ข้อมูลขั้นต่ำ SPEC B13)
-- ใช้กันเหตุการณ์ซ้ำเท่านั้น: RevenueCat ส่งซ้ำภายในไม่กี่วัน และ webhook ข้ามเหตุการณ์ที่เก่ากว่าสถานะล่าสุดอยู่แล้ว
-- (event_timestamp < verified_at) จึงไม่เสี่ยงต่อ event เก่ามากที่ถูกส่งซ้ำหลังถูกลบ
--
-- Edge Function revenuecat-webhook เรียกฟังก์ชันนี้หลังบันทึกเหตุการณ์ทุกครั้ง
-- ถ้าจะให้ลบตามเวลาอย่างเดียว (ไม่พึ่งทราฟฟิก) เปิด pg_cron แล้วรัน:
--   select cron.schedule('purge-revenuecat-events', '17 3 * * *', 'select public.purge_revenuecat_events(90)');

create index if not exists revenuecat_events_received_idx on public.revenuecat_events (received_at);

create or replace function public.purge_revenuecat_events(retain_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if retain_days is null or retain_days < 1 then
    raise exception 'retain_days must be at least 1';
  end if;
  delete from public.revenuecat_events
  where received_at < now() - make_interval(days => retain_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_revenuecat_events(integer) from public, anon, authenticated;
grant execute on function public.purge_revenuecat_events(integer) to service_role;
