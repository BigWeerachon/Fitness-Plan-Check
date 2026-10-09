import { addDays, diffDays, isLocalDate, startOfWeek, type LocalDate } from './dates';

/**
 * ช่วงเวลาของหน้าสถิติ (SPEC I: ตัวสลับ วัน / สัปดาห์ / เดือน / ปี ตัวเดียวใช้ทั้งหน้า ดูย้อนหลังได้)
 * ทุกฟังก์ชันเป็นฟังก์ชันล้วน ทำงานกับวันที่ท้องถิ่น 'YYYY-MM-DD'
 */

export type Period = 'day' | 'week' | 'month' | 'year';

export const PERIODS: readonly Period[] = ['day', 'week', 'month', 'year'];

/** ช่วงวันที่แบบรวมปลายทั้งสองข้าง (start ≤ วันที่ ≤ end) */
export interface DateRange {
  start: LocalDate;
  end: LocalDate;
}

/** ช่องหนึ่งของกราฟแท่ง: วันละช่อง (สัปดาห์/เดือน/วัน) หรือเดือนละช่อง (ปี) */
export interface PeriodBucket {
  /** 'YYYY-MM-DD' สำหรับช่องรายวัน, 'YYYY-MM' สำหรับช่องรายเดือน */
  key: string;
  start: LocalDate;
  end: LocalDate;
}

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function parts(date: LocalDate): Ymd {
  if (!isLocalDate(date)) throw new RangeError(`Invalid local date: ${date}`);
  return { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)), d: Number(date.slice(8, 10)) };
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function format(y: number, m: number, d: number): LocalDate {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

function assertWeekStart(weekStart: number): void {
  if (!Number.isInteger(weekStart) || weekStart < 0 || weekStart > 6) {
    throw new RangeError(`Invalid week start: ${weekStart}`);
  }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** จำนวนวันในเดือน (month: 1–12) */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * ช่วงของ period ที่มีวัน anchor อยู่
 * weekStart: 1 = จันทร์ (ค่าเริ่มต้นใน profile), 0 = อาทิตย์
 */
export function periodRange(period: Period, anchor: LocalDate, weekStart = 1): DateRange {
  const { y, m } = parts(anchor);
  switch (period) {
    case 'day':
      return { start: anchor, end: anchor };
    case 'week': {
      assertWeekStart(weekStart);
      const start = startOfWeek(anchor, weekStart);
      return { start, end: addDays(start, 6) };
    }
    case 'month':
      return { start: format(y, m, 1), end: format(y, m, daysInMonth(y, m)) };
    case 'year':
      return { start: format(y, 1, 1), end: format(y, 12, 31) };
  }
}

/**
 * เลื่อน anchor ไป delta ช่วง (ลบ = ย้อนหลัง) สำหรับเลื่อนดูประวัติ
 * เดือน/ปี: คงวันที่เดิมไว้ ถ้าเดือนปลายทางสั้นกว่าจะใช้วันสุดท้ายของเดือนนั้น (31 ม.ค. +1 เดือน → 28/29 ก.พ.)
 */
export function shiftPeriod(period: Period, anchor: LocalDate, delta: number): LocalDate {
  if (!Number.isInteger(delta)) throw new RangeError(`Invalid period delta: ${delta}`);
  const { y, m, d } = parts(anchor);
  switch (period) {
    case 'day':
      return addDays(anchor, delta);
    case 'week':
      return addDays(anchor, delta * 7);
    case 'month': {
      const total = y * 12 + (m - 1) + delta;
      const ny = Math.floor(total / 12);
      const nm = total - ny * 12 + 1;
      return format(ny, nm, Math.min(d, daysInMonth(ny, nm)));
    }
    case 'year': {
      const ny = y + delta;
      return format(ny, m, Math.min(d, daysInMonth(ny, m)));
    }
  }
}

export function isInRange(date: LocalDate, range: DateRange): boolean {
  // 'YYYY-MM-DD' เรียงตามตัวอักษร = เรียงตามเวลา จึงเทียบสตริงได้ตรงๆ
  return date >= range.start && date <= range.end;
}

/** จำนวนวันในช่วง (รวมปลายทั้งสองข้าง) — ช่วงที่ end < start มี 0 วัน */
export function rangeDays(range: DateRange): number {
  return Math.max(0, diffDays(range.start, range.end) + 1);
}

/** ทุกวันในช่วงเรียงจากเก่าไปใหม่ */
export function eachDay(range: DateRange): LocalDate[] {
  const out: LocalDate[] = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) out.push(day);
  return out;
}

/** ส่วนที่ซ้อนกันของสองช่วง หรือ null ถ้าไม่ซ้อนกัน */
export function intersectRange(a: DateRange, b: DateRange): DateRange | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start <= end ? { start, end } : null;
}

/** คีย์ของช่องกราฟที่วันที่นี้ตกอยู่ (ปี → 'YYYY-MM', อื่นๆ → วันที่) */
export function bucketKeyFor(period: Period, date: LocalDate): string {
  parts(date);
  return period === 'year' ? date.slice(0, 7) : date;
}

/**
 * ช่องกราฟแท่งของ period: วัน → 1 ช่อง, สัปดาห์ → 7 วัน, เดือน → ทุกวันของเดือน, ปี → 12 เดือน
 */
export function periodBuckets(period: Period, anchor: LocalDate, weekStart = 1): PeriodBucket[] {
  const range = periodRange(period, anchor, weekStart);
  if (period !== 'year') {
    return eachDay(range).map((day) => ({ key: day, start: day, end: day }));
  }
  const { y } = parts(anchor);
  return Array.from({ length: 12 }, (_, i) => ({
    key: `${pad(y, 4)}-${pad(i + 1)}`,
    start: format(y, i + 1, 1),
    end: format(y, i + 1, daysInMonth(y, i + 1)),
  }));
}
