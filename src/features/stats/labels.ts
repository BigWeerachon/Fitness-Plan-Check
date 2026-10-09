import type { TFunction } from 'i18next';
import { parseLocalDate, type LocalDate } from '../../domain/dates';
import type { DateRange, Period } from '../../domain/periods';
import type { Metric } from '../../domain/stats';
import { displayWeight } from '../../domain/units';
import { formatDateShort, formatMonthYear, formatNumber, formatYear } from '../../i18n/format';

/** ข้อความช่วงเวลาที่กำลังดู เช่น "6–12 ต.ค." / "ตุลาคม 2569" */
export function periodLabel(period: Period, range: DateRange, today: LocalDate): string {
  const start = parseLocalDate(range.start);
  const now = parseLocalDate(today);
  if (period === 'day') return formatDateShort(start, now);
  if (period === 'week')
    return `${formatDateShort(start, now)} – ${formatDateShort(parseLocalDate(range.end), now)}`;
  if (period === 'month') return formatMonthYear(start.getFullYear(), start.getMonth());
  return formatYear(start.getFullYear());
}

/** ค่าของตัวชี้วัดในรูปที่อ่านง่าย (ปริมาณรวมแปลงเป็นหน่วยที่ผู้ใช้เลือก) */
export function metricValueLabel(t: TFunction, metric: Metric, value: number, unit: 'kg' | 'lb'): string {
  if (metric === 'sets') return t('stats.totalSets', { count: value });
  if (metric === 'sessions') return t('stats.totalSessions', { count: value });
  return t('stats.totalVolume', {
    volume: formatNumber(displayWeight(value, unit)),
    unit: t(`common.units.${unit}`),
  });
}

export function metricShortValue(metric: Metric, value: number, unit: 'kg' | 'lb'): string {
  return formatNumber(metric === 'volume' ? displayWeight(value, unit) : value);
}
