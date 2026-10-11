import type { TFunction } from 'i18next';
import { parseLocalDate, type LocalDate } from '../../domain/dates';
import type { DateRange, Period } from '../../domain/periods';
import type { Metric, ProgramGroup, SessionSummary } from '../../domain/stats';
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

/** จำนวนท่า · เซ็ต · ปริมาณรวม ของเซสชัน — ท่า/เซ็ตใช้รูปเอกพจน์/พหูพจน์ที่ถูกต้อง ("1 exercise · 1 set") */
export function sessionLine(
  t: TFunction,
  s: Pick<SessionSummary, 'exercises' | 'sets' | 'volumeKg'>,
  unit: 'kg' | 'lb',
): string {
  return t('stats.sessionLine', {
    exercises: t('stats.exercisesCount', { count: s.exercises }),
    sets: t('stats.totalSets', { count: s.sets }),
    volume: formatNumber(displayWeight(s.volumeKg, unit)),
    unit: t(`common.units.${unit}`),
  });
}

/**
 * ป้ายของแต่ละกรุ๊ปที่แยกกันได้เสมอ (I5): กรุ๊ปที่ชื่อซ้ำกัน (เช่น 2 โปรแกรมจากเทมเพลตเดียวกัน) ต่อท้ายด้วยวันที่ฝึกล่าสุด
 * ถ้ายังซ้ำอีก (วันเดียวกัน) ต่อท้ายลำดับ (2), (3)… ตามลำดับที่ส่งเข้ามา — คืนค่าเป็น Map จาก group.key
 */
export function groupLabels(
  groups: readonly Pick<ProgramGroup, 'key' | 'programName' | 'lastDate'>[],
  noProgram: string,
  formatDate: (date: LocalDate) => string,
): Map<string, string> {
  const base = (g: Pick<ProgramGroup, 'programName'>) => g.programName ?? noProgram;
  const nameCount = new Map<string, number>();
  for (const g of groups) nameCount.set(base(g), (nameCount.get(base(g)) ?? 0) + 1);
  const withDate = groups.map((g) => ({
    key: g.key,
    label: (nameCount.get(base(g)) ?? 0) > 1 ? `${base(g)} · ${formatDate(g.lastDate)}` : base(g),
  }));
  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const { key, label } of withDate) {
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    labels.set(key, n > 1 ? `${label} (${n})` : label);
  }
  return labels;
}
