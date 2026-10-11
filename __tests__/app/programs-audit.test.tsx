import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { customExerciseRepo } from '@/db/repos/customExerciseRepo';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { MUSCLE_GROUPS } from '@/data/exerciseLibrary';
import { MUSCLE_ICON } from '@/data/muscleIcons';
import { loadPrograms } from '@/features/programs/usePrograms';
import { startSession } from '@/features/session/sessionFlow';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

describe('Program detail (SPEC F2, F3)', () => {
  it('does not carry the rename text into the add-routine sheet', async () => {
    await entitledApp();
    const p = programRepo.create('Strength block');
    renderRouter('./src/app', { initialUrl: `/program/${p.id}` });
    fireEvent.press(await screen.findByTestId('program-menu'));
    fireEvent.press(await screen.findByTestId('program-rename'));
    expect((await screen.findByTestId('program-rename-input')).props.value).toBe('Strength block');
    // ปิดโดยไม่บันทึก แล้วเปิดเพิ่ม routine: ช่องชื่อต้องว่าง
    fireEvent.changeText(screen.getByTestId('program-rename-input'), 'Edited but not saved');
    fireEvent.press(screen.getByTestId('program-add-routine'));
    expect((await screen.findByTestId('routine-name')).props.value).toBe('');
    expect(programRepo.get(p.id)?.name).toBe('Strength block');
  });

  it('renames the program with its own state', async () => {
    await entitledApp();
    const p = programRepo.create('Old');
    renderRouter('./src/app', { initialUrl: `/program/${p.id}` });
    fireEvent.press(await screen.findByTestId('program-menu'));
    fireEvent.press(await screen.findByTestId('program-rename'));
    fireEvent.changeText(await screen.findByTestId('program-rename-input'), 'New name');
    fireEvent.press(screen.getByTestId('program-rename-save'));
    await flush();
    expect(programRepo.get(p.id)?.name).toBe('New name');
  });

  it('shows a program card with workout count and last date after a completed session (F2)', async () => {
    await entitledApp();
    const p = programRepo.create('Cards');
    const r = routineRepo.create(p.id, 'Push', 'push');
    routineExerciseRepo.add(r.id, 'barbell_bench_press', { sets: 2 });
    expect(loadPrograms().cards[0]).toMatchObject({ sessionCount: 0, lastDate: null });
    const { session } = startSession({ routineId: r.id });
    sessionRepo.finish(session.id, { intensity: 'moderate', kcal: 200, durationSec: 1800 });
    expect(loadPrograms().cards[0]).toMatchObject({
      routineCount: 1,
      sessionCount: 1,
      lastDate: '2026-10-09',
    });
    renderRouter('./src/app', { initialUrl: '/programs' });
    expect(await screen.findByText(/^1 routine · 1 workout · last /)).toBeTruthy();
  });
});

describe('Routine copy / move (SPEC F3)', () => {
  it('copies and moves a routine to another program from the routine menu', async () => {
    await entitledApp();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const a = programRepo.create('A');
    const b = programRepo.create('B');
    const r = routineRepo.create(a.id, 'Push A', 'push');
    routineExerciseRepo.add(r.id, 'barbell_bench_press', { sets: 3 });
    renderRouter('./src/app', { initialUrl: `/routine/${r.id}` });

    fireEvent.press(await screen.findByTestId('routine-menu'));
    fireEvent.press(await screen.findByTestId('routine-copy'));
    fireEvent.press(await screen.findByTestId(`move-target-${b.id}`));
    await flush();
    expect(routineRepo.listByProgram(b.id).map((x) => x.name)).toEqual(['Push A']);
    expect(routineRepo.listByProgram(a.id)).toHaveLength(1);

    fireEvent.press(screen.getByTestId('routine-menu'));
    fireEvent.press(await screen.findByTestId('routine-move'));
    // ย้ายได้เฉพาะกรุ๊ปอื่น: ไม่มีแถวของกรุ๊ปเดิม
    expect(screen.queryByTestId(`move-target-${a.id}`)).toBeNull();
    fireEvent.press(await screen.findByTestId(`move-target-${b.id}`));
    await flush();
    expect(routineRepo.listByProgram(a.id)).toHaveLength(0);
    expect(
      routineRepo
        .listByProgram(b.id)
        .map((x) => x.id)
        .sort(),
    ).toContain(r.id);
    expect(routineRepo.listByProgram(b.id)).toHaveLength(2);
  });

  it('explains that there is nowhere to move to when only one program exists', async () => {
    await entitledApp();
    const only = programRepo.create('Only');
    const r = routineRepo.create(only.id, 'Solo', 'other');
    renderRouter('./src/app', { initialUrl: `/routine/${r.id}` });
    fireEvent.press(await screen.findByTestId('routine-menu'));
    fireEvent.press(await screen.findByTestId('routine-move'));
    expect(await screen.findByText('No other program')).toBeTruthy();
    expect(screen.queryByTestId(`move-target-${only.id}`)).toBeNull();
  });
});

