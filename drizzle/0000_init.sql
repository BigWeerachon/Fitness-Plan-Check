CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text DEFAULT '[]' NOT NULL,
	`equipment` text DEFAULT 'other' NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `custom_exercise_owner_idx` ON `custom_exercise` (`owner_id`);--> statement-breakpoint
CREATE TABLE `daily_log` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`kcal_expenditure_override` real,
	`kcal_intake` real,
	`body_weight_kg` real
);
--> statement-breakpoint
CREATE INDEX `daily_log_owner_date_idx` ON `daily_log` (`owner_id`,`date`);--> statement-breakpoint
CREATE TABLE `day_override` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`routine_id` text
);
--> statement-breakpoint
CREATE INDEX `day_override_owner_date_idx` ON `day_override` (`owner_id`,`date`);--> statement-breakpoint
CREATE TABLE `entitlement_cache` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`product_id` text,
	`period_type` text,
	`expiration_date` integer,
	`will_renew` integer DEFAULT false NOT NULL,
	`billing_issue_at` integer,
	`verified_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `onboarding_draft` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL,
	`migrated_at` integer,
	`migrated_to` text
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sex` text,
	`age` integer,
	`height_cm` real,
	`weight_kg` real,
	`activity_level` text,
	`goal` text,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`length_unit` text DEFAULT 'cm' NOT NULL,
	`deficit_pct` integer DEFAULT 20 NOT NULL,
	`surplus_pct` integer DEFAULT 10 NOT NULL,
	`protein_per_kg` real,
	`fat_pct` integer DEFAULT 25 NOT NULL,
	`met_light` real DEFAULT 3.5 NOT NULL,
	`met_moderate` real DEFAULT 5 NOT NULL,
	`met_hard` real DEFAULT 6 NOT NULL,
	`rest_timer_enabled` integer DEFAULT true NOT NULL,
	`rest_timer_sec` integer DEFAULT 90 NOT NULL,
	`week_start` integer DEFAULT 1 NOT NULL,
	`weight_step_kg` real DEFAULT 2.5 NOT NULL,
	`active_program_id` text
);
--> statement-breakpoint
CREATE INDEX `profile_owner_idx` ON `profile` (`owner_id`);--> statement-breakpoint
CREATE TABLE `program` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`template_key` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `program_owner_idx` ON `program` (`owner_id`);--> statement-breakpoint
CREATE TABLE `routine` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`program_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'other' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `routine_program_idx` ON `routine` (`program_id`);--> statement-breakpoint
CREATE INDEX `routine_owner_idx` ON `routine` (`owner_id`);--> statement-breakpoint
CREATE TABLE `routine_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`sets` integer DEFAULT 3 NOT NULL,
	`rep_min` integer DEFAULT 8 NOT NULL,
	`rep_max` integer DEFAULT 12 NOT NULL,
	`progression_mode` text DEFAULT 'double' NOT NULL,
	`weight_step_kg` real DEFAULT 2.5 NOT NULL,
	`rir` integer,
	`rpe` real,
	`rest_sec` integer,
	`custom_weeks` text,
	`base_weight_kg` real,
	`target_weight_kg` real,
	`target_reps` integer,
	`fail_streak` integer DEFAULT 0 NOT NULL,
	`progression_started_at` integer
);
--> statement-breakpoint
CREATE INDEX `routine_exercise_routine_idx` ON `routine_exercise` (`routine_id`);--> statement-breakpoint
CREATE INDEX `routine_exercise_owner_idx` ON `routine_exercise` (`owner_id`);--> statement-breakpoint
CREATE TABLE `session_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`muscle_group` text NOT NULL,
	`routine_exercise_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`rest_sec` integer
);
--> statement-breakpoint
CREATE INDEX `session_exercise_session_idx` ON `session_exercise` (`session_id`);--> statement-breakpoint
CREATE TABLE `session_set` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`session_id` text NOT NULL,
	`session_exercise_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`muscle_group` text NOT NULL,
	`set_index` integer NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`target_weight_kg` real,
	`target_reps` integer,
	`prev_weight_kg` real,
	`prev_reps` integer,
	`done` integer DEFAULT false NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `session_set_session_idx` ON `session_set` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_set_exercise_idx` ON `session_set` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`queued_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_outbox_row_idx` ON `sync_outbox` (`table_name`,`row_id`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `week_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`program_id` text NOT NULL,
	`routine_id` text NOT NULL,
	`days` text DEFAULT '[]' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `week_plan_program_idx` ON `week_plan` (`program_id`);--> statement-breakpoint
CREATE INDEX `week_plan_owner_idx` ON `week_plan` (`owner_id`);--> statement-breakpoint
CREATE TABLE `workout_session` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`date` text NOT NULL,
	`routine_id` text,
	`program_id` text,
	`program_name` text,
	`routine_name` text,
	`routine_type` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_sec` integer,
	`intensity` text,
	`kcal` real,
	`body_weight_kg` real,
	`status` text DEFAULT 'active' NOT NULL,
	`backfilled` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_session_owner_date_idx` ON `workout_session` (`owner_id`,`date`);