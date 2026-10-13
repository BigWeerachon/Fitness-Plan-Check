import type { TFunction } from 'i18next';
import type { WeightUnit } from '../../db/schema';
import { parseLocalDate, type LocalDate } from '../../domain/dates';
import { PERIODS, type DateRange, type Period } from '../../domain/periods';
import type { Metric, ProgramGroup, SessionSummary } from '../../domain/stats';
import { displayWeight } from '../../domain/units';
import { formatDateShort, formatMonthYear, formatNumber, formatYear } from '../../i18n/format';
import type { ShareItem } from './charts';
import type { BreakdownView } from './statsView';

/** ข้อความช่วงเวลาที่กำลังดู เช่น "6–12 ต.ค." / "ตุลาคม 2569" */
export function periodLabel(period: Period, range: DateRange, today: LocalDate): string {
  const start = parseLocalDate(range.start);
  const todayDate = parseLocalDate(today);
  if (period === 'day') return formatDateShort(start, todayDate);
  if (period === 'week')
    return `${formatDateShort(start, todayDate)} – ${formatDateShort(parseLocalDate(range.end), todayDate)}`;
  if (period === 'month') return formatMonthYear(start.getFullYear(), start.getMonth());
  return formatYear(start.getFullYear());
}

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * อ่านช่วงเวลาที่แท็บสถิติส่งมาทาง query (from/to เป็น YYYY-MM-DD ครบทั้งคู่จึงถือเป็นช่วง, period ต้องเป็นค่าที่รู้จัก)
 * ค่าที่ไม่ถูกต้อง = ไม่กรองช่วงเวลา
 */
export function parseRangeParams(params: { from?: string; to?: string; period?: string }): {
  range: DateRange | null;
  period: Period | undefined;
} {
  const { from, to } = params;
  const range = from && to && DATE_PARAM.test(from) && DATE_PARAM.test(to) ? { start: from, end: to } : null;
  const period = PERIODS.find((x) => x === params.period);
  return { range, period };
}

/** ข้อความช่วงเวลาที่กรองอยู่: รู้ period = ป้ายของ period, ไม่รู้ = "วันเริ่ม – วันสิ้นสุด"; ไม่มีช่วง = null */
export function rangeText(
  range: DateRange | null,
  period: Period | undefined,
  todayKey: LocalDate,
): string | null {
  if (!range) return null;
  if (period) return periodLabel(period, range, todayKey);
  const today = parseLocalDate(todayKey);
  return `${formatDateShort(parseLocalDate(range.start), today)} – ${formatDateShort(parseLocalDate(range.end), today)}`;
}

/** ค่าของตัวชี้วัดในรูปที่อ่านง่าย (ปริมาณรวมแปลงเป็นหน่วยที่ผู้ใช้เลือก) */
export function metricValueLabel(t: TFunction, metric: Metric, value: number, unit: WeightUnit): string {
  if (metric === 'sets') return t('stats.totalSets', { count: value });
  if (metric === 'sessions') return t('stats.totalSessions', { count: value });
  return t('stats.totalVolume', {
    volume: formatNumber(displayWeight(value, unit)),
    unit: t(`common.units.${unit}`),
  });
}

export function metricShortValue(metric: Metric, value: number, unit: WeightUnit): string {
  return formatNumber(metric === 'volume' ? displayWeight(value, unit) : value);
}

/** จำนวนท่า · เซ็ต · ปริมาณรวม ของเซสชัน — ท่า/เซ็ตใช้รูปเอกพจน์/พหูพจน์ที่ถูกต้อง ("1 exercise · 1 set") */
export function sessionLine(
  t: TFunction,
  s: Pick<SessionSummary, 'exercises' | 'sets' | 'volumeKg'>,
  unit: WeightUnit,
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
  const baseNameOf = (g: Pick<ProgramGroup, 'programName'>) => g.programName ?? noProgram;
  const nameCount = new Map<string, number>();
  for (const g of groups) nameCount.set(baseNameOf(g), (nameCount.get(baseNameOf(g)) ?? 0) + 1);
  const dateDisambiguated = groups.map((g) => ({
    key: g.key,
    label:
      (nameCount.get(baseNameOf(g)) ?? 0) > 1
        ? `${baseNameOf(g)} · ${formatDate(g.lastDate)}`
        : baseNameOf(g),
  }));
  const occurrencesOfLabel = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const { key, label } of dateDisambiguated) {
    const n = (occurrencesOfLabel.get(label) ?? 0) + 1;
    occurrencesOfLabel.set(label, n);
    labels.set(key, n > 1 ? `${label} (${n})` : label);
  }
  return labels;
}

/**
 * รายการสัดส่วนสำหรับกราฟโดนัท/แท่ง จากผลแยกสัดส่วนของมุมมองนั้น พร้อมผลรวม
 * คืน null เมื่อมุมมองยังต้องเลือกกรุ๊ปก่อน (needsGroup)
 */
export function buildShareItems(
  breakdown: BreakdownView,
  ctx: {
    t: TFunction;
    metric: Metric;
    unit: WeightUnit;
    chartColors: readonly string[];
    /** ป้ายของกรุ๊ปตาม key (ชื่อซ้ำถูกแยกแล้ว) */
    groupLabel: (key: string, programName: string | null) => string;
  },
): { items: ShareItem[]; total: number } | null {
  const toItems = <E extends { key: string; value: number; percent: number }>(
    entries: readonly E[],
    labelOf: (entry: E) => string,
  ): ShareItem[] =>
    entries.map((e, i) => ({
      key: e.key,
      label: labelOf(e),
      value: e.value,
      percent: e.percent,
      valueLabel: metricValueLabel(ctx.t, ctx.metric, e.value, ctx.unit),
      color: ctx.chartColors[i % ctx.chartColors.length],
    }));
  switch (breakdown.view) {
    case 'needsGroup':
      return null;
    case 'program': {
      const { entries, total } = breakdown.breakdown;
      return { items: toItems(entries, (e) => ctx.groupLabel(e.key, e.programName)), total };
    }
    case 'routineType': {
      const { entries, total } = breakdown.breakdown;
      return { items: toItems(entries, (e) => ctx.t(`programs.types.${e.key}`)), total };
    }
    case 'muscle': {
      const { entries, total } = breakdown.breakdown;
      return { items: toItems(entries, (e) => ctx.t(`exercises.muscles.${e.key}`)), total };
    }
  }
}
