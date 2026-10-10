import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { setOwner } from '@/db/owner';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import {
  acceptSuggestion,
  declineSuggestion,
  finishSession,
  suggestionsFor,
} from '@/features/session/finish';
import { startSession } from '@/features/session/sessionFlow';
import { setClockForTests } from '@/utils/clock';
import { freshEnv } from '../helpers/env';

const DAY = 86_400_000;
let t = new Date('2026-10-05T18:00:00').getTime();

function setup(config: Parameters<typeof routineExerciseRepo.add>[2]) {
  freshEnv();
  setOwner('11111111-1111-4111-8111-111111111111');
  profileRepo.update({ weightKg: 70 });
  const program = programRepo.create('Strength');
  const routine = routineRepo.create(program.id, 'Bench day', 'push');
  const re = routineExerciseRepo.add(routine.id, 'barbell_bench_press', config);
  return { routine, re };
}

/** ทำเซสชันของ routine: ทุกเซ็ตด้วยน้ำหนัก/ครั้งที่กำหนด แล้วจบ */
function train(routineId: string, weightKg: number, reps: number): string {
  const { session } = startSession({ routineId });
  for (const s of sessionRepo.sets(session.id)) {
    sessionRepo.updateSet(s.id, { weightKg, reps });
    sessionRepo.setDone(s.id, true);
  }
  finishSession(session.id, 'moderate');
  return session.id;
}

describe('progressive overload after finishing (SPEC G2)', () => {
  beforeEach(() => {
    t = new Date('2026-10-05T18:00:00').getTime();
    setClockForTests(() => t);
  });
  afterEach(() => setClockForTests(null));

  it('counts a linear miss even when the user leaves the summary without tapping anything', () => {
    const { routine, re } = setup({
      progressionMode: 'linear',
      sets: 3,
      repMin: 5,
      repMax: 5,
      targetWeightKg: 60,
      targetReps: 5,
      weightStepKg: 2.5,
    });
    train(routine.id, 60, 4); // พลาด แล้วกลับหน้าแรกเลย
    expect(routineExerciseRepo.get(re.id)?.failStreak).toBe(1);
    t += 2 * DAY;
    const second = train(routine.id, 60, 4); // พลาดอีกครั้ง → เสนอลด 10% (60×0.9=54 ปัดตามขั้น 2.5 = 55)
    const [s] = suggestionsFor(second);
    expect(s.suggestion).toMatchObject({
      reason: 'deload',
      deloadOffered: true,
      failStreak: 2,
      targetWeightKg: 55,
    });
    expect(routineExerciseRepo.get(re.id)?.failStreak).toBe(2);
  });

  it('keeps the suggestion stable after Accept and never applies a decision twice', () => {
    const { routine, re } = setup({
      progressionMode: 'linear',
      sets: 3,
      repMin: 5,
      repMax: 5,
      targetWeightKg: 60,
      targetReps: 5,
      weightStepKg: 2.5,
      failStreak: 1,
    });
    const id = train(routine.id, 60, 4);
    const before = suggestionsFor(id)[0];
    expect(before.suggestion).toMatchObject({ reason: 'deload', failStreak: 2 });

    acceptSuggestion(before);
    const after = suggestionsFor(id)[0];
    // ข้อความไม่เปลี่ยนเองหลังกดยอมรับ และบันทึกการตัดสินใจไว้
    expect(after.suggestion).toEqual(before.suggestion);
    expect(after.decision).toBe('accepted');
    expect(routineExerciseRepo.get(re.id)).toMatchObject({ targetWeightKg: 55, failStreak: 0 });

    // กดซ้ำ/ข้ามภายหลังไม่มีผล
    acceptSuggestion(after);
    declineSuggestion(after);
    expect(routineExerciseRepo.get(re.id)).toMatchObject({ targetWeightKg: 55, failStreak: 0 });
    expect(suggestionsFor(id)[0].decision).toBe('accepted');
    // จบซ้ำไม่คำนวณใหม่
    finishSession(id, 'hard');
    expect(suggestionsFor(id)[0].decision).toBe('accepted');
  });

  it('starts custom-weekly sessions with the current week’s prescription', () => {
    const { routine } = setup({
      progressionMode: 'custom',
      sets: 3,
      repMin: 5,
      repMax: 8,
      weightStepKg: 2.5,
      baseWeightKg: 100,
      targetWeightKg: 50,
      targetReps: 8,
      customWeeks: [
        { reps: 8, percent: 100 },
        { reps: 5, percent: 110 },
      ],
      progressionStartedAt: t,
    });
    const week1 = startSession({ routineId: routine.id }).session;
    expect(sessionRepo.sets(week1.id)[0]).toMatchObject({ targetWeightKg: 100, targetReps: 8 });
    sessionRepo.remove(week1.id);

    t += 7 * DAY;
    const week2 = startSession({ routineId: routine.id }).session;
    expect(sessionRepo.sets(week2.id)[0]).toMatchObject({ targetWeightKg: 110, targetReps: 5 });
  });
});
