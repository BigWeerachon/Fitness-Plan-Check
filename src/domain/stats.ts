import type { DailyLog, MuscleGroup, RoutineType, SessionSet, WorkoutSession } from '../db/schema';
import type { LocalDate } from './dates';
import {
  intersectRange,
  isInRange,
  periodBuckets,
  periodRange,
  rangeDays,
  type DateRange,
  type Period,
} from './periods';

/**
 * สถิติและสรุปผล (SPEC I1–I5) — ฟังก์ชันล้วนทั้งหมด
 * คิดจาก snapshot ที่เก็บไว้ในเซสชัน/เซ็ตเท่านั้น (programName/routineType/muscleGroup ฯลฯ, SPEC F6/M)
 * ไม่อ่านตาราง program/routine ปัจจุบัน → แก้ชื่อหรือลบ routine/กรุ๊ปภายหลังไม่เปลี่ยนสถิติย้อนหลัง
 * นับเฉพาะเซสชัน status = 'completed' ที่ยังไม่ถูกลบ และเซ็ตที่ done = true ที่ยังไม่ถูกลบ
 */

// ───────────── เปอร์เซ็นต์แบบ largest remainder (Hamilton) ─────────────

export interface ShareInput<K extends string = string> {
  key: K;
  value: number;
}

export interface Share<K extends string = string> {
  key: K;
  value: number;
  /** เปอร์เซ็นต์ที่ปัดแล้ว ผลรวมของทุกรายการ = 100 พอดีเสมอ */
  percent: number;
}

export const MAX_PERCENT_DECIMALS = 4;

const EPS = 1e-9;

interface Quota<K extends string> {
  key: K;
  value: number;
  units: number;
  /** เศษที่เหลือหลังปัดลง (ใช้เทียบกันภายในการคำนวณครั้งเดียวกันเท่านั้น) */
  rem: number;
}

function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * แบ่ง units ตามสัดส่วน แล้วคืนส่วนปัดลง + เศษของแต่ละรายการ
 * ค่าเป็นจำนวนเต็มทั้งหมด (เซ็ต/เซสชัน) → คิดแบบจำนวนเต็มล้วน เศษเทียบกันได้ตรงทุกหลัก
 * ค่ามีทศนิยม (ปริมาณรวม) → คิดแบบทศนิยม แล้วปัดเศษให้หยาบลง 1e-9 กันความคลาดเคลื่อนของเลขทศนิยมทำให้การตัดสินเสมอกันเพี้ยน
 */
function quotas<K extends string>(
  items: { key: K; value: number }[],
  total: number,
  units: number,
): Quota<K>[] {
  const integral =
    Number.isSafeInteger(total) &&
    Number.isSafeInteger(total * units) &&
    items.every((i) => Number.isInteger(i.value));
  return items.map(({ key, value }) => {
    if (integral) {
      const scaled = value * units;
      const floor = Math.floor(scaled / total);
      return { key, value, units: floor, rem: scaled - floor * total };
    }
    const exact = (value / total) * units;
    const floor = Math.floor(exact + EPS);
    return { key, value, units: floor, rem: Math.max(0, Math.round((exact - floor) / EPS)) };
  });
}

/**
 * แปลงค่าเป็นเปอร์เซ็นต์ที่ผลรวม = 100 พอดี (หรือ 100.0 เมื่อมีทศนิยม) ด้วยวิธี largest remainder
 * 1) ทุกรายการได้ส่วนปัดลงของโควตา 2) หน่วยที่เหลือแจกให้รายการที่เศษมากสุดก่อน
 * เสมอกันตัดสินด้วย ค่ามากกว่า → key น้อยกว่า (เรียงตามรหัสอักขระ) จึงได้ผลเดิมทุกครั้งไม่ขึ้นกับลำดับข้อมูลเข้า
 * key ซ้ำถูกรวมกัน ค่าที่ไม่ใช่จำนวนบวกถูกตัดทิ้ง ผลรวมเป็น 0 → [] (สถานะว่าง)
 * ผลลัพธ์เรียงตามค่ามากไปน้อย แล้วตาม key
 */
