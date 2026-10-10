import type { DailyLog, SessionSet, WorkoutSession } from '../db/schema';
import { dailyValues } from './stats';

/**
 * ส่งออก CSV (SPEC K) — ฟังก์ชันล้วน
 * ตาม RFC 4180: คั่นด้วยจุลภาค ขึ้นบรรทัดด้วย CRLF ครอบด้วย " เมื่อมีอักขระพิเศษ
 * ใส่ BOM นำหน้าเพื่อให้ Excel/Numbers อ่านภาษาไทย (UTF-8) ถูกต้อง
 * หัวคอลัมน์เป็นภาษาอังกฤษแบบคงที่ (รูปแบบข้อมูลสำหรับเครื่องอ่าน ไม่ใช่ข้อความ UI — DECISIONS D33)
 */

export type CsvValue = string | number | boolean | null | undefined;

export const CSV_BOM = '﻿';

// ข้อความที่ผู้ใช้พิมพ์เองซึ่งขึ้นต้นด้วยอักขระเหล่านี้ อาจถูกตีความเป็นสูตรในโปรแกรมสเปรดชีต (CSV injection)
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','));
  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}

function round(value: number | null | undefined, digits: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** เวลาท้องถิ่นแบบ "YYYY-MM-DD HH:mm" */
export function localDateTime(ms: number | null | undefined): string | null {
  if (ms == null) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const WORKOUT_CSV_HEADER = [
  'date',
  'started_at',
  'program',
  'routine',
  'routine_type',
  'intensity',
  'duration_min',
  'session_kcal',
  'exercise',
  'exercise_id',
  'muscle_group',
  'set',
  'weight_kg',
  'reps',
  'volume_kg',
  'done',
] as const;

export interface WorkoutCsvInput {
  sessions: readonly Pick<
    WorkoutSession,
    | 'id'
    | 'date'
    | 'startedAt'
    | 'status'
    | 'deletedAt'
    | 'programName'
    | 'routineName'
    | 'routineType'
    | 'intensity'
    | 'durationSec'
    | 'kcal'
  >[];
  sets: readonly Pick<
    SessionSet,
    | 'id'
    | 'sessionId'
    | 'sessionExerciseId'
    | 'exerciseId'
    | 'muscleGroup'
    | 'setIndex'
    | 'weightKg'
    | 'reps'
    | 'done'
    | 'deletedAt'
  >[];
  /** ลำดับท่าในเซสชัน (sessionExerciseId → ลำดับ) — ไม่ระบุ = เรียงตาม exerciseId */
  exerciseOrder?: ReadonlyMap<string, number>;
  exerciseName: (exerciseId: string) => string;
}

/** แถวละ 1 เซ็ตของเซสชันที่จบแล้ว เรียงตามวันที่ → เวลาเริ่ม → ลำดับท่า → ลำดับเซ็ต (ชื่อกรุ๊ป/routine จาก snapshot) */
export function workoutCsv(input: WorkoutCsvInput): string {
  const sessions = input.sessions
    .filter((s) => s.status === 'completed' && s.deletedAt == null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startedAt - b.startedAt));
  const bySession = new Map<string, WorkoutCsvInput['sets'][number][]>();
  for (const set of input.sets) {
    if (set.deletedAt != null) continue;
    const list = bySession.get(set.sessionId) ?? [];
    list.push(set);
    bySession.set(set.sessionId, list);
  }
  const order = (id: string) => input.exerciseOrder?.get(id) ?? 0;
  const rows: CsvValue[][] = [];
  for (const s of sessions) {
    const sets = (bySession.get(s.id) ?? []).sort(
      (a, b) =>
        order(a.sessionExerciseId) - order(b.sessionExerciseId) ||
        (a.exerciseId < b.exerciseId ? -1 : a.exerciseId > b.exerciseId ? 1 : 0) ||
        a.setIndex - b.setIndex,
    );
    for (const set of sets) {
      const volume = set.done && set.weightKg != null && set.reps != null ? set.weightKg * set.reps : null;
      rows.push([
        s.date,
        localDateTime(s.startedAt),
        s.programName,
        s.routineName,
        s.routineType,
        s.intensity,
        s.durationSec != null ? round(s.durationSec / 60, 1) : null,
        s.kcal,
        input.exerciseName(set.exerciseId),
        set.exerciseId,
        set.muscleGroup,
        set.setIndex + 1,
        round(set.weightKg, 2),
        set.reps,
        round(volume, 2),
        set.done,
      ]);
    }
  }
  return toCsv(WORKOUT_CSV_HEADER, rows);
}

export const DAILY_CSV_HEADER = [
  'date',
  'body_weight_kg',
  'kcal_intake',
  'kcal_expenditure_entered',
] as const;

/** บันทึกรายวัน (น้ำหนักตัว/แคลอรี่ที่กิน/แคลอรี่ที่ใช้ที่กรอกเอง) วันละ 1 แถว */
export function dailyLogCsv(
  logs: readonly Pick<
    DailyLog,
    'id' | 'date' | 'updatedAt' | 'deletedAt' | 'kcalExpenditureOverride' | 'kcalIntake' | 'bodyWeightKg'
  >[],
): string {
  return toCsv(
    DAILY_CSV_HEADER,
    dailyValues(logs).map((d) => [d.date, round(d.bodyWeightKg, 2), d.kcalIntake, d.kcalExpenditureOverride]),
  );
}
