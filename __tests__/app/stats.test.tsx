import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { finishSession } from '@/features/session/finish';
import { startSession } from '@/features/session/sessionFlow';
import { loadStats } from '@/features/stats/loadStats';
import { buildStatsView } from '@/features/stats/statsView';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

/** ทำเซสชันให้จบ: ติ๊กเซ็ตแรก n เซ็ตของทุกท่าด้วยน้ำหนัก/ครั้งที่กำหนด */
function completeRoutine(routineId: string, date: string, setsPerExercise: number, weightKg = 50, reps = 10) {
  const { session } = startSession({ routineId, date });
  for (const e of sessionRepo.exercises(session.id)) {
    sessionRepo
      .setsOf(e.id)
      .slice(0, setsPerExercise)
      .forEach((s) => {
        sessionRepo.updateSet(s.id, { weightKg, reps });
        sessionRepo.setDone(s.id, true);
      });
  }
  finishSession(session.id, 'moderate', 3600);
  return session.id;
}

function percentSum() {
  return screen
    .getAllByTestId(/^share-percent-/)
    .map((n) => Number(String(n.props.children).replace('%', '')))
    .reduce((a, b) => a + b, 0);
}

describe('stats (SPEC I1–I5)', () => {
  it('shows breakdowns that always sum to 100%, from snapshots, with group filter, history, and delete', async () => {
    await entitledApp();
    profileRepo.update({ weightKg: 70 });
    const ppl = instantiateTemplate('ppl3', 'en')!;
    const ul = instantiateTemplate('upper_lower', 'en', { activate: false })!;
    const [push, pull] = ['push', 'pull'].map((type) =>
      routineRepo.listByProgram(ppl.id).find((r) => r.type === type)!,
    );
    const upper = routineRepo.listByProgram(ul.id).find((r) => r.type === 'upper')!;
    completeRoutine(push.id, '2026-10-05', 1);
    completeRoutine(pull.id, '2026-10-06', 2);
    const upperSession = completeRoutine(upper.id, '2026-10-07', 1);

    // เปลี่ยนชื่อกรุ๊ปภายหลัง → สถิติยังใช้ชื่อเดิมจาก snapshot (F6/M)
    programRepo.rename(ppl.id, 'Renamed PPL');

    renderRouter('./src/app', { initialUrl: '/stats' });
    expect(await screen.findByTestId('stats')).toBeTruthy();
    expect(screen.getByTestId('stats-period').props.children).toBe('Mon, Oct 5 – Sun, Oct 11');

    // มุมมองตามกรุ๊ป: ชื่อจาก snapshot และ % รวม 100
    const pplShare = screen.getByTestId(`share-${ppl.id}`);
    expect(within(pplShare).getByText('Push / Pull / Legs (3 days)')).toBeTruthy();
    expect(screen.queryByText('Renamed PPL')).toBeNull();
    expect(percentSum()).toBe(100);

    // สลับตัวชี้วัดเป็นจำนวนเซสชัน: PPL 2 / UL 1 → 67% / 33%
    fireEvent.press(screen.getByTestId('segment-sessions'));
    await flush();
    expect(screen.getByTestId(`share-percent-${ppl.id}`).props.children).toBe('67%');
    expect(screen.getByTestId(`share-percent-${ul.id}`).props.children).toBe('33%');
    expect(percentSum()).toBe(100);

    // มุมมองประเภท routine ต้องเลือกกรุ๊ปก่อน (มีมากกว่า 1 กรุ๊ป)
    fireEvent.press(screen.getByTestId('segment-routineType'));
    await flush();
    expect(screen.getByTestId('stats-needs-group')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`group-${ppl.id}`));
    await flush();
    expect(screen.getByTestId('share-percent-push').props.children).toBe('50%');
    expect(screen.getByTestId('share-percent-pull').props.children).toBe('50%');
    expect(screen.queryByTestId('share-upper')).toBeNull();

    // มุมมองกล้ามเนื้อ ทุกกรุ๊ป ตัวชี้วัดเซ็ต
    fireEvent.press(screen.getByTestId('group-all'));
    fireEvent.press(screen.getByTestId('segment-muscle'));
    fireEvent.press(screen.getByTestId('segment-sets'));
    await flush();
    expect(screen.getAllByTestId(/^share-percent-/).length).toBeGreaterThan(2);
    expect(percentSum()).toBe(100);

    // ประวัติแสดงชื่อกรุ๊ปเสมอ → แตะดูรายละเอียด → ลบ
    expect(screen.getByTestId(`stats-session-${upperSession}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId(`stats-session-${upperSession}`));
    expect(await screen.findByTestId('history-detail')).toBeTruthy();
    expect(screen.getByText(/Upper \/ Lower \(4 days\)/)).toBeTruthy();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    fireEvent.press(screen.getByTestId('history-delete'));
    await flush();
    expect(sessionRepo.get(upperSession)).toBeUndefined();
  });

  it('browses periods, shows empty state, energy vs TDEE, and logs body weight', async () => {
    await entitledApp();
    profileRepo.update({
      sex: 'male',
      age: 30,
      heightCm: 175,
      weightKg: 70,
      activityLevel: 'moderate',
      goal: 'maintain',
    });
    const ppl = instantiateTemplate('ppl3', 'en')!;
    const legs = routineRepo.listByProgram(ppl.id).find((r) => r.type === 'legs')!;
    completeRoutine(legs.id, '2026-10-09', 2, 100, 5);
    dailyLogRepo.upsert('2026-10-09', { kcalIntake: 2400 });
    dailyLogRepo.upsert('2026-10-01', { bodyWeightKg: 71 });

    renderRouter('./src/app', { initialUrl: '/stats' });
    expect(await screen.findByTestId('stats')).toBeTruthy();
    // ช่วงล่าสุด → ปุ่มถัดไปถูกปิด
    expect(screen.getByTestId('stats-next').props.accessibilityState).toMatchObject({ disabled: true });

    // สัปดาห์นี้มีพลังงานจากออกกำลังกาย + ที่กิน + TDEE × จำนวนวันที่ผ่านมา (จ.–ศ. = 5 วัน)
    const tdee = loadStats().nutrition!.tdee;
    expect(
      within(screen.getByTestId('energy-tdee')).getByText(`${(tdee * 5).toLocaleString('en-US')} kcal`),
    ).toBeTruthy();
    expect(screen.getByText('2,400 kcal · 1 day entered')).toBeTruthy();

    // ความแข็งแรง: Epley 100 × (1 + 5/30) = 116.7
    expect(
      within(screen.getByTestId('strength-back_squat')).getByText('Best 116.7 kg (100 × 5)'),
    ).toBeTruthy();

    // ย้อนไปสัปดาห์ก่อน → ว่าง
    fireEvent.press(screen.getByTestId('stats-prev'));
    await flush();
    expect(screen.getByText('No workouts in this period')).toBeTruthy();
    expect(screen.getByTestId('stats-next').props.accessibilityState).toMatchObject({ disabled: false });

    // เดือน (ยึดวันเดิม 2 ต.ค.) → ย้อน/ไปข้างหน้า; ต.ค. มีน้ำหนัก 1 จุด (1 ต.ค.)
    fireEvent.press(screen.getByTestId('segment-month'));
    await flush();
    expect(screen.getByTestId('stats-period').props.children).toBe('October 2026');
    fireEvent.press(screen.getByTestId('stats-prev'));
    await flush();
    expect(screen.getByTestId('stats-period').props.children).toBe('September 2026');
    fireEvent.press(screen.getByTestId('stats-next'));
    await flush();
    expect(screen.getByTestId('stats-period').props.children).toBe('October 2026');
    expect(screen.getByTestId('stats-latest-weight').props.children).toBe('Latest: 71 kg on Thu, Oct 1');

    // บันทึกน้ำหนักวันนี้ → daily_log + โปรไฟล์
    fireEvent.press(screen.getByTestId('stats-log-weight'));
    fireEvent.press(await screen.findByTestId('key-⌫'));
    fireEvent.press(screen.getByTestId('key-⌫'));
    for (const k of '69.5') fireEvent.press(screen.getByTestId(`key-${k}`));
    fireEvent.press(screen.getByTestId('number-pad-done'));
    await flush();
    expect(dailyLogRepo.get('2026-10-09')).toMatchObject({ bodyWeightKg: 69.5, kcalIntake: 2400 });
    expect(profileRepo.get()?.weightKg).toBe(69.5);
    expect(screen.getByTestId('stats-latest-weight').props.children).toBe('Latest: 69.5 kg on Fri, Oct 9');

    // กราฟความแข็งแรงต่อท่า
    fireEvent.press(screen.getByTestId('strength-back_squat'));
    expect(await screen.findByTestId('exercise-strength')).toBeTruthy();
    expect(screen.getByTestId('strength-best').props.children).toBe('Best 116.7 kg (100 × 5)');
    expect(screen.getByTestId('strength-point-2026-10-09')).toBeTruthy();
  });

  it('auto-uses the only group for the routine-type view and keeps percentages exact', async () => {
    await entitledApp();
    const ppl = instantiateTemplate('ppl3', 'en')!;
    const routines = routineRepo.listByProgram(ppl.id);
    for (const [i, r] of routines.entries()) completeRoutine(r.id, `2026-10-0${5 + i}`, 1);
    const model = loadStats();
    const v = buildStatsView(model, {
      period: 'week',
      anchor: '2026-10-09',
      metric: 'sessions',
      view: 'routineType',
      groupKey: null,
    });
    expect(v.breakdown.view).toBe('routineType');
    if (v.breakdown.view !== 'routineType') return;
    // 3 เซสชัน → 33/33/34 (largest remainder, รวม 100)
    const percents = v.breakdown.breakdown.entries.map((e) => e.percent).sort();
    expect(percents).toEqual([33, 33, 34]);
    expect(v.sessions).toHaveLength(3);
    expect(v.sessions.every((s) => s.programName === 'Push / Pull / Legs (3 days)')).toBe(true);
  });
});