export function percentages<K extends string>(values: readonly ShareInput<K>[], decimals = 0): Share<K>[] {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_PERCENT_DECIMALS) {
    throw new RangeError(`Invalid percent decimals: ${decimals}`);
  }
  const merged = new Map<K, number>();
  for (const { key, value } of values) {
    if (!Number.isFinite(value) || value <= 0) continue;
    merged.set(key, (merged.get(key) ?? 0) + value);
  }
  const items = [...merged].map(([key, value]) => ({ key, value }));
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!(total > 0) || !Number.isFinite(total)) return [];

  const scale = 10 ** decimals;
  const units = 100 * scale;
  const rows = quotas(items, total, units);
  let left = units - rows.reduce((s, r) => s + r.units, 0);
  const order = [...rows].sort((a, b) => b.rem - a.rem || b.value - a.value || compareKeys(a.key, b.key));
  for (let i = 0; left > 0; i = (i + 1) % order.length) {
    order[i].units += 1;
    left -= 1;
  }
  return rows
    .map((r) => ({ key: r.key, value: r.value, percent: r.units / scale }))
    .sort((a, b) => b.value - a.value || compareKeys(a.key, b.key));
}

// ───────────── ข้อมูลเข้าและการคัดกรอง ─────────────

/** ตัวชี้วัด I2: เซ็ตที่เสร็จ (ค่าเริ่มต้น) / ปริมาณรวม (น้ำหนัก×ครั้ง, kg) / จำนวนเซสชัน */
export type Metric = 'sets' | 'volume' | 'sessions';

export const METRICS: readonly Metric[] = ['sets', 'volume', 'sessions'];

export const DEFAULT_METRIC: Metric = 'sets';

export type StatsSession = Pick<
  WorkoutSession,
  | 'id'
  | 'date'
  | 'startedAt'
  | 'status'
  | 'deletedAt'
  | 'programId'
  | 'programName'
  | 'routineName'
  | 'routineType'
  | 'kcal'
>;

export type StatsSet = Pick<
  SessionSet,
  'id' | 'sessionId' | 'exerciseId' | 'muscleGroup' | 'weightKg' | 'reps' | 'done' | 'deletedAt'
>;

export type StatsDailyLog = Pick<
  DailyLog,
  'id' | 'date' | 'updatedAt' | 'deletedAt' | 'kcalExpenditureOverride' | 'kcalIntake' | 'bodyWeightKg'
>;

/** ข้อมูลที่สถิติใช้ — ตั้งใจไม่มีตาราง program/routine เพื่อให้คิดจาก snapshot เท่านั้น */
export interface StatsData {
  sessions: readonly StatsSession[];
  sets: readonly StatsSet[];
}

/**
 * กรองตามกรุ๊ป (I5): ฟิลด์ที่ระบุต้องตรงกับ snapshot ของเซสชัน (null = เซสชันที่ไม่มีกรุ๊ป), undefined = ไม่กรองฟิลด์นั้น
 */
export interface GroupFilter {
  programId?: string | null;
  programName?: string | null;
}

export interface StatsFilter {
  /** ช่วงวันที่ (รวมปลาย) ตามวันที่ของเซสชัน — ไม่ระบุ = ทุกช่วง */
  range?: DateRange | null;
  group?: GroupFilter | null;
}

export interface SelectedStats {
  /** เซสชันที่ผ่านเงื่อนไข เรียงตามวันที่ → เวลาเริ่ม → id */
  sessions: StatsSession[];
  /** เซ็ตที่ done ของเซสชันที่ผ่านเงื่อนไข แยกตาม sessionId (เรียงตาม id) */
  setsBySession: Map<string, StatsSet[]>;
}

export function matchesGroup(
  session: Pick<StatsSession, 'programId' | 'programName'>,
  group: GroupFilter | null | undefined,
): boolean {
  if (!group) return true;
  if (group.programId !== undefined && session.programId !== group.programId) return false;
  if (group.programName !== undefined && session.programName !== group.programName) return false;
  return true;
}

function compareSessions(a: StatsSession, b: StatsSession): number {
  return compareKeys(a.date, b.date) || a.startedAt - b.startedAt || compareKeys(a.id, b.id);
}

