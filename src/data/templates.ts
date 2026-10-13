import type { ProgressionMode, RoutineType } from '../db/schema';
import type { LocalizedText } from './exerciseLibrary';

/**
 * เทมเพลตโปรแกรม (SPEC F4, F5) — เป็นแค่ข้อมูลตั้งต้น ผู้ใช้แก้ได้ทั้งหมดหลังเลือก
 * แต่ละ routine มีแท็กประเภทอัตโนมัติ และวันในสัปดาห์สำหรับจัดตารางให้อัตโนมัติ (0 = อาทิตย์ … 6 = เสาร์)
 */

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  progressionMode: ProgressionMode;
  restSec: number;
}

export interface TemplateRoutine {
  key: string;
  name: LocalizedText;
  type: RoutineType;
  /** วันที่ทำ routine นี้ในตารางอัตโนมัติ */
  days: number[];
  exercises: TemplateExercise[];
}

export interface ProgramTemplate {
  key: string;
  name: LocalizedText;
  description: LocalizedText;
  routines: TemplateRoutine[];
}

const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;
const SAT = 6;

const REST_COMPOUND_SEC = 150;
const REST_ACCESSORY_SEC = 75;
const REST_LINEAR_SEC = 180;

/** ท่าหลัก (compound) — เซ็ตน้อยครั้งน้อย พักนาน */
function compoundLift(exerciseId: string, sets = 4, repMin = 6, repMax = 10): TemplateExercise {
  return { exerciseId, sets, repMin, repMax, progressionMode: 'double', restSec: REST_COMPOUND_SEC };
}

/** ท่าเสริม (accessory) */
function accessoryLift(exerciseId: string, sets = 3, repMin = 10, repMax = 15): TemplateExercise {
  return { exerciseId, sets, repMin, repMax, progressionMode: 'double', restSec: REST_ACCESSORY_SEC };
}

/** 5x5 แบบ linear */
function linear5x5Lift(exerciseId: string, sets = 5): TemplateExercise {
  return { exerciseId, sets, repMin: 5, repMax: 5, progressionMode: 'linear', restSec: REST_LINEAR_SEC };
}

const pushA = (days: number[], key = 'push'): TemplateRoutine => ({
  key,
  name: { en: 'Push', th: 'Push (ดัน)' },
  type: 'push',
  days,
  exercises: [
    compoundLift('barbell_bench_press'),
    compoundLift('overhead_press', 3),
    accessoryLift('incline_dumbbell_press', 3, 8, 12),
    accessoryLift('lateral_raise'),
    accessoryLift('triceps_pushdown'),
  ],
});

const pullA = (days: number[], key = 'pull'): TemplateRoutine => ({
  key,
  name: { en: 'Pull', th: 'Pull (ดึง)' },
  type: 'pull',
  days,
  exercises: [
    compoundLift('barbell_row'),
    compoundLift('lat_pulldown', 3, 8, 12),
    accessoryLift('seated_cable_row', 3, 8, 12),
    accessoryLift('face_pull'),
    accessoryLift('dumbbell_curl', 3, 8, 12),
  ],
});

