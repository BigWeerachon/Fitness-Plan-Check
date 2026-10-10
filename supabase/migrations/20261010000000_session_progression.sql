-- "เป้าหมายครั้งหน้า" ที่คำนวณตอนจบเซสชัน + การตัดสินใจของผู้ใช้ (G2) — ตรงกับ workout_session.progression ในเครื่อง
alter table public.workout_session add column progression jsonb;