/** คัดเซสชันที่เสร็จแล้ว/ไม่ถูกลบ/อยู่ในช่วง/ตรงกรุ๊ป และเซ็ตที่ done ของเซสชันเหล่านั้น */
export function selectStatsData(data: StatsData, filter: StatsFilter = {}): SelectedStats {
  const { range, group } = filter;
  const sessions = data.sessions
    .filter(
      (s) =>
        s.status === 'completed' &&
        s.deletedAt == null &&
        (!range || isInRange(s.date, range)) &&
        matchesGroup(s, group),
    )
    .sort(compareSessions);
  const setsBySession = new Map<string, StatsSet[]>(sessions.map((s) => [s.id, []]));
  for (const set of data.sets) {
    if (!set.done || set.deletedAt != null) continue;
    setsBySession.get(set.sessionId)?.push(set);
  }
  // เรียงเซ็ตตาม id ให้ลำดับการบวกเลขทศนิยม (ปริมาณรวม) เหมือนกันทุกครั้ง ไม่ขึ้นกับลำดับแถวจากฐานข้อมูล
  for (const list of setsBySession.values()) list.sort((a, b) => compareKeys(a.id, b.id));
  return { sessions, setsBySession };
}

/** ปริมาณของเซ็ต = น้ำหนัก × ครั้ง (kg) — ไม่มีน้ำหนัก (บอดี้เวท) หรือไม่มีครั้ง = 0 */
export function setVolume(set: Pick<StatsSet, 'weightKg' | 'reps'>): number {
  const { weightKg, reps } = set;
  if (weightKg == null || reps == null) return 0;
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps <= 0) return 0;
  return weightKg * reps;
}

// ───────────── สัดส่วน 3 มุมมอง (I2) ─────────────

export interface BreakdownOptions extends StatsFilter {
  metric?: Metric;
  /** จำนวนทศนิยมของเปอร์เซ็นต์ (0 = จำนวนเต็ม) */
  decimals?: number;
}

export interface Breakdown<E> {
  metric: Metric;
  /** ผลรวมของตัวชี้วัด (ตัวหารของเปอร์เซ็นต์) */
  total: number;
  /** ว่าง = ไม่มีข้อมูลในช่วงนั้น → แสดงสถานะว่าง */
  entries: E[];
}

export interface ProgramShare extends Share<string> {
  programId: string | null;
  /** ชื่อกรุ๊ปจาก snapshot ของเซสชันล่าสุดในกลุ่ม (null = เซสชันที่ไม่มีกรุ๊ป) */
  programName: string | null;
}

export type RoutineTypeShare = Share<RoutineType>;

export type MuscleShare = Share<MuscleGroup>;

/** คีย์ของกรุ๊ปที่ไม่มีทั้ง programId และชื่อ (เช่น เซสชันเปล่า) */
export const NO_PROGRAM_KEY = 'none';

/**
 * คีย์กรุ๊ปของเซสชัน: programId (คงที่แม้เปลี่ยนชื่อกรุ๊ประหว่างช่วง) → ถ้าไม่มี id ใช้ชื่อ snapshot → ถ้าไม่มีทั้งคู่ใช้ NO_PROGRAM_KEY
 */
export function programKey(session: Pick<StatsSession, 'programId' | 'programName'>): string {
  if (session.programId != null) return session.programId;
  if (session.programName != null) return `name:${session.programName}`;
  return NO_PROGRAM_KEY;
}

/** ตัวกรอง I5 ที่เลือกกรุ๊ปเดียวกับที่ programKey จัดกลุ่มไว้ */
export function groupFilterOf(group: { programId: string | null; programName: string | null }): GroupFilter {
  return group.programId != null
    ? { programId: group.programId }
    : { programId: null, programName: group.programName };
}

function sessionMetric(sets: readonly StatsSet[], metric: Metric): number {
  if (metric === 'sessions') return 1;
  if (metric === 'sets') return sets.length;
  return sets.reduce((s, set) => s + setVolume(set), 0);
}