describe('Exercise library (SPEC F7, F9)', () => {
  it('keeps the routine when creating a custom exercise from the empty search result', async () => {
    await entitledApp();
    const p = programRepo.create('Mine');
    const r = routineRepo.create(p.id, 'Day', 'other');
    renderRouter('./src/app', { initialUrl: `/exercises?routineId=${r.id}` });
    fireEvent.changeText(await screen.findByTestId('exercise-search'), 'zzzzqqq');
    expect(await screen.findByText(/No exercises match/)).toBeTruthy();
    // ปุ่มใน EmptyState (ข้อความตรงกับปุ่มหัวข้อ แต่ปุ่มหัวข้อเป็นไอคอน)
    fireEvent.press(screen.getByText('Create your own exercise'));
    fireEvent.changeText(await screen.findByTestId('custom-name'), 'Sled push');
    fireEvent.press(screen.getByTestId('primary-quads'));
    fireEvent.press(screen.getByTestId('custom-save'));
    await flush();
    const custom = customExerciseRepo.list().find((e) => e.name === 'Sled push')!;
    expect(routineExerciseRepo.listByRoutine(r.id).map((e) => e.exerciseId)).toEqual([custom.id]);
  });

  it('edits a custom exercise with the same form', async () => {
    await entitledApp();
    const c = customExerciseRepo.create({
      name: 'Sled push',
      primaryMuscle: 'quads',
      secondaryMuscles: ['glutes'],
      equipment: 'other',
    });
    renderRouter('./src/app', { initialUrl: `/exercises/${c.id}` });
    fireEvent.press(await screen.findByTestId('exercise-edit'));
    const name = await screen.findByTestId('custom-name');
    expect(name.props.value).toBe('Sled push');
    fireEvent.changeText(name, '  Prowler push ');
    fireEvent.press(screen.getByTestId('primary-hamstrings'));
    fireEvent.press(screen.getByTestId('custom-save'));
    await flush();
    expect(customExerciseRepo.list()).toHaveLength(1);
    expect(customExerciseRepo.get(c.id)).toMatchObject({
      name: 'Prowler push',
      primaryMuscle: 'hamstrings',
      secondaryMuscles: ['glutes'],
    });
  });

  it('does not show edit/delete for built-in exercises', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/exercises/barbell_bench_press' });
    expect(await screen.findByTestId('muscle-icon-chest', { hidden: true })).toBeTruthy();
    expect(screen.queryByTestId('exercise-edit')).toBeNull();
  });

  it('draws a decorative muscle icon on library rows', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/exercises' });
    const row = await screen.findByTestId('ex-barbell_bench_press');
    expect(row).toBeTruthy();
    const icon = screen.getAllByTestId('muscle-icon-chest', { hidden: true })[0];
    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('draws the muscle icon on session exercise headers', async () => {
    await entitledApp();
    const p = programRepo.create('Mine');
    const r = routineRepo.create(p.id, 'Legs', 'legs');
    routineExerciseRepo.add(r.id, 'back_squat', { sets: 2 });
    const { session } = startSession({ routineId: r.id });
    renderRouter('./src/app', { initialUrl: `/session/${session.id}` });
    const [first] = sessionRepo.exercises(session.id);
    expect(first.muscleGroup).toBe('quads');
    expect(await screen.findByTestId(`muscle-icon-${first.muscleGroup}`, { hidden: true })).toBeTruthy();
  });

  it('has a self-drawn icon for every muscle group', () => {
    for (const m of MUSCLE_GROUPS) expect(MUSCLE_ICON[m].length).toBeGreaterThan(0);
  });
});

