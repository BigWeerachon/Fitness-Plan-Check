import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { dayOverrideRepo, weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { startSession } from '@/features/session/sessionFlow';
import { loadToday } from '@/features/today/useToday';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => setClockForTests(null));

describe('Today (SPEC D)', () => {
  it('shows today’s routine with a Start button and lets the user change their mind for today only', async () => {
    await entitledApp(); // ศุกร์
    const program = instantiateTemplate('ppl3', 'en')!;
    renderRouter('./src/app', { initialUrl: '/' });
    await flush();
    // PPL 3 วัน: ศุกร์ = Legs
    expect(await screen.findByText('Today: Legs')).toBeTruthy();
    expect(screen.getByText(/5 exercises · ~\d+ min/)).toBeTruthy();
    const legs = routineRepo.listByProgram(program.id).find((r) => r.type === 'legs')!;
    // การ์ด: ชื่อกรุ๊ปและกลุ่มกล้ามเนื้อคนละบรรทัด (ไม่ถูกตัดทิ้ง) + ครั้งล่าสุด (D-2)
    expect(screen.getByTestId(`today-card-group-${legs.id}`)).toHaveTextContent(
      'Push / Pull / Legs (3 days)',
    );
    expect(screen.getByTestId(`today-card-muscles-${legs.id}`)).toHaveTextContent(/Quads/);
    expect(screen.getAllByText('Not done yet').length).toBeGreaterThan(0);
    const pull = routineRepo.listByProgram(program.id).find((r) => r.type === 'pull')!;
    // 1 แตะ: เปลี่ยนเป็น Pull เฉพาะวันนี้
    fireEvent.press(screen.getByTestId(`choose-${pull.id}`));
    expect(await screen.findByText('Today: Pull')).toBeTruthy();
    expect(screen.getByText('Changed for today only — your weekly plan is unchanged.')).toBeTruthy();
    // ตารางหลักไม่เปลี่ยน
    expect(weekPlanRepo.listForProgram(program.id).find((e) => e.routineId === pull.id)?.days).toEqual([3]);
    fireEvent.press(screen.getByTestId('today-rest'));
    expect(await screen.findByText('Rest day today')).toBeTruthy();
    fireEvent.press(screen.getByTestId('today-back-to-plan'));
    expect(await screen.findByText('Today: Legs')).toBeTruthy();
    expect(dayOverrideRepo.getForDate('2026-10-09')).toBeUndefined();
  });

  it('falls back to the weekly plan when today’s override points to a deleted routine', async () => {
    await entitledApp();
    const program = instantiateTemplate('ppl3', 'en')!;
    const push = routineRepo.listByProgram(program.id).find((r) => r.type === 'push')!;
    dayOverrideRepo.set('2026-10-09', 'routine', push.id);
    routineRepo.remove(push.id);
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Today: Legs')).toBeTruthy();
  });

  it('pluralizes the exercise count in the subtitle', async () => {
    await entitledApp();
    const p = programRepo.create('Solo');
    const r = routineRepo.create(p.id, 'Quick', 'other');
    routineExerciseRepo.add(r.id, 'barbell_bench_press', { sets: 3 });
    weekPlanRepo.ensureEntry(p.id, r.id, [5]);
    weekPlanRepo.setActiveProgram(p.id);
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText(/· 1 exercise · ~\d+ min$/)).toBeTruthy();
  });

  it('checks off muscles trained today', async () => {
    await entitledApp();
    const program = instantiateTemplate('ppl3', 'en')!;
    const legs = routineRepo.listByProgram(program.id).find((r) => r.type === 'legs')!;
    const { session } = startSession({ routineId: legs.id });
    const [first] = sessionRepo.sets(session.id);
    sessionRepo.updateSet(first.id, { weightKg: 60, reps: 8 });
    sessionRepo.setDone(first.id, true);
    expect(loadToday().doneMuscles).toEqual([first.muscleGroup]);
    expect(loadToday().plannedMuscles).toContain(first.muscleGroup);
  });

  it('starts the session from the round Start button', async () => {
    await entitledApp();
    const program = instantiateTemplate('ppl3', 'en')!;
    const legs = routineRepo.listByProgram(program.id).find((r) => r.type === 'legs')!;
    renderRouter('./src/app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId(`start-${legs.id}`));
    await flush();
    const active = sessionRepo.getActive()!;
    expect(active).toMatchObject({
      routineId: legs.id,
      routineName: 'Legs',
      programName: program.name,
      date: '2026-10-09',
    });
  });

  it('lets the user type calories burned (shown as manual) and eaten', async () => {
    await entitledApp();
    instantiateTemplate('ppl3', 'en');
    renderRouter('./src/app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId('today-kcal-burned'));
    for (const k of ['2', '4', '0', '0']) fireEvent.press(screen.getByTestId(`key-${k}`));
    fireEvent.press(screen.getByTestId('number-pad-done'));
    await flush();
    expect(await screen.findByText('Entered by you')).toBeTruthy();
    expect(dailyLogRepo.get('2026-10-09')?.kcalExpenditureOverride).toBe(2400);
    expect(screen.queryByText('From workouts')).toBeNull();

    // ยังไม่กรอกที่กิน → ป้ายอ่านออกเสียงบอกว่ายังไม่กรอก ไม่ใช่ขีดเปล่า (H4)
    expect(screen.getByTestId('today-kcal-eaten').props.accessibilityLabel).toBe(
      'Calories eaten today: Not entered',
    );
    fireEvent.press(screen.getByTestId('today-kcal-eaten'));
    for (const k of ['1', '8', '0', '0']) fireEvent.press(screen.getByTestId(`key-${k}`));
    fireEvent.press(screen.getByTestId('number-pad-done'));
    await flush();
    expect(dailyLogRepo.get('2026-10-09')?.kcalIntake).toBe(1800);
    expect(screen.getByTestId('today-kcal-eaten').props.accessibilityLabel).toBe(
      'Calories eaten today: 1,800 kcal',
    );

    // เมนู Today → "Use calculated value" ล้างค่าที่กรอกเอง กลับเป็นค่าที่คำนวณ
    fireEvent.press(screen.getByTestId('today-menu'));
    fireEvent.press(await screen.findByText('Use calculated value'));
    await flush();
    expect(dailyLogRepo.get('2026-10-09')?.kcalExpenditureOverride).toBeNull();
    expect(await screen.findByText('From workouts')).toBeTruthy();
    expect(dailyLogRepo.get('2026-10-09')?.kcalIntake).toBe(1800);
  });

  it('shows the health disclaimer under the calorie numbers (H5)', async () => {
    await entitledApp();
    instantiateTemplate('ppl3', 'en');
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('health-disclaimer')).toBeTruthy();
    expect(screen.getByTestId('disclaimer-sources')).toBeTruthy();
  });

  it('guides users without any program to the programs tab', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Let’s set up your plan')).toBeTruthy();
  });
});