function addTo<K>(map: Map<K, number>, key: K, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function toBreakdown<K extends string>(
  values: Map<K, number>,
  metric: Metric,
  decimals: number,
): Breakdown<Share<K>> {
  const entries = percentages(
    [...values].map(([key, value]) => ({ key, value })),
    decimals,
  );
  return { metric, total: entries.reduce((s, e) => s + e.value, 0), entries };
}

export interface ProgramGroup {
  key: string;
  programId: string | null;
  programName: string | null;
  /** จำนวนเซสชันที่เสร็จในกลุ่ม */
  sessions: number;
  /** วันที่ของเซสชันล่าสุด */
  lastDate: LocalDate;
}

function groupsOf(sessions: readonly StatsSession[]): ProgramGroup[] {
  const groups = new Map<string, ProgramGroup>();
  // sessions เรียงจากเก่าไปใหม่ ค่าที่เขียนทีหลังจึงเป็นของเซสชันล่าสุด
  for (const s of sessions) {
    const key = programKey(s);
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        key,
        programId: s.programId,
        programName: s.programName,
        sessions: 1,
        lastDate: s.date,
      });
      continue;
    }
    g.sessions += 1;
    g.lastDate = s.date;
    if (s.programName != null) g.programName = s.programName;
  }
  return [...groups.values()].sort(
    (a, b) => compareKeys(b.lastDate, a.lastDate) || compareKeys(a.key, b.key),
  );
}

/**
 * รายการกรุ๊ปที่มีเซสชันเสร็จแล้ว (ตัวเลือกของตัวกรอง I5) เรียงจากที่ฝึกล่าสุด
 * ชื่อมาจาก snapshot ของเซสชันล่าสุดในกลุ่มที่มีชื่อ
 */
export function programGroups(data: StatsData, filter: StatsFilter = {}): ProgramGroup[] {
  return groupsOf(selectStatsData(data, filter).sessions);
}

/** มุมมอง 1: สัดส่วนตามกรุ๊ปโปรแกรม (snapshot programName/programId) */
export function byProgram(data: StatsData, options: BreakdownOptions = {}): Breakdown<ProgramShare> {
  const metric = options.metric ?? DEFAULT_METRIC;
  const { sessions, setsBySession } = selectStatsData(data, options);
  const values = new Map<string, number>();
  for (const s of sessions) {
    addTo(values, programKey(s), sessionMetric(setsBySession.get(s.id) ?? [], metric));
  }
  const groups = new Map(groupsOf(sessions).map((g) => [g.key, g]));
  const base = toBreakdown(values, metric, options.decimals ?? 0);
  return {
    ...base,
    entries: base.entries.map((e) => {
      const g = groups.get(e.key);
      return { ...e, programId: g?.programId ?? null, programName: g?.programName ?? null };
    }),
  };
}

/**
 * มุมมอง 2: สัดส่วนตามประเภท routine (snapshot routineType) — ส่ง options.group เป็นกรุ๊ปที่เลือก
 * เซสชันที่ไม่มี routineType (เช่น เซสชันเปล่า) นับเป็น 'other'
 */
export function byRoutineType(data: StatsData, options: BreakdownOptions = {}): Breakdown<RoutineTypeShare> {
  const metric = options.metric ?? DEFAULT_METRIC;
  const { sessions, setsBySession } = selectStatsData(data, options);
  const values = new Map<RoutineType, number>();
  for (const s of sessions) {
    addTo(values, s.routineType ?? 'other', sessionMetric(setsBySession.get(s.id) ?? [], metric));
  }
  return toBreakdown(values, metric, options.decimals ?? 0);
}

/**
 * มุมมอง 3: สัดส่วนตามกลุ่มกล้ามเนื้อหลัก (snapshot muscleGroup ของแต่ละเซ็ต)
 * ตัวชี้วัด 'sessions': เซสชันหนึ่งนับ 1 ครั้งต่อกลุ่มกล้ามเนื้อที่ได้ฝึก (เซสชันที่ฝึกอก+ไตรเซ็ป = อก 1, ไตรเซ็ป 1)
 * เปอร์เซ็นต์จึงเป็นสัดส่วนของ "คู่ เซสชัน–กลุ่มกล้ามเนื้อ" และเซสชันที่ไม่มีเซ็ตเสร็จไม่ถูกนับ
 */
