import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { exportAllUserData } from '@/db/backup';
import { serializeBackup } from '@/domain/backup';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { draftRepo } from '@/features/onboarding/draft';
import { applyOnboardingDraft } from '@/features/onboarding/migrate';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo, routineRepo } from '@/db/repos/programRepo';
import { weekPlanRepo } from '@/db/repos/weekPlanRepo';
import { useSettings } from '@/stores/settings';
import { entitledApp } from '../helpers/app';
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

  it('Next → Back → Skip on step 2 drops the values typed earlier (C-2)', async () => {
    freshEnv('new');
    renderRouter('./src/app', { initialUrl: '/onboarding/profile' });
    fireEvent.press(await screen.findByTestId('sex-female'));
    fireEvent.changeText(screen.getByTestId('field-age'), '29');
    fireEvent.changeText(screen.getByTestId('field-weight'), '61');
    fireEvent.press(screen.getByTestId('goal-lose'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByText('Quick start')).toBeTruthy();
    expect(draftRepo.get()?.data).toMatchObject({ age: 29, weightKg: 61 });
    fireEvent.press(screen.getByTestId('header-back'));
    fireEvent.press(await screen.findByTestId('onboarding-skip'));
    expect(await screen.findByText('Quick start')).toBeTruthy();
    expect(draftRepo.get()?.data).toMatchObject({
      profileSkipped: true,
      sex: null,
      age: null,
      heightCm: null,
      weightKg: null,
      activityLevel: null,
      goal: null,
    });
    // ย้ายเข้าบัญชีแล้วไม่มีข้อมูลร่างกายหลุดเข้าไป
    applyOnboardingDraft();
    expect(profileRepo.get()).toMatchObject({ sex: null, age: null, weightKg: null, goal: null });
  });
});

describe('restore a backup file from onboarding step 1 (D82, new phone)', () => {
  it('replaces the data without filling the setup steps, then the paywall asks to restore the purchase', async () => {
    // เครื่องเก่า: มีโปรแกรม แล้วสำรองไว้
    await entitledApp();
    instantiateTemplate('ppl3', 'en');
    const text = serializeBackup(exportAllUserData({ appVersion: '1.0.0', exportedAt: Date.now() }));
    const files = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;
    const uri = 'file:///downloads/fitnese-backup-2026-10-09.json';
    files.set(uri, text);

    // เครื่องใหม่: ยังไม่ตั้งค่าเริ่มต้น ไม่มีสิทธิ์
    freshEnv('new');
    useSettings.getState().load();
    useSettings.getState().set('language', 'en');
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri, name: 'fitnese-backup-2026-10-09.json', size: text.length, lastModified: 0 }],
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });

    renderRouter('./src/app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId('onboarding-restore-file'));
    await flush();

    expect(programRepo.list()).toHaveLength(1);
    expect(useSettings.getState().onboardingDone).toBe(true);
    expect(await screen.findByTestId('paywall')).toBeTruthy();
    alert.mockRestore();
  });
});

describe('Edit setup from the account page while locked (B3, C)', () => {
  it('a locked user can reopen the profile and starting-program steps without losing onboardingDone', async () => {
    freshEnv('new');
    useSettings.getState().set('onboardingDone', true);
    draftRepo.save({ age: 33, quickStart: { kind: 'skip' } });
    renderRouter('./src/app', { initialUrl: '/account' });
    fireEvent.press(await screen.findByTestId('account-edit-setup'));
    expect(await screen.findByTestId('onboarding-step-2')).toBeTruthy();
    expect(screen.getByTestId('field-age').props.value).toBe('33');
    fireEvent.changeText(screen.getByTestId('field-age'), '34');
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(await screen.findByTestId('onboarding-step-3')).toBeTruthy();
    expect(draftRepo.get()?.data.age).toBe(34);
    expect(useSettings.getState().onboardingDone).toBe(true);
    fireEvent.press(screen.getByTestId('template-custom'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    await flush();
    // ยังไม่มีสิทธิ์ → ประตูพาไป Paywall ตามปกติ ไม่วนกลับไปตั้งค่าเริ่มต้น
    expect(await screen.findByTestId('paywall')).toBeTruthy();
    expect(useSettings.getState().onboardingDone).toBe(true);
    expect(draftRepo.get()?.data.quickStart).toEqual({ kind: 'custom' });
  });

  it('the row is hidden for entitled users', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/account' });
    expect(await screen.findByTestId('account')).toBeTruthy();
    expect(screen.queryByTestId('account-edit-setup')).toBeNull();
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
    expect(applyOnboardingDraft()).toBe('migrated');
    expect(profileRepo.get()).toMatchObject({ sex: 'male', age: 35, weightKg: 80, goal: 'gain' });
    const [p] = programRepo.list();
    expect(p.templateKey).toBe('ppl3');
    expect(routineRepo.listByProgram(p.id).map((r) => r.type)).toEqual(['push', 'pull', 'legs']);
    expect(weekPlanRepo.activeProgramId()).toBe(p.id);
    expect(weekPlanRepo.listByProgram(p.id).map((e) => e.days)).toEqual([[1], [3], [5]]);
    expect(applyOnboardingDraft()).toBe('nothing');
    expect(programRepo.list()).toHaveLength(1);
  });

  it('ignores body fields when the profile step was skipped (C-2)', () => {
    freshEnv();
    draftRepo.save({ age: 35, weightKg: 80, goal: 'gain', weightUnit: 'lb', profileSkipped: true });
    applyOnboardingDraft();
    expect(profileRepo.get()).toMatchObject({ age: null, weightKg: null, goal: null, weightUnit: 'lb' });
  });

  it('does not overwrite data already on the device', () => {
    freshEnv();
    profileRepo.update({ weightKg: 90, age: 40 });
    programRepo.create('Existing');
    draftRepo.save({ weightKg: 70, sex: 'male', quickStart: { kind: 'template', key: 'ppl6' } });
    applyOnboardingDraft();
    expect(profileRepo.get()).toMatchObject({ weightKg: 90, age: 40, sex: 'male' });
    expect(programRepo.list().map((p) => p.name)).toEqual(['Existing']);
  });
});
