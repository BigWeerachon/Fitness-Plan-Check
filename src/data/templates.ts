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

/** ท่าหลัก (compound) — เซ็ตน้อยครั้งน้อย พักนาน */
function main(exerciseId: string, sets = 4, repMin = 6, repMax = 10): TemplateExercise {
  return { exerciseId, sets, repMin, repMax, progressionMode: 'double', restSec: 150 };
}

/** ท่าเสริม (accessory) */
function acc(exerciseId: string, sets = 3, repMin = 10, repMax = 15): TemplateExercise {
  return { exerciseId, sets, repMin, repMax, progressionMode: 'double', restSec: 75 };
}

/** 5x5 แบบ linear */
function fiveByFive(exerciseId: string, sets = 5): TemplateExercise {
  return { exerciseId, sets, repMin: 5, repMax: 5, progressionMode: 'linear', restSec: 180 };
}

const pushA = (days: number[], key = 'push'): TemplateRoutine => ({
  key,
  name: { en: 'Push', th: 'Push (ดัน)' },
  type: 'push',
  days,
  exercises: [
    main('barbell_bench_press'),
    main('overhead_press', 3),
    acc('incline_dumbbell_press', 3, 8, 12),
    acc('lateral_raise'),
    acc('triceps_pushdown'),
  ],
});

const pullA = (days: number[], key = 'pull'): TemplateRoutine => ({
  key,
  name: { en: 'Pull', th: 'Pull (ดึง)' },
  type: 'pull',
  days,
  exercises: [
    main('barbell_row'),
    main('lat_pulldown', 3, 8, 12),
    acc('seated_cable_row', 3, 8, 12),
    acc('face_pull'),
    acc('dumbbell_curl', 3, 8, 12),
  ],
});