export function byMuscle(data: StatsData, options: BreakdownOptions = {}): Breakdown<MuscleShare> {
  const metric = options.metric ?? DEFAULT_METRIC;
  const { sessions, setsBySession } = selectStatsData(data, options);
  const values = new Map<MuscleGroup, number>();
  for (const s of sessions) {
    const sets = setsBySession.get(s.id) ?? [];
    if (metric === 'sessions') {
      for (const muscle of new Set(sets.map((set) => set.muscleGroup))) addTo(values, muscle, 1);
      continue;
    }
    for (const set of sets) addTo(values, set.muscleGroup, metric === 'sets' ? 1 : setVolume(set));
  }
  return toBreakdown(values, metric, options.decimals ?? 0);
}

// ───────────── รายการเซสชัน (I1) ─────────────

export interface SessionSummary {
  sessionId: string;
  date: LocalDate;
  startedAt: number;
  programId: string | null;
  programName: string | null;
  routineName: string | null;
  routineType: RoutineType | null;
  /** จำนวนท่า (exerciseId ไม่ซ้ำ) ที่มีเซ็ตเสร็จอย่างน้อย 1 เซ็ต */
  exercises: number;
  /** เซ็ตที่เสร็จ */
  sets: number;
  /** ปริมาณรวม น้ำหนัก × ครั้ง (kg) */
  volumeKg: number;
}

/** รายการเซสชันที่เสร็จแล้วในช่วง/กรุ๊ป เรียงจากใหม่ไปเก่า */
export function sessionSummaries(data: StatsData, filter: StatsFilter = {}): SessionSummary[] {
  const { sessions, setsBySession } = selectStatsData(data, filter);
  return sessions
    .map((s) => {
      const sets = setsBySession.get(s.id) ?? [];
      return {
        sessionId: s.id,
        date: s.date,
        startedAt: s.startedAt,
        programId: s.programId,
        programName: s.programName,
        routineName: s.routineName,
        routineType: s.routineType,
        exercises: new Set(sets.map((set) => set.exerciseId)).size,
        sets: sets.length,
        volumeKg: sets.reduce((sum, set) => sum + setVolume(set), 0),
      };
    })
    .reverse();
}

// ───────────── บันทึกรายวัน (daily_log) ─────────────

export interface DailyValues {
  date: LocalDate;
  kcalExpenditureOverride: number | null;
  kcalIntake: number | null;
  bodyWeightKg: number | null;
}

type DailyField = 'kcalExpenditureOverride' | 'kcalIntake' | 'bodyWeightKg';

function validDaily(field: DailyField, value: number | null): value is number {
  if (value == null || !Number.isFinite(value)) return false;
  return field === 'bodyWeightKg' ? value > 0 : value >= 0;
}

/**
 * รวม daily_log ให้เหลือวันละ 1 ค่า (เช่น สองเครื่องสร้างแถวของวันเดียวกันตอนออฟไลน์)
 * แต่ละช่องใช้ค่าจากแถวที่แก้ไขล่าสุด (updatedAt มากสุด, เสมอกันใช้ id มากกว่า) ที่มีค่าในช่องนั้น
 * ไม่นับแถวที่ถูกลบ และค่าที่ใช้ไม่ได้ (ติดลบ/ไม่ใช่ตัวเลข/น้ำหนัก ≤ 0)
 * ผลลัพธ์เรียงตามวันที่จากเก่าไปใหม่
 */
export function dailyValues(logs: readonly StatsDailyLog[], range?: DateRange | null): DailyValues[] {
  const sorted = logs
    .filter((l) => l.deletedAt == null && (!range || isInRange(l.date, range)))
    .sort((a, b) => a.updatedAt - b.updatedAt || compareKeys(a.id, b.id));
  const byDate = new Map<LocalDate, DailyValues>();
  const fields: DailyField[] = ['kcalExpenditureOverride', 'kcalIntake', 'bodyWeightKg'];
  for (const log of sorted) {
    let day = byDate.get(log.date);
    if (!day) {
      day = { date: log.date, kcalExpenditureOverride: null, kcalIntake: null, bodyWeightKg: null };
      byDate.set(log.date, day);
    }
    for (const f of fields) {
      const value = log[f];
      if (validDaily(f, value)) day[f] = value;
    }
  }
  return [...byDate.values()]
    .filter((d) => fields.some((f) => d[f] != null))
    .sort((a, b) => compareKeys(a.date, b.date));
}