describe('Programs, routines and the weekly plan (SPEC E, F)', () => {
  it('creates a program from a template and lists it with routine count', async () => {
    await entitledApp();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    renderRouter('./src/app', { initialUrl: '/program/templates' });
    fireEvent.press(await screen.findByTestId('use-template-upper_lower'));
    await flush();
    const [p] = programRepo.list();
    expect(p.templateKey).toBe('upper_lower');
    expect(routineRepo.count(p.id)).toBe(4);
    expect(weekPlanRepo.activeProgramId()).toBe(p.id);
  });

  it('weekly plan: tapping weekday letters toggles days and the switch disables a routine', async () => {
    await entitledApp();
    const program = instantiateTemplate('ppl3', 'en')!;
    const push = routineRepo.listByProgram(program.id).find((r) => r.type === 'push')!;
    renderRouter('./src/app', { initialUrl: '/week' });
    expect(await screen.findByTestId(`week-row-${push.id}`)).toBeTruthy();
    // แตะ พฤหัส (4) ในแถว Push
    const row = screen.getByTestId(`week-row-${push.id}`);
    const { within } = require('expo-router/testing-library');
    fireEvent.press(within(row).getByTestId('weekday-4'));
    await flush();
    const entry = () => weekPlanRepo.listForProgram(program.id).find((e) => e.routineId === push.id)!;
    expect(entry().days).toEqual([1, 4]);
    fireEvent(screen.getByTestId(`week-toggle-${push.id}`), 'valueChange', false);
    await flush();
    expect(entry().enabled).toBe(false);
  });

  it('weekly plan: copies a day and switches the whole week to another program', async () => {
    await entitledApp(); // ศุกร์
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const ppl = instantiateTemplate('ppl3', 'en')!;
    const fb = instantiateTemplate('full_body3', 'en')!;
    weekPlanRepo.setActiveProgram(ppl.id);
    const push = routineRepo.listByProgram(ppl.id).find((r) => r.type === 'push')!;
    renderRouter('./src/app', { initialUrl: '/week' });
    fireEvent.press(await screen.findByTestId('week-copy'));
    fireEvent.press(await screen.findByTestId('copy-from-1'));
    fireEvent.press(screen.getByTestId('copy-to-2'));
    fireEvent.press(screen.getByTestId('copy-confirm'));
    await flush();
    // อังคารได้ Push เหมือนวันจันทร์ และ routine อื่นไม่มีวันอังคาร
    const entries = weekPlanRepo.listForProgram(ppl.id);
    expect(entries.find((e) => e.routineId === push.id)?.days).toEqual([1, 2]);
    expect(entries.filter((e) => e.days.includes(2)).map((e) => e.routineId)).toEqual([push.id]);

    fireEvent.press(screen.getByTestId(`week-program-${fb.id}`));
    await flush();
    expect(weekPlanRepo.activeProgramId()).toBe(fb.id);
    expect(loadToday().program?.id).toBe(fb.id);
  });

  it('back-fills a past day with a routine (snapshots group/routine) or an empty session', async () => {
    await entitledApp(); // ศุกร์ 9 ต.ค.
    const program = instantiateTemplate('ppl3', 'en')!;
    const pull = routineRepo.listByProgram(program.id).find((r) => r.type === 'pull')!;
    renderRouter('./src/app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId('today-menu'));
    fireEvent.press(await screen.findByTestId('log-past-1'));
    // เลือก routine ของวันที่ย้อนหลัง
    fireEvent.press(await screen.findByTestId(`log-past-routine-${pull.id}`));
    await flush();
    const active = sessionRepo.getActive()!;
    expect(active).toMatchObject({
      date: '2026-10-08',
      backfilled: true,
      routineId: pull.id,
      routineName: 'Pull',
      programName: 'Push / Pull / Legs (3 days)',
      routineType: 'pull',
    });
    expect(sessionRepo.exercises(active.id).length).toBeGreaterThan(0);
  });

  it('back-fill offers an empty session too', async () => {
    await entitledApp();
    instantiateTemplate('ppl3', 'en');
    renderRouter('./src/app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId('today-menu'));
    fireEvent.press(await screen.findByTestId('log-past-2'));
    fireEvent.press(await screen.findByTestId('log-past-empty'));
    await flush();
    expect(sessionRepo.getActive()).toMatchObject({ date: '2026-10-07', backfilled: true, routineId: null });
  });

  it('routine editor: adds exercises from the library and edits progression settings', async () => {
    await entitledApp();
    const p = programRepo.create('Mine');
    const r = routineRepo.create(p.id, 'Push A', 'push');
    renderRouter('./src/app', { initialUrl: `/routine/${r.id}` });
    fireEvent.press(await screen.findByTestId('routine-add-exercise'));
    fireEvent.changeText(await screen.findByTestId('exercise-search'), 'bench press');
    fireEvent.press(await screen.findByTestId('ex-barbell_bench_press'));
    fireEvent.press(screen.getByTestId('exercises-add-selected'));
    await flush();
    expect(routineExerciseRepo.listByRoutine(r.id).map((e) => e.exerciseId)).toEqual(['barbell_bench_press']);
    fireEvent.press(await screen.findByTestId('rex-barbell_bench_press'));
    fireEvent.press(await screen.findByTestId('setting-sets-inc', { includeHiddenElements: true }));
    fireEvent.press(screen.getByTestId('mode-linear'));
    fireEvent.press(screen.getByTestId('exercise-settings-save'));
    await flush();
    expect(routineExerciseRepo.listByRoutine(r.id)[0]).toMatchObject({ sets: 4, progressionMode: 'linear' });
  });
});