const legsA = (days: number[], key = 'legs'): TemplateRoutine => ({
  key,
  name: { en: 'Legs', th: 'Legs (ขา)' },
  type: 'legs',
  days,
  exercises: [
    main('back_squat'),
    main('romanian_deadlift', 3, 8, 10),
    acc('leg_press', 3, 10, 12),
    acc('lying_leg_curl'),
    acc('standing_calf_raise', 4),
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
          main('seated_dumbbell_press', 4, 8, 10),
          main('incline_barbell_bench_press', 3, 6, 10),
          acc('cable_crossover'),
          acc('cable_lateral_raise'),
          acc('overhead_cable_extension'),
        ],
      },
      {
        key: 'pull_b',
        name: { en: 'Pull B', th: 'Pull B' },
        type: 'pull',
        days: [FRI],
        exercises: [
          main('pull_up', 4, 5, 10),
          main('one_arm_dumbbell_row', 3, 8, 12),
          acc('straight_arm_pulldown'),
          acc('rear_delt_fly'),
          acc('hammer_curl', 3, 8, 12),
        ],
      },
      {
        key: 'legs_b',
        name: { en: 'Legs B', th: 'Legs B' },
        type: 'legs',
        days: [SAT],
        exercises: [
          main('deadlift', 3, 4, 6),
          main('bulgarian_split_squat', 3, 8, 12),
          acc('leg_extension'),
          acc('seated_leg_curl'),
          acc('seated_calf_raise', 4),
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
          main('barbell_bench_press'),
          main('barbell_row'),
          acc('seated_dumbbell_press', 3, 8, 12),
          acc('lat_pulldown', 3, 8, 12),
          acc('barbell_curl'),
          acc('triceps_pushdown'),
        ],
      },
      {
        key: 'lower_a',
        name: { en: 'Lower A', th: 'Lower A (ท่อนล่าง)' },
        type: 'lower',
        days: [TUE],
        exercises: [
          main('back_squat'),
          main('romanian_deadlift', 3, 8, 10),
          acc('leg_press', 3, 10, 12),
          acc('lying_leg_curl'),
          acc('standing_calf_raise', 4),
          acc('cable_crunch'),
        ],
      },
      {
        key: 'upper_b',
        name: { en: 'Upper B', th: 'Upper B (ท่อนบน)' },
        type: 'upper',
        days: [THU],
        exercises: [
          main('overhead_press'),
          main('pull_up', 4, 5, 10),
          acc('incline_dumbbell_press', 3, 8, 12),
          acc('seated_cable_row', 3, 8, 12),
          acc('lateral_raise'),
          acc('hammer_curl'),
        ],
      },
      {
        key: 'lower_b',
        name: { en: 'Lower B', th: 'Lower B (ท่อนล่าง)' },
        type: 'lower',
        days: [FRI],
        exercises: [
          main('deadlift', 3, 4, 6),
          main('front_squat', 3, 6, 10),
          acc('walking_lunge', 3, 10, 12),
          acc('hip_thrust', 3, 8, 12),
          acc('seated_calf_raise', 4),
          acc('hanging_leg_raise'),
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
          main('back_squat', 3),
          main('barbell_bench_press', 3),
          main('barbell_row', 3),
          acc('lateral_raise'),
          acc('crunch', 3, 12, 20),
        ],
      },
      {
        key: 'full_b',
        name: { en: 'Full Body B', th: 'Full Body B' },
        type: 'full_body',
        days: [WED],
        exercises: [
          main('deadlift', 3, 4, 6),
          main('overhead_press', 3),
          main('lat_pulldown', 3, 8, 12),
          acc('goblet_squat'),
          acc('dumbbell_curl'),
        ],
      },
      {
        key: 'full_c',
        name: { en: 'Full Body C', th: 'Full Body C' },
        type: 'full_body',
        days: [FRI],
        exercises: [
          main('front_squat', 3),
          main('incline_dumbbell_press', 3, 8, 12),
          main('one_arm_dumbbell_row', 3, 8, 12),
          acc('hip_thrust'),
          acc('triceps_pushdown'),
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
          main('barbell_bench_press'),
          main('incline_dumbbell_press', 4, 8, 12),
          acc('dumbbell_fly'),
          acc('cable_crossover'),
          acc('chest_dip', 3, 8, 12),
        ],
      },
      {
        key: 'back',
        name: { en: 'Back', th: 'หลัง' },
        type: 'pull',
        days: [TUE],
        exercises: [
          main('deadlift', 3, 4, 6),
          main('pull_up', 4, 5, 10),
          acc('barbell_row', 3, 8, 12),
          acc('seated_cable_row'),
          acc('straight_arm_pulldown'),
        ],
      },
      {
        key: 'shoulders',
        name: { en: 'Shoulders', th: 'ไหล่' },
        type: 'push',
        days: [WED],
        exercises: [
          main('overhead_press'),
          acc('arnold_press', 3, 8, 12),
          acc('lateral_raise', 4),
          acc('rear_delt_fly', 4),
          acc('dumbbell_shrug'),
        ],
      },
      {
        key: 'arms',
        name: { en: 'Arms', th: 'แขน' },
        type: 'other',
        days: [THU],
        exercises: [
          main('close_grip_bench_press', 3, 6, 10),
          acc('barbell_curl', 3, 8, 12),
          acc('skull_crusher', 3, 8, 12),
          acc('hammer_curl'),
          acc('rope_pushdown'),
          acc('wrist_curl', 2, 12, 20),
        ],
      },
      {
        key: 'legs',
        name: { en: 'Legs', th: 'ขา' },
        type: 'legs',
        days: [FRI],
        exercises: [
          main('back_squat'),
          main('romanian_deadlift', 3, 8, 10),
          acc('leg_press'),
          acc('leg_extension'),
          acc('lying_leg_curl'),
          acc('standing_calf_raise', 4),
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
        exercises: [fiveByFive('back_squat'), fiveByFive('barbell_bench_press'), fiveByFive('barbell_row')],
      },
      {
        key: 'workout_b',
        name: { en: 'Workout B', th: 'วัน B' },
        type: 'full_body',
        days: [WED],
        exercises: [fiveByFive('back_squat'), fiveByFive('overhead_press'), fiveByFive('deadlift', 1)],
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