// ───────────── พลังงาน (I3) ─────────────

export interface EnergyOptions<M> {
  period: Period;
  anchor: LocalDate;
  /** 1 = จันทร์ (ค่าเริ่มต้น), 0 = อาทิตย์ */
  weekStart?: number;
  /** TDEE ต่อวัน (kcal) จากโปรไฟล์ — null = โปรไฟล์ไม่ครบ */
  tdee: number | null;
  /** แคลอรี่เป้าหมายต่อวัน (kcal) — null = ไม่มีเป้า */
  targetKcal: number | null;
  /** เป้าโปรตีน/คาร์บ/ไขมันต่อวัน ส่งผ่านไปแสดงผลตามเดิม */
  macrosPerDay?: M | null;
  /** วันนี้ — วันหลังจากนี้ไม่ถูกนับใน TDEE/เป้า × จำนวนวัน (ไม่ระบุ = นับทุกวันในช่วง) */
  today?: LocalDate | null;
}

export interface EnergyPoint {
  key: string;
  start: LocalDate;
  end: LocalDate;
  /** จำนวนวันที่นับเทียบ TDEE/เป้า ในช่องนี้ */
  days: number;
  /** แคลอรี่จากการออกกำลังกาย (ผลรวม kcal ของเซสชันที่เสร็จ) */
  exerciseKcal: number;
  /** แคลอรี่ที่ใช้ทั้งวันที่กรอกเอง (รวมเฉพาะวันที่กรอก) — null = ไม่ได้กรอกเลย */
  expenditureKcal: number | null;
  /** แคลอรี่ที่กิน (รวมเฉพาะวันที่กรอก) — null = ไม่ได้กรอกเลย */
  intakeKcal: number | null;
  /** TDEE × days */
  tdeeKcal: number | null;
  /** เป้าแคลอรี่ × days */
  targetKcal: number | null;
}

export interface EnteredTotal {
  totalKcal: number;
  /** จำนวนวันที่กรอก */
  days: number;
}

export interface EnergySummary<M> {
  range: DateRange;
  /** จำนวนวันที่นับเทียบ TDEE/เป้า (ตัดวันหลัง today) */
  days: number;
  exerciseKcal: number;
  /** จำนวนเซสชันที่เสร็จในช่วง */
  sessions: number;
  expenditure: EnteredTotal;
  intake: EnteredTotal;
  /** TDEE × days */
  tdeeKcal: number | null;
  /** เป้าแคลอรี่ × days */
  targetKcal: number | null;
  macrosPerDay: M | null;
  /** ข้อมูลกราฟ: รายวัน (วัน/สัปดาห์/เดือน) หรือรายเดือน (ปี) */
  series: EnergyPoint[];
}

function positiveOrNull(value: number | null): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function countedDays(range: DateRange, today: LocalDate | null | undefined): number {
  if (!today) return rangeDays(range);
  const clipped = intersectRange(range, { start: range.start, end: today });
  return clipped ? rangeDays(clipped) : 0;
}

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  return present.length ? present.reduce((s, v) => s + v, 0) : null;
}

