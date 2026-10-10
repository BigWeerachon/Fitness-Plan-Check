import type { LocalDate } from '../../domain/dates';
import { periodRange, type DateRange, type Period } from '../../domain/periods';
import {
  bodyWeightTrend,
  byMuscle,
  byProgram,
  byRoutineType,
  energySummary,
  groupFilterOf,
  programGroups,
  selectStatsData,
  sessionSummaries,
  strengthSeries,
  type Breakdown,
  type EnergySummary,
  type GroupFilter,
  type Metric,
  type MuscleShare,
  type ProgramGroup,
  type ProgramShare,
  type RoutineTypeShare,
  type SessionSummary,
  type StrengthPoint,
  type WeightPoint,
} from '../../domain/stats';
import type { Macros } from '../../domain/nutrition';
import type { StatsModel } from './loadStats';

export type StatsViewKind = 'program' | 'routineType' | 'muscle';
export const STATS_VIEWS: readonly StatsViewKind[] = ['program', 'routineType', 'muscle'];

export interface StatsSelection {
  period: Period;
  anchor: LocalDate;
  metric: Metric;
  view: StatsViewKind;
  /** คีย์กรุ๊ปที่เลือก (programKey) — null = ทุกกรุ๊ป */
  groupKey: string | null;
}

export type BreakdownView =
  | { view: 'program'; breakdown: Breakdown<ProgramShare> }
  | { view: 'routineType'; breakdown: Breakdown<RoutineTypeShare> }
  | { view: 'muscle'; breakdown: Breakdown<MuscleShare> }
  /** มุมมองประเภท routine ต้องเลือกกรุ๊ปก่อน (I2 ข้อ 2) */
  | { view: 'needsGroup' };

export interface StrengthItem {
  exerciseId: string;
  best: StrengthPoint;
}

export interface StatsView {
  range: DateRange;
  groups: ProgramGroup[];
  group: ProgramGroup | null;
  breakdown: BreakdownView;
  sessions: SessionSummary[];
  energy: EnergySummary<Macros>;
  weight: WeightPoint[];
  strength: StrengthItem[];
}

/** รวมผลคำนวณทั้งหมดของหน้าสถิติจากข้อมูลในเครื่อง + ตัวเลือกบนหน้าจอ (ตัวสลับช่วงเวลาตัวเดียวใช้ทั้งหน้า) */
export function buildStatsView(model: StatsModel, sel: StatsSelection): StatsView {
  const range = periodRange(sel.period, sel.anchor, model.weekStart);
  const groups = programGroups(model.data);
  const selected = sel.groupKey ? (groups.find((g) => g.key === sel.groupKey) ?? null) : null;
  // มีกรุ๊ปเดียว → มุมมองประเภท routine ใช้กรุ๊ปนั้นได้เลยโดยไม่ต้องเลือก
  const routineTypeGroup = selected ?? (groups.length === 1 ? groups[0] : null);
  const groupFilter: GroupFilter | null = selected ? groupFilterOf(selected) : null;
  const options = { metric: sel.metric, range, group: groupFilter };

  let breakdown: BreakdownView;
  if (sel.view === 'program') breakdown = { view: 'program', breakdown: byProgram(model.data, options) };
  else if (sel.view === 'muscle') breakdown = { view: 'muscle', breakdown: byMuscle(model.data, options) };
  else if (routineTypeGroup)
    breakdown = {
      view: 'routineType',
      breakdown: byRoutineType(model.data, { ...options, group: groupFilterOf(routineTypeGroup) }),
    };
  else breakdown = { view: 'needsGroup' };

  const { setsBySession } = selectStatsData(model.data, { range, group: groupFilter });
  const exerciseIds = new Set<string>();
  for (const sets of setsBySession.values()) {
    for (const s of sets) if (s.weightKg != null && s.weightKg > 0) exerciseIds.add(s.exerciseId);
  }
  const strength: StrengthItem[] = [];
  for (const exerciseId of exerciseIds) {
    const series = strengthSeries(model.data, exerciseId, { range, group: groupFilter });
    if (series.length === 0) continue;
    const best = series.reduce((a, b) => (b.e1rmKg > a.e1rmKg ? b : a));
    strength.push({ exerciseId, best });
  }
  strength.sort((a, b) => b.best.e1rmKg - a.best.e1rmKg || (a.exerciseId < b.exerciseId ? -1 : 1));

  const n = model.nutrition;
  return {
    range,
    groups,
    group: selected,
    breakdown,
    sessions: sessionSummaries(model.data, { range, group: groupFilter }),
    energy: energySummary<Macros>(
      { sessions: model.data.sessions, dailyLogs: model.dailyLogs },
      {
        period: sel.period,
        anchor: sel.anchor,
        weekStart: model.weekStart,
        tdee: n?.tdee ?? null,
        targetKcal: n?.target.kcal ?? null,
        macrosPerDay: n?.macros ?? null,
        today: model.today,
      },
    ),
    weight: bodyWeightTrend(model.dailyLogs, range),
    strength,
  };
}