const legsA = (days: number[], key = 'legs'): TemplateRoutine => ({
  key,
  name: { en: 'Legs', th: 'Legs (ขา)' },
  type: 'legs',
  days,
  exercises: [
    compoundLift('back_squat'),
    compoundLift('romanian_deadlift', 3, 8, 10),
    accessoryLift('leg_press', 3, 10, 12),
    accessoryLift('lying_leg_curl'),
    accessoryLift('standing_calf_raise', 4),
  ],
});

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    key: 'ppl3',
    name: { en: 'Push / Pull / Legs (3 days)', th: 'Push / Pull / Legs (3 วัน)' },
    description: {
      en: 'Each muscle group once a week — a simple split for busy weeks.',
      th: 'ฝึกแต่ละกลุ่มกล้ามเนื้อสัปดาห์ละครั้ง เหมาะกับสัปดาห์ที่มีเวลาน้อย',
    },
    routines: [pushA([MON]), pullA([WED]), legsA([FRI])],
  },
  {
    key: 'ppl6',
    name: { en: 'Push / Pull / Legs (6 days)', th: 'Push / Pull / Legs (6 วัน)' },
    description: {
      en: 'Every muscle twice a week with A and B variations. For experienced lifters.',
      th: 'ฝึกทุกกลุ่มกล้ามเนื้อสัปดาห์ละ 2 ครั้ง สลับชุด A/B สำหรับผู้มีประสบการณ์',
    },
    routines: [
      { ...pushA([MON], 'push_a'), name: { en: 'Push A', th: 'Push A' } },
      { ...pullA([TUE], 'pull_a'), name: { en: 'Pull A', th: 'Pull A' } },
      { ...legsA([WED], 'legs_a'), name: { en: 'Legs A', th: 'Legs A' } },
      {
        key: 'push_b',
        name: { en: 'Push B', th: 'Push B' },
        type: 'push',
        days: [THU],
        exercises: [
          compoundLift('seated_dumbbell_press', 4, 8, 10),
          compoundLift('incline_barbell_bench_press', 3, 6, 10),
          accessoryLift('cable_crossover'),
          accessoryLift('cable_lateral_raise'),
          accessoryLift('overhead_cable_extension'),
        ],
      },
      {
        key: 'pull_b',
        name: { en: 'Pull B', th: 'Pull B' },
        type: 'pull',
        days: [FRI],
        exercises: [
          compoundLift('pull_up', 4, 5, 10),
          compoundLift('one_arm_dumbbell_row', 3, 8, 12),
          accessoryLift('straight_arm_pulldown'),
          accessoryLift('rear_delt_fly'),
          accessoryLift('hammer_curl', 3, 8, 12),
        ],
      },
      {
        key: 'legs_b',
        name: { en: 'Legs B', th: 'Legs B' },
        type: 'legs',
        days: [SAT],
        exercises: [
          compoundLift('deadlift', 3, 4, 6),
          compoundLift('bulgarian_split_squat', 3, 8, 12),
          accessoryLift('leg_extension'),
          accessoryLift('seated_leg_curl'),
          accessoryLift('seated_calf_raise', 4),
        ],
      },
    ],
  },
  {
    key: 'upper_lower',
    name: { en: 'Upper / Lower (4 days)', th: 'Upper / Lower (4 วัน)' },
    description: {
      en: 'Upper and lower body twice a week each. A balanced classic.',
      th: 'ฝึกท่อนบนและท่อนล่างอย่างละ 2 ครั้งต่อสัปดาห์ สมดุลและคลาสสิก',
    },
    routines: [
      {
        key: 'upper_a',
        name: { en: 'Upper A', th: 'Upper A (ท่อนบน)' },
        type: 'upper',
        days: [MON],
        exercises: [
          compoundLift('barbell_bench_press'),
          compoundLift('barbell_row'),
          accessoryLift('seated_dumbbell_press', 3, 8, 12),
          accessoryLift('lat_pulldown', 3, 8, 12),
          accessoryLift('barbell_curl'),
          accessoryLift('triceps_pushdown'),
        ],
      },
      {
        key: 'lower_a',
        name: { en: 'Lower A', th: 'Lower A (ท่อนล่าง)' },
        type: 'lower',
        days: [TUE],
        exercises: [
          compoundLift('back_squat'),
          compoundLift('romanian_deadlift', 3, 8, 10),
          accessoryLift('leg_press', 3, 10, 12),
          accessoryLift('lying_leg_curl'),
          accessoryLift('standing_calf_raise', 4),
          accessoryLift('cable_crunch'),
        ],
      },
      {
        key: 'upper_b',
        name: { en: 'Upper B', th: 'Upper B (ท่อนบน)' },
        type: 'upper',
        days: [THU],
        exercises: [
          compoundLift('overhead_press'),
          compoundLift('pull_up', 4, 5, 10),
          accessoryLift('incline_dumbbell_press', 3, 8, 12),
          accessoryLift('seated_cable_row', 3, 8, 12),
          accessoryLift('lateral_raise'),
          accessoryLift('hammer_curl'),
        ],
      },
      {
        key: 'lower_b',
        name: { en: 'Lower B', th: 'Lower B (ท่อนล่าง)' },
        type: 'lower',
        days: [FRI],
        exercises: [
          compoundLift('deadlift', 3, 4, 6),
          compoundLift('front_squat', 3, 6, 10),
          accessoryLift('walking_lunge', 3, 10, 12),
          accessoryLift('hip_thrust', 3, 8, 12),
          accessoryLift('seated_calf_raise', 4),
          accessoryLift('hanging_leg_raise'),
        ],
      },
    ],
  },
  {
    key: 'full_body3',
    name: { en: 'Full Body (3 days)', th: 'Full Body (3 วัน)' },
    description: {
      en: 'Whole body every session, three times a week. Great for beginners.',
      th: 'ฝึกทั้งตัวทุกครั้ง สัปดาห์ละ 3 วัน เหมาะกับมือใหม่',
    },
    routines: [
      {
        key: 'full_a',
        name: { en: 'Full Body A', th: 'Full Body A' },
        type: 'full_body',
        days: [MON],
        exercises: [
          compoundLift('back_squat', 3),
          compoundLift('barbell_bench_press', 3),
          compoundLift('barbell_row', 3),
          accessoryLift('lateral_raise'),
          accessoryLift('crunch', 3, 12, 20),
        ],
      },
      {
        key: 'full_b',
        name: { en: 'Full Body B', th: 'Full Body B' },
        type: 'full_body',
        days: [WED],
        exercises: [
          compoundLift('deadlift', 3, 4, 6),
          compoundLift('overhead_press', 3),
          compoundLift('lat_pulldown', 3, 8, 12),
          accessoryLift('goblet_squat'),
          accessoryLift('dumbbell_curl'),
        ],
      },
      {
        key: 'full_c',
        name: { en: 'Full Body C', th: 'Full Body C' },
        type: 'full_body',
        days: [FRI],
        exercises: [
          compoundLift('front_squat', 3),
          compoundLift('incline_dumbbell_press', 3, 8, 12),
          compoundLift('one_arm_dumbbell_row', 3, 8, 12),
          accessoryLift('hip_thrust'),
          accessoryLift('triceps_pushdown'),
        ],
      },
    ],
  },
  {
    key: 'bro_split',
    name: { en: 'Bro Split (5 days)', th: 'Bro Split (5 วัน)' },
    description: {
      en: 'One main muscle group per day, high volume for each.',
      th: 'วันละหนึ่งกลุ่มกล้ามเนื้อหลัก ปริมาณการฝึกต่อกลุ่มสูง',
    },
    routines: [
      {
        key: 'chest',
        name: { en: 'Chest', th: 'อก' },
        type: 'push',
        days: [MON],
        exercises: [
          compoundLift('barbell_bench_press'),
          compoundLift('incline_dumbbell_press', 4, 8, 12),
          accessoryLift('dumbbell_fly'),
          accessoryLift('cable_crossover'),
          accessoryLift('chest_dip', 3, 8, 12),
        ],
      },
      {
        key: 'back',
        name: { en: 'Back', th: 'หลัง' },
        type: 'pull',
        days: [TUE],
        exercises: [
          compoundLift('deadlift', 3, 4, 6),
          compoundLift('pull_up', 4, 5, 10),
          accessoryLift('barbell_row', 3, 8, 12),
          accessoryLift('seated_cable_row'),
          accessoryLift('straight_arm_pulldown'),
        ],
      },
      {
        key: 'shoulders',
        name: { en: 'Shoulders', th: 'ไหล่' },
        type: 'push',
        days: [WED],
        exercises: [
          compoundLift('overhead_press'),
          accessoryLift('arnold_press', 3, 8, 12),
          accessoryLift('lateral_raise', 4),
          accessoryLift('rear_delt_fly', 4),
          accessoryLift('dumbbell_shrug'),
        ],
      },
      {
        key: 'arms',
        name: { en: 'Arms', th: 'แขน' },
        type: 'other',
        days: [THU],
        exercises: [
          compoundLift('close_grip_bench_press', 3, 6, 10),
          accessoryLift('barbell_curl', 3, 8, 12),
          accessoryLift('skull_crusher', 3, 8, 12),
          accessoryLift('hammer_curl'),
          accessoryLift('rope_pushdown'),
          accessoryLift('wrist_curl', 2, 12, 20),
        ],
      },
      {
        key: 'legs',
        name: { en: 'Legs', th: 'ขา' },
        type: 'legs',
        days: [FRI],
        exercises: [
          compoundLift('back_squat'),
          compoundLift('romanian_deadlift', 3, 8, 10),
          accessoryLift('leg_press'),
          accessoryLift('leg_extension'),
          accessoryLift('lying_leg_curl'),
          accessoryLift('standing_calf_raise', 4),
        ],
      },
    ],
  },
  {
    key: 'starter_5x5',
    name: { en: '5×5 Beginner', th: '5×5 สำหรับมือใหม่' },
    description: {
      en: 'Three big lifts per session, adding weight each time you complete all 5×5.',
      th: 'ท่าหลัก 3 ท่าต่อครั้ง เพิ่มน้ำหนักทุกครั้งที่ทำครบ 5×5',
    },
    routines: [
      {
        key: 'workout_a',
        name: { en: 'Workout A', th: 'วัน A' },
        type: 'full_body',
        days: [MON, FRI],
        exercises: [
          linear5x5Lift('back_squat'),
          linear5x5Lift('barbell_bench_press'),
          linear5x5Lift('barbell_row'),
        ],
      },
      {
        key: 'workout_b',
        name: { en: 'Workout B', th: 'วัน B' },
        type: 'full_body',
        days: [WED],
        exercises: [
          linear5x5Lift('back_squat'),
          linear5x5Lift('overhead_press'),
          linear5x5Lift('deadlift', 1),
        ],
      },
    ],
  },
];

export function getTemplate(key: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.key === key);
}

/** จำนวนวันฝึกต่อสัปดาห์ของเทมเพลต */
export function trainingDaysPerWeek(t: ProgramTemplate): number {
  return new Set(t.routines.flatMap((r) => r.days)).size;
}
