/* eslint-disable import/no-named-as-default-member -- ใช้ instance ของ i18next โดยตรง */
import i18n from './index';

/**
 * การจัดรูปแบบวันที่/ตัวเลขแบบกำหนดเอง (ไม่พึ่ง Intl ของแต่ละเครื่อง ผลลัพธ์จึงเหมือนกันทุกแพลตฟอร์มและเทสต์ได้)
 * ภาษาไทยแสดงปี พ.ศ.
 */

function arr(key: string): string[] {
  return i18n.t(key, { returnObjects: true }) as unknown as string[];
}

function displayYear(year: number): number {
  return year + Number(i18n.t('date.yearOffset'));
}

/** ลำดับวันในสัปดาห์เริ่มจากวันเริ่มต้นที่ตั้งไว้ (0 = อาทิตย์, 1 = จันทร์) */
export function weekOrder(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

export function weekdayShort(day: number): string {
  return arr('date.weekdaysShort')[day];
}

export function weekdayMedium(day: number): string {
  return arr('date.weekdaysMedium')[day];
}

export function weekdayLong(day: number): string {
  return arr('date.weekdaysLong')[day];
}

export function monthShort(month: number): string {
  return arr('date.monthsShort')[month];
}

export function monthLong(month: number): string {
  return arr('date.monthsLong')[month];
}

/** "พฤ. 9 ต.ค." / "Thu, Oct 9" (ใส่ปีถ้าไม่ใช่ปีปัจจุบัน) */
export function formatDateShort(d: Date, now: Date = new Date()): string {
  const wd = weekdayMedium(d.getDay());
  const mo = monthShort(d.getMonth());
  const year = d.getFullYear() !== now.getFullYear() ? displayYear(d.getFullYear()) : null;
  if (i18n.language === 'th') return `${wd} ${d.getDate()} ${mo}${year ? ` ${year}` : ''}`;
  return `${wd}, ${mo} ${d.getDate()}${year ? `, ${year}` : ''}`;
}

/** "9 ต.ค. 2569" / "Oct 9, 2026" */
export function formatDateLong(d: Date): string {
  const mo = monthShort(d.getMonth());
  const year = displayYear(d.getFullYear());
  return i18n.language === 'th' ? `${d.getDate()} ${mo} ${year}` : `${mo} ${d.getDate()}, ${year}`;
}

/** "ตุลาคม 2569" / "October 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${monthLong(month)} ${displayYear(year)}`;
}

export function formatYear(year: number): string {
  return String(displayYear(year));
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** ตัวเลขพร้อมตัวคั่นหลักพัน และทศนิยมไม่เกินที่กำหนด (ตัดศูนย์ท้าย) */
export function formatNumber(value: number, maxDecimals = 0): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  const [int, dec] = Math.abs(rounded).toFixed(maxDecimals).split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const trimmed = dec ? dec.replace(/0+$/, '') : '';
  return `${rounded < 0 ? '-' : ''}${withSep}${trimmed ? `.${trimmed}` : ''}`;
}

export function formatDuration(totalSec: number): string {
  const totalMin = Math.max(0, Math.round(totalSec / 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? i18n.t('date.durationHm', { h, m }) : i18n.t('date.durationM', { m });
}

/** "วันนี้" / "เมื่อวาน" / "3 วันที่แล้ว" / วันที่ */
export function formatRelativeDay(d: Date, now: Date = new Date()): string {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((today - day) / 86_400_000);
  if (diff === 0) return i18n.t('date.today');
  if (diff === 1) return i18n.t('date.yesterday');
  if (diff > 1 && diff < 7) return i18n.t('date.daysAgo', { count: diff });
  if (diff >= 7 && diff < 28) return i18n.t('date.weeksAgo', { count: Math.floor(diff / 7) });
  return formatDateShort(d, now);
}