describe('Exercise settings (SPEC G2, A3)', () => {
  const open = async () => {
    await entitledApp();
    const p = programRepo.create('Mine');
    const r = routineRepo.create(p.id, 'Push A', 'push');
    routineExerciseRepo.add(r.id, 'barbell_bench_press', { sets: 3 });
    renderRouter('./src/app', { initialUrl: `/routine/${r.id}` });
    fireEvent.press(await screen.findByTestId('rex-barbell_bench_press'));
    await screen.findByTestId('setting-sets');
    return r;
  };

  it('hides weight step, RIR, RPE and rest behind a collapsed More button', async () => {
    await open();
    expect(screen.getByTestId('setting-repmax')).toBeTruthy();
    expect(screen.getByTestId('mode-double')).toBeTruthy();
    expect(screen.queryByTestId('setting-rir')).toBeNull();
    expect(screen.queryByTestId('setting-rpe')).toBeNull();
    expect(screen.queryByText('Weight step')).toBeNull();
    expect(screen.getByTestId('setting-more').props.accessibilityState.expanded).toBe(false);
    fireEvent.press(screen.getByTestId('setting-more'));
    expect(screen.getByTestId('setting-rir')).toBeTruthy();
    expect(screen.getByTestId('setting-rpe')).toBeTruthy();
    expect(screen.getByText('Weight step')).toBeTruthy();
    expect(screen.getByText('Rest timer')).toBeTruthy();
  });

  it('rejects RIR/RPE out of range and saves valid values (RPE allows half steps)', async () => {
    const r = await open();
    fireEvent.press(screen.getByTestId('setting-more'));
    fireEvent.changeText(screen.getByTestId('setting-rpe'), '50');
    fireEvent.changeText(screen.getByTestId('setting-rir'), '11');
    expect(screen.getByText('RPE must be from 1 to 10 (half steps like 7.5 are fine).')).toBeTruthy();
    expect(screen.getByText('RIR must be a whole number from 0 to 10.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('exercise-settings-save'));
    await flush();
    expect(routineExerciseRepo.listByRoutine(r.id)[0]).toMatchObject({ rir: null, rpe: null });
    fireEvent.changeText(screen.getByTestId('setting-rpe'), '7.5');
    fireEvent.changeText(screen.getByTestId('setting-rir'), '2');
    fireEvent.press(screen.getByTestId('exercise-settings-save'));
    await flush();
    expect(routineExerciseRepo.listByRoutine(r.id)[0]).toMatchObject({ rir: 2, rpe: 7.5 });
  });

  it('opens More automatically when advanced values were already set', async () => {
    await entitledApp();
    const p = programRepo.create('Mine');
    const r = routineRepo.create(p.id, 'Push A', 'push');
    const ex = routineExerciseRepo.add(r.id, 'barbell_bench_press', { sets: 3 });
    routineExerciseRepo.update(ex.id, { rpe: 8 });
    renderRouter('./src/app', { initialUrl: `/routine/${r.id}` });
    fireEvent.press(await screen.findByTestId('rex-barbell_bench_press'));
    expect((await screen.findByTestId('setting-rpe')).props.value).toBe('8');
  });
});
