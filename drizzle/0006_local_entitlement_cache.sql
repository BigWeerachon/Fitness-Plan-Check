-- ไม่มีบัญชี/ล็อกอิน (D81): สิทธิ์เป็นของเครื่อง แคชใต้เจ้าของ 'local' — เก็บแถวที่ตรวจล่าสุด (บัญชีที่ใช้ล่าสุด) ไว้ใช้ตอนออฟไลน์
DELETE FROM `entitlement_cache` WHERE `user_id` <> (SELECT `user_id` FROM `entitlement_cache` ORDER BY `verified_at` DESC LIMIT 1);--> statement-breakpoint
UPDATE `entitlement_cache` SET `user_id` = 'local';--> statement-breakpoint
-- ค่าเซสชันล็อกอินที่จำไว้ (ยุคมีบัญชี) ไม่ใช้แล้ว
DELETE FROM `app_settings` WHERE `key` IN ('auth.lastUser', 'mock.authUser');--> statement-breakpoint
UPDATE `onboarding_draft` SET `migrated_to` = 'local' WHERE `migrated_to` IS NOT NULL;
