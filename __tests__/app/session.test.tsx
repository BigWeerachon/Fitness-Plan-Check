import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Haptics from 'expo-haptics';
import { profileRepo } from '@/db/repos/profileRepo';
import { routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { startSession } from '@/features/session/sessionFlow';
import { useRestTimer } from '@/stores/restTimer';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  useRestTimer.getState().stop();
});

function typeKeys(keys: string) {
  for (const k of keys) fireEvent.press(screen.getByTestId(`key-${k}`));
  fireEvent.press(screen.getByTestId('number-pad-done'));
}

describe('workout session (SPEC G1, G2)', () => {
  it('logs sets with the big keypad, ticks with haptics, starts the rest timer, and finishes with calories + next targets', async () => {
    let t = new Date('2026-10-09T09:00:00').getTime();
    await entitledApp();
    setClockForTests(() => t);
    profileRepo.update({ weightKg: 70 });
    const program = instantiateTemplate('ppl3', 'en')!;
    const legs = routineRepo.listByProgram(program.id).find((r) => r.type === 'legs')!;
    const { session } = startSession({ routineId: legs.id });
    renderRouter('./src/app', { initialUrl: `/session/${session.id}` });

    expect(await screen.findByText('Back Squat')).toBeTruthy();
    expect(screen.getByTestId('session-progress').props.children).toBe('0 of 17 sets');

    // ใส่น้ำหนักด้วยแป้นตัวเลขใหญ่
    fireEvent.press(screen.getByTestId('weight-back_squat-0'));
    typeKeys('100');
    await flush();
    fireEvent.press(screen.getByTestId('reps-back_squat-0'));
    fireEvent.press(screen.getByTestId('key-⌫'));
    typeKeys('8');
    await flush();
    fireEvent.press(screen.getByTestId('tick-back_squat-0'));
    await flush();
    const first = sessionRepo
      .sets(session.id)
      .find((s) => s.exerciseId === 'back_squat' && s.setIndex === 0)!;
    expect(first).toMatchObject({ weightKg: 100, reps: 8, done: true });
    expect(Haptics.notificationAsync).toHaveBeenCalled();
    expect(useRestTimer.getState().endsAt).toBe(t + 150_000);
    expect(await screen.findByTestId('rest-timer')).toBeTruthy();
    expect(screen.getByTestId('session-progress').props.children).toBe('1 of 17 sets');

    // ปรับเป้าหมาย "ใช้ต่อไป" → บันทึกลงการตั้งค่าท่าใน routine
    fireEvent.press(screen.getByTestId('target-back_squat-1'));
    fireEvent.changeText(await screen.findByTestId('target-weight'), '100');
    fireEvent.press(screen.getByTestId('target-forward'));
    await flush();
    const squatConfig = routineExerciseRepo
      .listByRoutine(legs.id)
      .find((e) => e.exerciseId === 'back_squat')!;
    expect(squatConfig.targetWeightKg).toBe(100);
    const next = sessionRepo.sets(session.id).find((s) => s.exerciseId === 'back_squat' && s.setIndex === 1)!;
    expect(next).toMatchObject({ targetWeightKg: 100, weightKg: 100 });

    // ติ๊กเซ็ตที่เหลือของสควอต (ใช้ค่าเป้าหมายอัตโนมัติ)
    for (const i of [1, 2, 3]) fireEvent.press(screen.getByTestId(`tick-back_squat-${i}`));
    await flush();
    expect(await screen.findByText('Exercise complete')).toBeTruthy();

    // เพิ่มเซ็ตระหว่างฝึก
    fireEvent.press(screen.getByTestId('add-set-romanian_deadlift'));
    await flush();
    expect(sessionRepo.sets(session.id).filter((s) => s.exerciseId === 'romanian_deadlift')).toHaveLength(4);

    // จบเซสชันหลังผ่านไป 1 ชั่วโมง เลือก "หนัก" → 6 MET × 70 kg × 1 h = 420 kcal
    t += 3_600_000;
    fireEvent.press(screen.getByTestId('session-finish'));
    fireEvent.press(await screen.findByTestId('intensity-hard'));
    fireEvent.press(screen.getByTestId('session-save'));
    await flush();
    expect(await screen.findByTestId('session-summary')).toBeTruthy();
    expect(sessionRepo.get(session.id)).toMatchObject({
      status: 'completed',
      intensity: 'hard',
      kcal: 420,
      durationSec: 3600,
    });
    expect(screen.getByTestId('summary-kcal').props.children).toBe('420 kcal');

    // เซ็ตแรก 8 ครั้ง เซ็ตที่เหลือ 6 ครั้ง (ช่วง 6–10) → double progression: น้ำหนักเดิม เป้า = ครั้งต่ำสุด + 1 = 7
    expect(screen.getByTestId('suggestion-back_squat').props.children).toBe(
      'Same weight, one more rep: 100 kg × 7',
    );
    fireEvent.press(screen.getByTestId('accept-back_squat'));
    await flush();
    expect(routineExerciseRepo.get(squatConfig.id)).toMatchObject({ targetWeightKg: 100, targetReps: 7 });
  });

  it('a session survives leaving the screen and can be resumed', async () => {
    await entitledApp();
    const { session } = startSession({ routineId: null });
    sessionRepo.addExercise(session.id, 'push_up', () => ({ name: 'Push-Up', muscle: 'chest' }), { sets: 2 });
    const again = startSession({ routineId: null });
    expect(again).toMatchObject({ resumed: true });
    expect(again.session.id).toBe(session.id);
  });

  it('back-filled sessions ask for the duration', async () => {
    await entitledApp();
    profileRepo.update({ weightKg: 80 });
    const { session } = startSession({ routineId: null, date: '2026-10-07' });
    sessionRepo.addExercise(session.id, 'push_up', () => ({ name: 'Push-Up', muscle: 'chest' }), { sets: 1 });
    sessionRepo.setDone(sessionRepo.sets(session.id)[0].id, true);
    renderRouter('./src/app', { initialUrl: `/session/summary/${session.id}` });
    fireEvent.press(await screen.findByTestId('intensity-light'));
    fireEvent.press(screen.getByTestId('session-save'));
    await flush();
    // 3.5 MET × 80 kg × 1 h (ค่าเริ่มต้น 60 นาที) = 280
    expect(sessionRepo.get(session.id)).toMatchObject({
      backfilled: true,
      durationSec: 3600,
      kcal: 280,
      date: '2026-10-07',
    });
  });
});
