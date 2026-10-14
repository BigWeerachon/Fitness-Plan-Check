-- แอปออฟไลน์ล้วน (D81): ย้ายแถวที่เคยผูก id ผู้ใช้ (ยุคซิงก์) มาเป็นเจ้าของ 'local' เพื่อให้ยังมองเห็น
UPDATE `profile` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `custom_exercise` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `program` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `routine` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `routine_exercise` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `week_plan` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `day_override` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `workout_session` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `session_exercise` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `session_set` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';--> statement-breakpoint
UPDATE `daily_log` SET `owner_id` = 'local' WHERE `owner_id` <> 'local';
