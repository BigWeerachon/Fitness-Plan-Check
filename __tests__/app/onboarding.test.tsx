import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { draftRepo } from '@/features/onboarding/draft';
import { migrateDraftToAccount } from '@/features/onboarding/migrate';
import { setOwner } from '@/db/owner';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { useSettings } from '@/stores/settings';
import { freshEnv } from '../helpers/env';

jest.setTimeout(60_000);

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('onboarding (SPEC C) → paywall (B4)', () => {
  it('walks the 3 steps with live appearance changes, then lands on the paywall', async () => {
    freshEnv('new');
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByText('Make it yours')).toBeTruthy();
    // ภาษาเปลี่ยนทันที
    fireEvent.press(screen.getByTestId('lang-th'));
    expect(await screen.findByText('ตั้งค่าให้เป็นแบบของคุณ')).toBeTruthy();
    fireEvent.press(screen.getByTestId('lang-en'));
    fireEvent.press(screen.getByTestId('segment-light'));
    fireEvent.press(screen.getByTestId('accent-mint'));
    expect(useSettings.getState()).toMatchObject({ language: 'en', theme: 'light', accent: 'mint' });
    fireEvent.press(screen.getByTestId('onboarding-next'));

    // ขั้น 2: กรอกบางช่อง แล้วไปต่อ
    expect(await screen.findByText('About you')).toBeTruthy();
    fireEvent.press(screen.getByTestId('sex-female'));
    fireEvent.changeText(screen.getByTestId('field-age'), '29');
    fireEvent.changeText(screen.getByTestId('field-weight'), '61');
    fireEvent.press(screen.getByTestId('goal-lose'));
    fireEvent.press(screen.getByTestId('onboarding-next'));

    // ขั้น 3: เลือกเทมเพลต
    expect(await screen.findByText('Quick start')).toBeTruthy();
    fireEvent.press(screen.getByTestId('template-ppl3'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    await flush();
    expect(await screen.findByTestId('paywall')).toBeTruthy();
    expect(useSettings.getState().onboardingDone).toBe(true);
    expect(draftRepo.get()?.data).toMatchObject({
      sex: 'female',
      age: 29,
      weightKg: 61,
      goal: 'lose',
      quickStart: { kind: 'template', key: 'ppl3' },
    });
    // ยังไม่มีข้อมูลในบัญชีจนกว่าจะได้สิทธิ์
    expect(programRepo.list()).toHaveLength(0);
  });

  it('step 2 can be skipped', async () => {
    freshEnv('new');
    renderRouter('./src/app', { initialUrl: '/onboarding/profile' });
    fireEvent.press(await screen.findByTestId('onboarding-skip'));
    expect(await screen.findByText('Quick start')).toBeTruthy();
    expect(draftRepo.get()?.data.profileSkipped).toBe(true);
  });
});

describe('draft migration into the account (B4 last step)', () => {
  it('creates the profile, the template program with its weekly plan, and is idempotent', () => {
    freshEnv();
    draftRepo.save({
      sex: 'male',
      age: 35,
      weightKg: 80,
      heightCm: 178,
      goal: 'gain',
      quickStart: { kind: 'template', key: 'ppl3' },
    });
    setOwner('u1');
    expect(migrateDraftToAccount('u1')).toBe('migrated');
    expect(profileRepo.get()).toMatchObject({ sex: 'male', age: 35, weightKg: 80, goal: 'gain' });
    const [p] = programRepo.list();
    expect(p.templateKey).toBe('ppl3');
    expect(routineRepo.listByProgram(p.id).map((r) => r.type)).toEqual(['push', 'pull', 'legs']);
    expect(weekPlanRepo.activeProgramId()).toBe(p.id);
    expect(weekPlanRepo.listForProgram(p.id).map((e) => e.days)).toEqual([[1], [3], [5]]);
    expect(migrateDraftToAccount('u1')).toBe('nothing');
    expect(programRepo.list()).toHaveLength(1);
  });

  it('does not overwrite data that already came from the cloud (B11)', () => {
    freshEnv();
    setOwner('u1');
    profileRepo.update({ weightKg: 90, age: 40 });
    programRepo.create('Existing');
    draftRepo.save({ weightKg: 70, sex: 'male', quickStart: { kind: 'template', key: 'ppl6' } });
    migrateDraftToAccount('u1');
    expect(profileRepo.get()).toMatchObject({ weightKg: 90, age: 40, sex: 'male' });
    expect(programRepo.list().map((p) => p.name)).toEqual(['Existing']);
  });
});
