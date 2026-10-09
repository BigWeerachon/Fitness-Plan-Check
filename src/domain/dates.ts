/**
 * วันที่แบบท้องถิ่น (ไม่มีเวลา) ในรูป 'YYYY-MM-DD' — ใช้เป็นคีย์ของวันในตาราง/บันทึก/สถิติ
 * ทุกฟังก์ชันเป็นฟังก์ชันล้วน ทำงานตามเขตเวลาของเครื่อง
 */

export type LocalDate = string;

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDate(d: Date | number): LocalDate {
  const x = typeof d === 'number' ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isLocalDate(value: string): value is LocalDate {
  const m = RE.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return (
    d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])
  );
}

/** เที่ยงคืนตามเวลาท้องถิ่นของวันนั้น */
export function parseLocalDate(value: LocalDate): Date {
  const m = RE.exec(value);
  if (!m) throw new Error(`Invalid local date: ${value}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

/** 0 = อาทิตย์ … 6 = เสาร์ */
export function weekdayOf(value: LocalDate): number {
  return parseLocalDate(value).getDay();
}

/** จำนวนวันจาก a ถึง b (b − a) ไม่ขึ้นกับการปรับเวลาออมแสง */
export function diffDays(a: LocalDate, b: LocalDate): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round(
    (Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
      Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) /
      86_400_000,
  );
}

/** วันแรกของสัปดาห์ที่มีวันนี้อยู่ ตามวันเริ่มต้นสัปดาห์ (1 = จันทร์, 0 = อาทิตย์) */
export function startOfWeek(value: LocalDate, weekStart: number): LocalDate {
  const wd = weekdayOf(value);
  const back = (wd - weekStart + 7) % 7;
  return addDays(value, -back);
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
