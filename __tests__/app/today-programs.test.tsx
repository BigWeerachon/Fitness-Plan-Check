import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { dayOverrideRepo, weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { instantiateTemplate } from '@/features/programs/instantiate';
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
    fireEvent.press(await screen.findByTestId('setting-sets-inc'));
    fireEvent.press(screen.getByTestId('mode-linear'));
    fireEvent.press(screen.getByTestId('exercise-settings-save'));
    await flush();
    expect(routineExerciseRepo.listByRoutine(r.id)[0]).toMatchObject({ sets: 4, progressionMode: 'linear' });
  });
});
