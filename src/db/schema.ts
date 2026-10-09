import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Schema ฐานข้อมูลในเครื่อง (แหล่งความจริงหลัก offline-first, SPEC L/M)
 * - ตารางที่ซิงก์ทุกตารางมี id (UUID), owner_id, created_at, updated_at, deleted_at (soft delete)
 * - เวลาเก็บเป็น epoch ms (integer) เทียบ last-write-wins ได้ตรงๆ
 * - น้ำหนักเก็บเป็น kg เสมอ แปลงหน่วยตอนแสดงผล
 * แก้ schema แล้วรัน `npm run db:generate` เพื่อสร้าง migration ใหม่ (ห้ามแก้ migration เก่า)
 */

const syncColumns = {
  id: text('id').primaryKey(),
  /** 'local' = ยังไม่ผูกบัญชี, ไม่งั้นเป็น id ผู้ใช้ (Supabase auth.uid) */
  ownerId: text('owner_id').notNull().default('local'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
};

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'ftin';
export type RoutineType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'other';
export type ProgressionMode = 'off' | 'double' | 'linear' | 'custom';
export type Intensity = 'light' | 'moderate' | 'hard';
export type SessionStatus = 'active' | 'completed';
export type OverrideKind = 'rest' | 'routine' | 'empty';
export type Equipment =
  'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'other';
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

/** สัปดาห์แบบกำหนดเอง (progression = custom): แต่ละสัปดาห์กำหนดครั้งและ % ของน้ำหนักฐาน */
export interface CustomWeek {
  reps: number;
  /** เปอร์เซ็นต์ของน้ำหนักฐาน เช่น 100, 105 */
  percent: number;
}

export const profile = sqliteTable(
  'profile',
  {
    ...syncColumns,
    sex: text('sex').$type<Sex>(),
    age: integer('age'),
    heightCm: real('height_cm'),
    weightKg: real('weight_kg'),
    activityLevel: text('activity_level').$type<ActivityLevel>(),
    goal: text('goal').$type<Goal>(),
    weightUnit: text('weight_unit').$type<WeightUnit>().notNull().default('kg'),
    lengthUnit: text('length_unit').$type<LengthUnit>().notNull().default('cm'),
    /** % ลดจาก TDEE เมื่อเป้าหมายลดไขมัน (10–25) */
    deficitPct: integer('deficit_pct').notNull().default(20),
    /** % เพิ่มจาก TDEE เมื่อเป้าหมายเพิ่มกล้าม */
    surplusPct: integer('surplus_pct').notNull().default(10),
    /** โปรตีน g/kg (null = อัตโนมัติตามเป้าหมาย) */
    proteinPerKg: real('protein_per_kg'),
    /** ไขมัน % ของแคลอรี่เป้าหมาย */
    fatPct: integer('fat_pct').notNull().default(25),
    metLight: real('met_light').notNull().default(3.5),
    metModerate: real('met_moderate').notNull().default(5),
    metHard: real('met_hard').notNull().default(6),
    restTimerEnabled: integer('rest_timer_enabled', { mode: 'boolean' }).notNull().default(true),
    restTimerSec: integer('rest_timer_sec').notNull().default(90),
    /** วันเริ่มต้นสัปดาห์ 1 = จันทร์, 0 = อาทิตย์ */
    weekStart: integer('week_start').notNull().default(1),
    /** ก้าวเพิ่มน้ำหนักเริ่มต้น (kg) */
    weightStepKg: real('weight_step_kg').notNull().default(2.5),
    activeProgramId: text('active_program_id'),
  },
  (t) => [index('profile_owner_idx').on(t.ownerId)],
);

export const customExercise = sqliteTable(
  'custom_exercise',
  {
    ...syncColumns,
    name: text('name').notNull(),
    primaryMuscle: text('primary_muscle').$type<MuscleGroup>().notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' })
      .$type<MuscleGroup[]>()
      .notNull()
      .default([]),
    equipment: text('equipment').$type<Equipment>().notNull().default('other'),
    notes: text('notes'),
  },
  (t) => [index('custom_exercise_owner_idx').on(t.ownerId)],
);

export const program = sqliteTable(
  'program',
  {
    ...syncColumns,
    name: text('name').notNull(),
    /** เทมเพลตต้นทาง (ถ้าสร้างจากเทมเพลต) */
    templateKey: text('template_key'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('program_owner_idx').on(t.ownerId)],
);

export const routine = sqliteTable(
  'routine',
  {
    ...syncColumns,
    programId: text('program_id').notNull(),
    name: text('name').notNull(),
    type: text('type').$type<RoutineType>().notNull().default('other'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('routine_program_idx').on(t.programId), index('routine_owner_idx').on(t.ownerId)],
);

export const routineExercise = sqliteTable(
  'routine_exercise',
  {
    ...syncColumns,
    routineId: text('routine_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    sets: integer('sets').notNull().default(3),
    repMin: integer('rep_min').notNull().default(8),
    repMax: integer('rep_max').notNull().default(12),
    progressionMode: text('progression_mode').$type<ProgressionMode>().notNull().default('double'),
    weightStepKg: real('weight_step_kg').notNull().default(2.5),
    rir: integer('rir'),
    rpe: real('rpe'),
    /** วินาทีพักต่อท่า: null = ใช้ค่าเริ่มต้นในตั้งค่า, 0 = ปิด */
    restSec: integer('rest_sec'),
    customWeeks: text('custom_weeks', { mode: 'json' }).$type<CustomWeek[]>(),
    /** น้ำหนักฐานของโหมด custom (kg) */
    baseWeightKg: real('base_weight_kg'),
    /** เป้าหมายครั้งหน้า (คำนวณหลังจบเซสชันหรือผู้ใช้ตั้ง) */
    targetWeightKg: real('target_weight_kg'),
    targetReps: integer('target_reps'),
    /** โหมด linear: จำนวนครั้งที่พลาดเป้าติดกัน */
    failStreak: integer('fail_streak').notNull().default(0),
    /** โหมด custom: เริ่มนับสัปดาห์จากวันไหน (ms) */
    progressionStartedAt: integer('progression_started_at'),
  },
  (t) => [
    index('routine_exercise_routine_idx').on(t.routineId),
    index('routine_exercise_owner_idx').on(t.ownerId),
  ],
);

export const weekPlan = sqliteTable(
  'week_plan',
  {
    ...syncColumns,
    programId: text('program_id').notNull(),
    routineId: text('routine_id').notNull(),
    /** วันในสัปดาห์ที่ทำ routine นี้ (0 = อาทิตย์ … 6 = เสาร์ ตาม Date.getDay) */
    days: text('days', { mode: 'json' }).$type<number[]>().notNull().default([]),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('week_plan_program_idx').on(t.programId), index('week_plan_owner_idx').on(t.ownerId)],
);

export const dayOverride = sqliteTable(
  'day_override',
  {
    ...syncColumns,
    /** วันที่ตามเวลาท้องถิ่น YYYY-MM-DD */
    date: text('date').notNull(),
    kind: text('kind').$type<OverrideKind>().notNull(),
    routineId: text('routine_id'),
  },
  (t) => [index('day_override_owner_date_idx').on(t.ownerId, t.date)],
);

export const workoutSession = sqliteTable(
  'workout_session',
  {
    ...syncColumns,
    date: text('date').notNull(),
    routineId: text('routine_id'),
    programId: text('program_id'),
    /** snapshot ชื่อ ณ เวลาที่ฝึก (SPEC F6) สถิติใช้ค่านี้ ไม่เปลี่ยนเมื่อแก้/ลบ routine ภายหลัง */
    programName: text('program_name'),
    routineName: text('routine_name'),
    routineType: text('routine_type').$type<RoutineType>(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    durationSec: integer('duration_sec'),
    intensity: text('intensity').$type<Intensity>(),
    kcal: real('kcal'),
    bodyWeightKg: real('body_weight_kg'),
    status: text('status').$type<SessionStatus>().notNull().default('active'),
    /** บันทึกย้อนหลัง */
    backfilled: integer('backfilled', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('workout_session_owner_date_idx').on(t.ownerId, t.date)],
);

export const sessionExercise = sqliteTable(
  'session_exercise',
  {
    ...syncColumns,
    sessionId: text('session_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    /** snapshot ชื่อท่าและกลุ่มกล้ามเนื้อหลัก */
    exerciseName: text('exercise_name').notNull(),
    muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
    routineExerciseId: text('routine_exercise_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    restSec: integer('rest_sec'),
  },
  (t) => [index('session_exercise_session_idx').on(t.sessionId)],
);

export const sessionSet = sqliteTable(
  'session_set',
  {
    ...syncColumns,
    sessionId: text('session_id').notNull(),
    sessionExerciseId: text('session_exercise_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    /** snapshot กลุ่มกล้ามเนื้อหลัก (SPEC M) ใช้คิดสถิติ % */
    muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
    setIndex: integer('set_index').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    targetWeightKg: real('target_weight_kg'),
    targetReps: integer('target_reps'),
    prevWeightKg: real('prev_weight_kg'),
    prevReps: integer('prev_reps'),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    completedAt: integer('completed_at'),
  },
  (t) => [
    index('session_set_session_idx').on(t.sessionId),
    index('session_set_exercise_idx').on(t.exerciseId),
  ],
);

export const dailyLog = sqliteTable(
  'daily_log',
  {
    ...syncColumns,
    date: text('date').notNull(),
    /** แคลอรี่ที่ใช้ทั้งวันที่ผู้ใช้กรอกเอง (มีค่า = ใช้แทนค่าที่คำนวณ SPEC H3) */
    kcalExpenditureOverride: real('kcal_expenditure_override'),
    kcalIntake: real('kcal_intake'),
    bodyWeightKg: real('body_weight_kg'),
  },
  (t) => [index('daily_log_owner_date_idx').on(t.ownerId, t.date)],
);

// ───────────── ตารางในเครื่องเท่านั้น (ไม่ซิงก์) ─────────────

/** การตั้งค่าของเครื่อง (ภาษา ธีม สีหลัก ฯลฯ) */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** ข้อมูลตั้งค่าเริ่มต้นก่อนล็อกอิน (SPEC B3/C) ย้ายเข้าบัญชีหลังได้สิทธิ์ */
export const onboardingDraft = sqliteTable('onboarding_draft', {
  id: text('id').primaryKey(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  updatedAt: integer('updated_at').notNull(),
  migratedAt: integer('migrated_at'),
  migratedTo: text('migrated_to'),
});

/** แคชสถานะสิทธิ์ต่อบัญชี (SPEC B9) — ไม่ใช่ตัวนับเวลาทดลอง มาจาก RevenueCat เท่านั้น */
export const entitlementCache = sqliteTable('entitlement_cache', {
  userId: text('user_id').primaryKey(),
  state: text('state').notNull(),
  productId: text('product_id'),
  periodType: text('period_type'),
  expirationDate: integer('expiration_date'),
  willRenew: integer('will_renew', { mode: 'boolean' }).notNull().default(false),
  billingIssueAt: integer('billing_issue_at'),
  verifiedAt: integer('verified_at').notNull(),
});

/** คิวการเปลี่ยนแปลงที่รอส่งขึ้นคลาวด์ ลบออกเมื่อส่งสำเร็จเท่านั้น */
export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableName: text('table_name').notNull(),
    rowId: text('row_id').notNull(),
    ownerId: text('owner_id').notNull(),
    queuedAt: integer('queued_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [uniqueIndex('sync_outbox_row_idx').on(t.tableName, t.rowId)],
);

/** เคอร์เซอร์การดึงข้อมูลต่อตาราง/บัญชี */
export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** ตารางที่ซิงก์ขึ้นคลาวด์ เรียงตามลำดับที่ต้องส่ง (พ่อก่อนลูก) */
export const SYNCED_TABLES = {
  profile,
  custom_exercise: customExercise,
  program,
  routine,
  routine_exercise: routineExercise,
  week_plan: weekPlan,
  day_override: dayOverride,
  workout_session: workoutSession,
  session_exercise: sessionExercise,
  session_set: sessionSet,
  daily_log: dailyLog,
} as const;

export type SyncedTableName = keyof typeof SYNCED_TABLES;
export const SYNCED_TABLE_NAMES = Object.keys(SYNCED_TABLES) as SyncedTableName[];

export type Profile = typeof profile.$inferSelect;
export type CustomExercise = typeof customExercise.$inferSelect;
export type Program = typeof program.$inferSelect;
export type Routine = typeof routine.$inferSelect;
export type RoutineExercise = typeof routineExercise.$inferSelect;
export type WeekPlanEntry = typeof weekPlan.$inferSelect;
export type DayOverride = typeof dayOverride.$inferSelect;
export type WorkoutSession = typeof workoutSession.$inferSelect;
export type SessionExercise = typeof sessionExercise.$inferSelect;
export type SessionSet = typeof sessionSet.$inferSelect;
export type DailyLog = typeof dailyLog.$inferSelect;
