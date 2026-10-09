import type { CustomExercise, Equipment, MuscleGroup } from '../db/schema';
import type { Language } from '../i18n';
import raw from './exercises.json';

/**
 * คลังท่าในตัวแอป (SPEC F7–F9) — ข้อความอธิบายเขียนเอง ไม่มีรูป/วิดีโอ/GIF
 * ท่าที่ผู้ใช้สร้างเองมาจากตาราง custom_exercise แล้วรวมด้วย mergeExercises
 */

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
];

export interface LocalizedText {
  en: string;
  th: string;
}

export interface BuiltInExercise {
  id: string;
  name: LocalizedText;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  description: LocalizedText;
}

/** รูปแบบร่วมของท่าในคลังและท่าที่สร้างเอง */
export interface ExerciseInfo {
  id: string;
  /** ชื่อสองภาษา (ท่าในคลัง) หรือชื่อเดียวที่ผู้ใช้ตั้ง (ท่าที่สร้างเอง) */
  name: LocalizedText | string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  description: LocalizedText | string | null;
  isCustom: boolean;
}

export const BUILT_IN_EXERCISES: BuiltInExercise[] = raw as BuiltInExercise[];

const byId = new Map(BUILT_IN_EXERCISES.map((e) => [e.id, e]));

export function getBuiltIn(id: string): BuiltInExercise | undefined {
  return byId.get(id);
}

export function localized(text: LocalizedText | string | null | undefined, lang: Language): string {
  if (!text) return '';
  return typeof text === 'string' ? text : text[lang];
}

export function exerciseName(ex: Pick<ExerciseInfo, 'name'>, lang: Language): string {
  return localized(ex.name, lang);
}

function fromBuiltIn(e: BuiltInExercise): ExerciseInfo {
  return { ...e, isCustom: false };
}

export function fromCustom(
  c: Pick<CustomExercise, 'id' | 'name' | 'primaryMuscle' | 'secondaryMuscles' | 'equipment' | 'notes'>,
): ExerciseInfo {
  return {
    id: c.id,
    name: c.name,
    primary: c.primaryMuscle,
    secondary: c.secondaryMuscles ?? [],
    equipment: c.equipment,
    description: c.notes ?? null,
    isCustom: true,
  };
}

/** รวมท่าในคลังกับท่าที่สร้างเอง (ท่าที่สร้างเองมาก่อน) */
export function mergeExercises(customs: Parameters<typeof fromCustom>[0][]): ExerciseInfo[] {
  return [...customs.map(fromCustom), ...BUILT_IN_EXERCISES.map(fromBuiltIn)];
}

/** ตัดวรรณยุกต์/เครื่องหมาย และตัวพิมพ์ เพื่อค้นหาแบบยืดหยุ่น (ไทยตัดวรรณยุกต์และไม้ไต่คู้) */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[็-๎]/g, '')
    .replace(/[^a-z0-9฀-๿]+/g, ' ')
    .trim();
}

export interface ExerciseFilter {
  muscle?: MuscleGroup | null;
  /** รวมท่าที่ใช้กลุ่มกล้ามเนื้อนี้เป็นกลุ่มรองด้วย */
  includeSecondary?: boolean;
  equipment?: Equipment | null;
}

/**
 * ค้นหาได้ทั้งชื่อไทยและอังกฤษ (ไม่สนตัวพิมพ์/วรรณยุกต์) และกรองตามกลุ่มกล้ามเนื้อ/อุปกรณ์
 * เรียง: ชื่อขึ้นต้นด้วยคำค้น → มีคำค้น, แล้วตามชื่อในภาษาที่ใช้
 */
export function searchExercises(
  list: ExerciseInfo[],
  query: string,
  filter: ExerciseFilter,
  lang: Language,
): ExerciseInfo[] {
  const q = normalizeSearch(query);
  const scored: { ex: ExerciseInfo; score: number }[] = [];
  for (const ex of list) {
    if (filter.equipment && ex.equipment !== filter.equipment) continue;
    if (filter.muscle) {
      const hit =
        ex.primary === filter.muscle || (filter.includeSecondary && ex.secondary.includes(filter.muscle));
      if (!hit) continue;
    }
    if (!q) {
      scored.push({ ex, score: 2 });
      continue;
    }
    const names =
      typeof ex.name === 'string'
        ? [normalizeSearch(ex.name)]
        : [normalizeSearch(ex.name.en), normalizeSearch(ex.name.th)];
    const id = normalizeSearch(ex.id.replace(/_/g, ' '));
    if (names.some((n) => n.startsWith(q))) scored.push({ ex, score: 0 });
    else if (names.some((n) => n.includes(q)) || id.includes(q)) scored.push({ ex, score: 1 });
  }
  return scored
    .sort((a, b) => a.score - b.score || exerciseName(a.ex, lang).localeCompare(exerciseName(b.ex, lang)))
    .map((s) => s.ex);
}
