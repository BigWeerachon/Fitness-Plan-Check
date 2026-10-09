// ไฟล์นี้สร้างอัตโนมัติจาก drizzle/*.sql โดย scripts/embed-migrations.js — ห้ามแก้ด้วยมือ
export interface EmbeddedMigration {
  tag: string;
  statements: string[];
}

export const MIGRATIONS: EmbeddedMigration[] = [
  {
    "tag": "0000_init",
    "statements": [
      "CREATE TABLE `app_settings` (\n\t`key` text PRIMARY KEY NOT NULL,\n\t`value` text NOT NULL\n);",
      "CREATE TABLE `custom_exercise` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`name` text NOT NULL,\n\t`primary_muscle` text NOT NULL,\n\t`secondary_muscles` text DEFAULT '[]' NOT NULL,\n\t`equipment` text DEFAULT 'other' NOT NULL,\n\t`notes` text\n);",
      "CREATE INDEX `custom_exercise_owner_idx` ON `custom_exercise` (`owner_id`);",
      "CREATE TABLE `daily_log` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`date` text NOT NULL,\n\t`kcal_expenditure_override` real,\n\t`kcal_intake` real,\n\t`body_weight_kg` real\n);",
      "CREATE INDEX `daily_log_owner_date_idx` ON `daily_log` (`owner_id`,`date`);",
      "CREATE TABLE `day_override` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`date` text NOT NULL,\n\t`kind` text NOT NULL,\n\t`routine_id` text\n);",
      "CREATE INDEX `day_override_owner_date_idx` ON `day_override` (`owner_id`,`date`);",
      "CREATE TABLE `entitlement_cache` (\n\t`user_id` text PRIMARY KEY NOT NULL,\n\t`state` text NOT NULL,\n\t`product_id` text,\n\t`period_type` text,\n\t`expiration_date` integer,\n\t`will_renew` integer DEFAULT false NOT NULL,\n\t`billing_issue_at` integer,\n\t`verified_at` integer NOT NULL\n);",
      "CREATE TABLE `onboarding_draft` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`data` text NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`migrated_at` integer,\n\t`migrated_to` text\n);",
      "CREATE TABLE `profile` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`sex` text,\n\t`age` integer,\n\t`height_cm` real,\n\t`weight_kg` real,\n\t`activity_level` text,\n\t`goal` text,\n\t`weight_unit` text DEFAULT 'kg' NOT NULL,\n\t`length_unit` text DEFAULT 'cm' NOT NULL,\n\t`deficit_pct` integer DEFAULT 20 NOT NULL,\n\t`surplus_pct` integer DEFAULT 10 NOT NULL,\n\t`protein_per_kg` real,\n\t`fat_pct` integer DEFAULT 25 NOT NULL,\n\t`met_light` real DEFAULT 3.5 NOT NULL,\n\t`met_moderate` real DEFAULT 5 NOT NULL,\n\t`met_hard` real DEFAULT 6 NOT NULL,\n\t`rest_timer_enabled` integer DEFAULT true NOT NULL,\n\t`rest_timer_sec` integer DEFAULT 90 NOT NULL,\n\t`week_start` integer DEFAULT 1 NOT NULL,\n\t`weight_step_kg` real DEFAULT 2.5 NOT NULL,\n\t`active_program_id` text\n);",
      "CREATE INDEX `profile_owner_idx` ON `profile` (`owner_id`);",
      "CREATE TABLE `program` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`name` text NOT NULL,\n\t`template_key` text,\n\t`sort_order` integer DEFAULT 0 NOT NULL\n);",
      "CREATE INDEX `program_owner_idx` ON `program` (`owner_id`);",
      "CREATE TABLE `routine` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`program_id` text NOT NULL,\n\t`name` text NOT NULL,\n\t`type` text DEFAULT 'other' NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL\n);",
      "CREATE INDEX `routine_program_idx` ON `routine` (`program_id`);",
      "CREATE INDEX `routine_owner_idx` ON `routine` (`owner_id`);",
      "CREATE TABLE `routine_exercise` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`routine_id` text NOT NULL,\n\t`exercise_id` text NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`sets` integer DEFAULT 3 NOT NULL,\n\t`rep_min` integer DEFAULT 8 NOT NULL,\n\t`rep_max` integer DEFAULT 12 NOT NULL,\n\t`progression_mode` text DEFAULT 'double' NOT NULL,\n\t`weight_step_kg` real DEFAULT 2.5 NOT NULL,\n\t`rir` integer,\n\t`rpe` real,\n\t`rest_sec` integer,\n\t`custom_weeks` text,\n\t`base_weight_kg` real,\n\t`target_weight_kg` real,\n\t`target_reps` integer,\n\t`fail_streak` integer DEFAULT 0 NOT NULL,\n\t`progression_started_at` integer\n);",
      "CREATE INDEX `routine_exercise_routine_idx` ON `routine_exercise` (`routine_id`);",
      "CREATE INDEX `routine_exercise_owner_idx` ON `routine_exercise` (`owner_id`);",
      "CREATE TABLE `session_exercise` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`session_id` text NOT NULL,\n\t`exercise_id` text NOT NULL,\n\t`exercise_name` text NOT NULL,\n\t`muscle_group` text NOT NULL,\n\t`routine_exercise_id` text,\n\t`sort_order` integer DEFAULT 0 NOT NULL,\n\t`rest_sec` integer\n);",
      "CREATE INDEX `session_exercise_session_idx` ON `session_exercise` (`session_id`);",
      "CREATE TABLE `session_set` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`session_id` text NOT NULL,\n\t`session_exercise_id` text NOT NULL,\n\t`exercise_id` text NOT NULL,\n\t`muscle_group` text NOT NULL,\n\t`set_index` integer NOT NULL,\n\t`weight_kg` real,\n\t`reps` integer,\n\t`target_weight_kg` real,\n\t`target_reps` integer,\n\t`prev_weight_kg` real,\n\t`prev_reps` integer,\n\t`done` integer DEFAULT false NOT NULL,\n\t`completed_at` integer\n);",
      "CREATE INDEX `session_set_session_idx` ON `session_set` (`session_id`);",
      "CREATE INDEX `session_set_exercise_idx` ON `session_set` (`exercise_id`);",
      "CREATE TABLE `sync_outbox` (\n\t`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,\n\t`table_name` text NOT NULL,\n\t`row_id` text NOT NULL,\n\t`owner_id` text NOT NULL,\n\t`queued_at` integer NOT NULL,\n\t`attempts` integer DEFAULT 0 NOT NULL,\n\t`last_error` text\n);",
      "CREATE UNIQUE INDEX `sync_outbox_row_idx` ON `sync_outbox` (`table_name`,`row_id`);",
      "CREATE TABLE `sync_state` (\n\t`key` text PRIMARY KEY NOT NULL,\n\t`value` text NOT NULL\n);",
      "CREATE TABLE `week_plan` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`program_id` text NOT NULL,\n\t`routine_id` text NOT NULL,\n\t`days` text DEFAULT '[]' NOT NULL,\n\t`enabled` integer DEFAULT true NOT NULL,\n\t`sort_order` integer DEFAULT 0 NOT NULL\n);",
      "CREATE INDEX `week_plan_program_idx` ON `week_plan` (`program_id`);",
      "CREATE INDEX `week_plan_owner_idx` ON `week_plan` (`owner_id`);",
      "CREATE TABLE `workout_session` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`owner_id` text DEFAULT 'local' NOT NULL,\n\t`created_at` integer NOT NULL,\n\t`updated_at` integer NOT NULL,\n\t`deleted_at` integer,\n\t`date` text NOT NULL,\n\t`routine_id` text,\n\t`program_id` text,\n\t`program_name` text,\n\t`routine_name` text,\n\t`routine_type` text,\n\t`started_at` integer NOT NULL,\n\t`ended_at` integer,\n\t`duration_sec` integer,\n\t`intensity` text,\n\t`kcal` real,\n\t`body_weight_kg` real,\n\t`status` text DEFAULT 'active' NOT NULL,\n\t`backfilled` integer DEFAULT false NOT NULL\n);",
      "CREATE INDEX `workout_session_owner_date_idx` ON `workout_session` (`owner_id`,`date`);"
    ]
  }
];
