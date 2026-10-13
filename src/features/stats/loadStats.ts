import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { profileRepo } from '../../db/repos/profileRepo';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { DailyLog, SessionSet, WeightUnit, WorkoutSession } from '../../db/schema';
import { DEFAULT_WEEK_START, toLocalDate, type LocalDate } from '../../domain/dates';
import { nutritionSummary, type NutritionSummary } from '../../domain/nutrition';
import type { StatsData } from '../../domain/stats';
import { now } from '../../utils/clock';

export interface StatsModel {
  data: StatsData & { sessions: WorkoutSession[]; sets: SessionSet[] };
  dailyLogs: DailyLog[];
  unit: WeightUnit;
  weekStart: number;
  today: LocalDate;
  nutrition: NutritionSummary | null;
  currentWeightKg: number | null;
}

// SQLite จำกัดจำนวนตัวแปรต่อคำสั่ง จึงดึงเซ็ตทีละชุด
const CHUNK = 500;

/** โหลดข้อมูลทั้งหมดที่หน้าสถิติใช้จากฐานข้อมูลในเครื่อง (คำนวณต่อด้วยฟังก์ชันล้วนใน domain/stats) */
export function loadStats(): StatsModel {
  const profile = profileRepo.get();
  const sessions = sessionRepo.listCompleted();
  const ids = sessions.map((s) => s.id);
  const sets: SessionSet[] = [];
  for (let i = 0; i < ids.length; i += CHUNK)
    sets.push(...sessionRepo.setsForSessions(ids.slice(i, i + CHUNK)));
  return {
    data: { sessions, sets },
    dailyLogs: dailyLogRepo.listAll(),
    unit: profile?.weightUnit ?? 'kg',
    weekStart: profile?.weekStart ?? DEFAULT_WEEK_START,
    today: toLocalDate(now()),
    nutrition: profile ? nutritionSummary(profile) : null,
    currentWeightKg: profile?.weightKg ?? null,
  };
}
