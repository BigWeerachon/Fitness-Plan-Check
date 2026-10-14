import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo } from '@/db/repos/programRepo';
import { bootstrapAccount, signIn } from '@/features/access/accountFlow';
import { registerAppHooks } from '@/features/bootstrap';
import { draftRepo } from '@/features/onboarding/draft';
import { useSettings } from '@/stores/settings';
import { setClockForTests } from '@/utils/clock';
import { flush } from '../helpers/app';
import { freshEnv, type TestServices } from '../helpers/env';

jest.setTimeout(60_000);
afterEach(() => setClockForTests(null));

/**
 * มีข้อมูลในเครื่องตามที่ระบุ แต่ยังไม่ได้ทำเครื่องหมายว่าผ่านตั้งค่าเริ่มต้น
 * (เช่น ข้อมูลเดิมยังอยู่แต่ค่าตั้งค่าระดับเครื่องหาย) — เซสชันกลับมาและสโตร์ยืนยันสิทธิ์ (ซื้อขาด)
 */
async function entitledWithLocalData(local: { profile?: boolean; program?: boolean }): Promise<TestServices> {
  const s = freshEnv('lifetime');
  if (local.profile) profileRepo.update({ age: 30, weightKg: 70 });
  if (local.program) programRepo.create('Existing program');
  useSettings.setState({ onboardingDone: false });
  await s.auth.signIn('google');
  return s;
}

describe('entitled session skips the onboarding steps whose data is already on the device (SPEC C)', () => {
  it('profile and program exist → straight to Today, onboarding marked done', async () => {
    await entitledWithLocalData({ profile: true, program: true });
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('today')).toBeTruthy();
    expect(useSettings.getState().onboardingDone).toBe(true);
    expect(profileRepo.get()?.age).toBe(30);
  });

  it('a profile but no program → resumes at step 3', async () => {
    await entitledWithLocalData({ profile: true });
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('onboarding-step-3')).toBeTruthy();
    expect(useSettings.getState().onboardingDone).toBe(false);
  });

  it('no body data → resumes at step 2 (even if a program exists)', async () => {
    await entitledWithLocalData({ program: true });
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('onboarding-step-2')).toBeTruthy();
    expect(useSettings.getState().onboardingDone).toBe(false);
  });

  it('a brand-new user (no session) still starts at step 1', async () => {
    freshEnv('new');
    useSettings.setState({ onboardingDone: false });
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('onboarding-step-1')).toBeTruthy();
  });
});

describe('onboarding "I already have an account" → login → entitled → skip', () => {
  it('marks onboarding done, enters the app and moves the half-filled draft into the account', async () => {
    freshEnv('lifetime');
    useSettings.setState({ onboardingDone: false });
    draftRepo.save({ age: 41, weightKg: 77, profileSkipped: false });
    renderRouter('./src/app', { initialUrl: '/' });
    fireEvent.press(await screen.findByTestId('onboarding-have-account'));
    fireEvent.press(await screen.findByTestId('signin-google'));
    expect(await screen.findByTestId('today')).toBeTruthy();
    expect(useSettings.getState().onboardingDone).toBe(true);
    await waitFor(() => expect(profileRepo.get()).toMatchObject({ age: 41, weightKg: 77 }));
    expect(draftRepo.get()?.migratedAt).not.toBeNull();
  });
});

describe('entitled session appears mid-onboarding (quick-start race)', () => {
  it('does not mark the half-done draft as migrated, so the template chosen at step 3 is still created', async () => {
    const s = freshEnv('lifetime');
    useSettings.setState({ onboardingDone: false });
    registerAppHooks();
    draftRepo.save({ sex: 'female', age: 29, weightKg: 61, profileSkipped: false });
    await bootstrapAccount();
    expect(await signIn('google')).toBe('success');
    await flush();
    expect(s.purchases.currentAppUserId()).toBeTruthy();
    // hook ตอนได้สิทธิ์ทำงานแล้ว แต่ต้องไม่ย้ายร่างที่ยังไม่ครบ
    expect(draftRepo.get()?.migratedAt).toBeNull();
    expect(programRepo.list()).toHaveLength(0);

    renderRouter('./src/app', { initialUrl: '/onboarding/program' });
    fireEvent.press(await screen.findByTestId('template-ppl3'));
    fireEvent.press(screen.getByTestId('onboarding-next'));
    await waitFor(() => expect(programRepo.list()).toHaveLength(1));
    expect(programRepo.list()[0].templateKey).toBe('ppl3');
    expect(profileRepo.get()).toMatchObject({ sex: 'female', age: 29, weightKg: 61 });
    expect(draftRepo.get()?.migratedAt).not.toBeNull();
  });
});
