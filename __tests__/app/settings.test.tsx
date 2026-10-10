import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import { routineRepo } from '@/db/repos/programRepo';
import { routineExerciseRepo } from '@/db/repos/routineExerciseRepo';
import { sessionRepo } from '@/db/repos/sessionRepo';
import { WORKOUT_CSV_HEADER } from '@/domain/csv';
import { lbToKg } from '@/domain/units';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { finishSession } from '@/features/session/finish';
import { startSession } from '@/features/session/sessionFlow';
import { useAuth } from '@/stores/auth';
import { useSync } from '@/stores/sync';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

const files = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

function typeKeys(keys: string) {
  for (const k of keys) fireEvent.press(screen.getByTestId(`key-${k}`));
  fireEvent.press(screen.getByTestId('number-pad-done'));
}

describe('settings tab (SPEC K)', () => {
  it('changes units, rest timer, week start and weight step; shows membership and sync status', async () => {
    await entitledApp();
    useSync
      .getState()
      .set({ status: 'idle', lastSyncedAt: new Date('2026-10-09T08:30:00').getTime(), pending: 2 });
    renderRouter('./src/app', { initialUrl: '/settings' });
    expect(await screen.findByTestId('settings')).toBeTruthy();

    // สถานะสมาชิก (B7) และซิงก์
    expect(within(screen.getByTestId('settings-membership')).getByText('Lifetime')).toBeTruthy();
    expect(within(screen.getByTestId('settings-membership')).getByText('Unlocked forever')).toBeTruthy();
    expect(within(screen.getByTestId('settings-sync')).getByText('Up to date')).toBeTruthy();
    expect(
      within(screen.getByTestId('settings-sync')).getByText(
        /^Last synced Today 08:30 · \d+ changes? waiting to upload$/,
      ),
    ).toBeTruthy();

    // ตัวจับเวลาพัก
    fireEvent.press(screen.getByTestId('settings-rest-inc'));
    await flush();
    expect(profileRepo.get()?.restTimerSec).toBe(105);
    fireEvent(screen.getByTestId('settings-rest-toggle'), 'valueChange', false);
    await flush();
    expect(profileRepo.get()?.restTimerEnabled).toBe(false);
    expect(screen.queryByTestId('settings-rest')).toBeNull();

    // หน่วยน้ำหนัก → ก้าวน้ำหนักเปลี่ยนเป็นค่าเริ่มต้นของ lb แล้วเลือกตัวเล็ก
    fireEvent.press(screen.getByTestId('segment-lb'));
    await flush();
    expect(profileRepo.get()?.weightUnit).toBe('lb');
    expect(profileRepo.get()?.weightStepKg).toBeCloseTo(lbToKg(5), 5);
    fireEvent.press(screen.getByTestId('settings-step-1'));
    await flush();
    expect(profileRepo.get()?.weightStepKg).toBeCloseTo(lbToKg(2.5), 5);
    // ท่าที่สร้างจากเทมเพลตหลังจากนี้ใช้ก้าวที่ตั้งไว้
    const program = instantiateTemplate('ppl3', 'en')!;
    const first = routineRepo.listByProgram(program.id)[0];
    expect(routineExerciseRepo.listByRoutine(first.id)[0].weightStepKg).toBeCloseTo(lbToKg(2.5), 5);

    fireEvent.press(screen.getByTestId('segment-ftin'));
    fireEvent.press(screen.getByTestId('segment-0'));
    await flush();
    expect(profileRepo.get()).toMatchObject({ lengthUnit: 'ftin', weekStart: 0 });
  });

  it('exports CSV through the share sheet', async () => {
    await entitledApp();
    profileRepo.update({ weightKg: 70 });
    const program = instantiateTemplate('ppl3', 'en')!;
    const push = routineRepo.listByProgram(program.id).find((r) => r.type === 'push')!;
    const { session } = startSession({ routineId: push.id });
    const first = sessionRepo.sets(session.id)[0];
    sessionRepo.updateSet(first.id, { weightKg: 60, reps: 10 });
    sessionRepo.setDone(first.id, true);
    finishSession(session.id, 'moderate', 3600);
    dailyLogRepo.upsert('2026-10-09', { bodyWeightKg: 70, kcalIntake: 2200 });

    renderRouter('./src/app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-export'));
    fireEvent.press(await screen.findByTestId('export-workouts'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    const [uri, options] = jest.mocked(Sharing.shareAsync).mock.calls.at(-1)!;
    expect(uri).toBe('file:///cache/fitnese-workouts-2026-10-09.csv');
    expect(options).toMatchObject({ mimeType: 'text/csv' });
    const csv = files.get(uri)!;
    expect(csv).toContain(WORKOUT_CSV_HEADER.join(','));
    expect(csv).toContain('Push / Pull / Legs (3 days)');
    expect(csv).toContain(',60,10,600,true');

    fireEvent.press(screen.getByTestId('settings-export'));
    fireEvent.press(await screen.findByTestId('export-daily'));
    await waitFor(() =>
      expect(files.get('file:///cache/fitnese-daily-2026-10-09.csv')).toContain('2026-10-09,70,2200,'),
    );
  });

  it('links to profile, references and delete account, and signs out after confirmation', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/settings' });
    fireEvent.press(await screen.findByTestId('settings-references'));
    expect(await screen.findByTestId('references')).toBeTruthy();
    fireEvent.press(screen.getByTestId('header-back'));
    fireEvent.press(await screen.findByTestId('settings-delete'));
    expect(await screen.findByTestId('delete-account')).toBeTruthy();
    fireEvent.press(screen.getByTestId('header-back'));
    fireEvent.press(await screen.findByTestId('settings-profile'));
    expect(await screen.findByTestId('profile')).toBeTruthy();
    fireEvent.press(screen.getByTestId('header-back'));

    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    fireEvent.press(await screen.findByTestId('settings-signout'));
    expect(await screen.findByTestId('paywall')).toBeTruthy();
    expect(useAuth.getState().user).toBeNull();
    await flush();
  });
});