/** สรุปพลังงานของช่วง (I3) เทียบกับ TDEE และเป้าแคลอรี่ พร้อมข้อมูลกราฟ */
export function energySummary<M>(
  data: { sessions: readonly StatsSession[]; dailyLogs: readonly StatsDailyLog[] },
  options: EnergyOptions<M>,
): EnergySummary<M> {
  const weekStart = options.weekStart ?? 1;
  const range = periodRange(options.period, options.anchor, weekStart);
  const tdee = positiveOrNull(options.tdee);
  const target = positiveOrNull(options.targetKcal);
  const { sessions } = selectStatsData({ sessions: data.sessions, sets: [] }, { range });
  const days = dailyValues(data.dailyLogs, range);

  const series = periodBuckets(options.period, options.anchor, weekStart).map((bucket): EnergyPoint => {
    const inBucket = (date: LocalDate) => isInRange(date, bucket);
    const bucketDays = days.filter((d) => inBucket(d.date));
    const counted = countedDays(bucket, options.today);
    return {
      key: bucket.key,
      start: bucket.start,
      end: bucket.end,
      days: counted,
      exerciseKcal: sessions
        .filter((s) => inBucket(s.date))
        .reduce((sum, s) => sum + (positiveOrNull(s.kcal) ?? 0), 0),
      expenditureKcal: sumOrNull(bucketDays.map((d) => d.kcalExpenditureOverride)),
      intakeKcal: sumOrNull(bucketDays.map((d) => d.kcalIntake)),
      tdeeKcal: tdee == null ? null : tdee * counted,
      targetKcal: target == null ? null : target * counted,
    };
  });

  const entered = (field: 'kcalExpenditureOverride' | 'kcalIntake'): EnteredTotal => {
    const values = days.map((d) => d[field]).filter((v): v is number => v != null);
    return { totalKcal: values.reduce((s, v) => s + v, 0), days: values.length };
  };
  const counted = countedDays(range, options.today);
  return {
    range,
    days: counted,
    exerciseKcal: series.reduce((s, p) => s + p.exerciseKcal, 0),
    sessions: sessions.length,
    expenditure: entered('kcalExpenditureOverride'),
    intake: entered('kcalIntake'),
    tdeeKcal: tdee == null ? null : tdee * counted,
    targetKcal: target == null ? null : target * counted,
    macrosPerDay: options.macrosPerDay ?? null,
    series,
  };
}

// ───────────── น้ำหนักตัวและความแข็งแรง (I4) ─────────────

export interface WeightPoint {
  date: LocalDate;
  weightKg: number;
}

/** แนวโน้มน้ำหนักตัวจาก daily_log (วันละ 1 จุด ค่าที่แก้ล่าสุดชนะ) เรียงจากเก่าไปใหม่ */
export function bodyWeightTrend(logs: readonly StatsDailyLog[], range?: DateRange | null): WeightPoint[] {
  return dailyValues(logs, range)
    .filter((d): d is DailyValues & { bodyWeightKg: number } => d.bodyWeightKg != null)
    .map((d) => ({ date: d.date, weightKg: d.bodyWeightKg }));
}

/**
 * 1RM โดยประมาณ (Epley): น้ำหนัก × (1 + ครั้ง/30); ทำ 1 ครั้ง = น้ำหนักนั้นเลย
 * ข้อมูลใช้ไม่ได้ (น้ำหนัก ≤ 0, ครั้ง < 1, ไม่ใช่ตัวเลข) → 0
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps < 1) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export interface StrengthPoint {
  date: LocalDate;
  /** 1RM โดยประมาณที่ดีที่สุดของวันนั้น (kg) */
  e1rmKg: number;
  /** เซ็ตที่ให้ค่านั้น */
  weightKg: number;
  reps: number;
  sessionId: string;
}

/** กราฟความแข็งแรงของท่า: 1RM (Epley) ที่ดีที่สุดต่อวันที่ของเซสชัน เรียงจากเก่าไปใหม่ */
export function strengthSeries(
  data: StatsData,
  exerciseId: string,
  filter: StatsFilter = {},
): StrengthPoint[] {
  const { sessions, setsBySession } = selectStatsData(data, filter);
  const best = new Map<LocalDate, StrengthPoint>();
  for (const s of sessions) {
    for (const set of setsBySession.get(s.id) ?? []) {
      if (set.exerciseId !== exerciseId || set.weightKg == null || set.reps == null) continue;
      const e1rmKg = epley1RM(set.weightKg, set.reps);
      if (e1rmKg <= 0) continue;
      const prev = best.get(s.date);
      // เท่ากัน → เลือกน้ำหนักมากกว่า (เซ็ตหนักสะท้อนแรงจริงกว่าเซ็ตครั้งเยอะ)
      if (prev && (prev.e1rmKg > e1rmKg || (prev.e1rmKg === e1rmKg && prev.weightKg >= set.weightKg))) {
        continue;
      }
      best.set(s.date, { date: s.date, e1rmKg, weightKg: set.weightKg, reps: set.reps, sessionId: s.id });
    }
  }
  return [...best.values()].sort((a, b) => compareKeys(a.date, b.date));
}