describe('profile & targets (SPEC H1–H6)', () => {
  it('computes BMR/TDEE/targets live, saves, adjusts targets and METs, and logs intake', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/profile' });
    expect(await screen.findByTestId('profile-incomplete')).toBeTruthy();

    fireEvent.press(screen.getByTestId('sex-male'));
    fireEvent.changeText(screen.getByTestId('field-age'), '30');
    fireEvent.changeText(screen.getByTestId('field-height'), '175');
    fireEvent.changeText(screen.getByTestId('field-weight'), '70');
    fireEvent.press(screen.getByText('Moderate exercise 3–5 days a week'));
    fireEvent.press(screen.getByText('Maintain'));
    await flush();
    // Mifflin: 10×70 + 6.25×175 − 5×30 + 5 = 1648.75 → TDEE × 1.55 = 2555.6
    expect(
      within(screen.getByTestId('profile-bmr')).getByText('1,649 kcal · Mifflin-St Jeor equation'),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('profile-tdee')).getByText('2,556 kcal · BMR × activity factor 1.55'),
    ).toBeTruthy();
    expect(within(screen.getByTestId('profile-target')).getByText('2,556 kcal · Same as TDEE')).toBeTruthy();
    // โปรตีน 1.8 g/kg × 70 = 126 g, ไขมัน 25% × 2556 / 9 = 71 g
    expect(screen.getByTestId('macro-protein').props.children).toBe('126 g');
    expect(screen.getByTestId('macro-fat').props.children).toBe('71 g');
    expect(screen.getByTestId('profile-fat').props.accessibilityValue).toMatchObject({ now: 25 });

    fireEvent.press(screen.getByTestId('profile-save'));
    await flush();
    expect(profileRepo.get()).toMatchObject({
      sex: 'male',
      age: 30,
      heightCm: 175,
      weightKg: 70,
      goal: 'maintain',
    });
    expect(dailyLogRepo.get('2026-10-09')?.bodyWeightKg).toBe(70);

    // เป้าหมายลดไขมัน → ปรับ % ลดได้ 10–25
    fireEvent.press(screen.getByText('Lose fat'));
    fireEvent.press(screen.getByTestId('profile-save'));
    await flush();
    expect(within(screen.getByTestId('profile-target')).getByText('2,044 kcal · TDEE − 20%')).toBeTruthy();
    fireEvent.press(screen.getByTestId('profile-deficit-inc'));
    await flush();
    expect(profileRepo.get()?.deficitPct).toBe(21);
    expect(within(screen.getByTestId('profile-target')).getByText('2,019 kcal · TDEE − 21%')).toBeTruthy();

    // โปรตีน: ค่าแนะนำของลดไขมัน 2.2 → ลดเป็น 2.1 → กลับค่าแนะนำ
    fireEvent.press(screen.getByTestId('profile-protein-dec'));
    await flush();
    expect(profileRepo.get()?.proteinPerKg).toBe(2.1);
    fireEvent.press(screen.getByTestId('profile-protein-auto'));
    await flush();
    expect(profileRepo.get()?.proteinPerKg).toBeNull();

    // MET และไขมัน
    fireEvent.press(screen.getByTestId('profile-met-light-inc'));
    fireEvent.press(screen.getByTestId('profile-fat-inc'));
    await flush();
    expect(profileRepo.get()).toMatchObject({ metLight: 4, fatPct: 26 });

    // แคลอรี่ที่กินวันนี้ (H4 ตัวเลขเดียว)
    fireEvent.press(screen.getByTestId('profile-intake'));
    typeKeys('1800');
    await flush();
    expect(dailyLogRepo.get('2026-10-09')?.kcalIntake).toBe(1800);
    expect(within(screen.getByTestId('profile-intake')).getByText('1,800 kcal')).toBeTruthy();

    // อายุต่ำกว่า 18 → ไม่มีเป้าลดน้ำหนัก
    fireEvent.changeText(screen.getByTestId('field-age'), '16');
    await flush();
    expect(screen.getByTestId('profile-minor')).toBeTruthy();
    expect(screen.queryByTestId('profile-deficit')).toBeNull();

    fireEvent.press(screen.getByTestId('profile-references'));
    expect(await screen.findByTestId('references')).toBeTruthy();
  });
});
