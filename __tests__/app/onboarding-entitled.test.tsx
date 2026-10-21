import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo } from '@/db/repos/programRepo';
import { bootstrapEntitlement } from '@/features/access/accountFlow';
import { registerAppHooks } from '@/features/bootstrap';
import { draftRepo } from '@/features/onboarding/draft';
import { useEntitlement } from '@/stores/entitlement';
import { useSettings } from '@/stores/settings';
import { setClockForTests } from '@/utils/clock';
import { flush } from '../helpers/app';
import { freshEnv, type TestServices } from '../helpers/env';

jest.setTimeout(60_000);
afterEach(() => setClockForTests(null));

/**
 * มีข้อมูลในเครื่องตามที่ระบุ แต่ยังไม่ได้ทำเครื่องหมายว่าผ่านตั้งค่าเริ่มต้น
 * (เช่น ข้อมูลเดิมยังอยู่แต่ค่าตั้งค่าระดับเครื่องหาย) — สโตร์ยืนยันสิทธิ์ (ซื้อขาด) ตอนเปิดแอป
 */
async function entitledWithLocalData(local: { profile?: boolean; program?: boolean }): Promise<TestServices> {
  const s = freshEnv('lifetime');
  if (local.profile) profileRepo.update({ age: 30, weightKg: 70 });
  if (local.program) programRepo.create('Existing program');
  useSettings.setState({ onboardingDone: false });
  return s;
}

describe('entitled device skips the onboarding steps whose data is already on the device (SPEC C)', () => {
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

  it('a brand-new user (no purchase) still starts at step 1', async () => {
    freshEnv('new');
    useSettings.setState({ onboardingDone: false });
    renderRouter('./src/app', { initialUrl: '/' });
    expect(await screen.findByTestId('onboarding-step-1')).toBeTruthy();
  });
});

describe('onboarding "Already purchased? Restore purchases" (new phone, no sign-in D81)', () => {
  it('restores from the store account and resumes at the first step without data', async () => {
    const s = freshEnv('lifetime');
    s.purchases.simulateReinstall();
    useSettings.setState({ onboardingDone: false });
    draftRepo.save({ age: 41, weightKg: 77, profileSkipped: false });
    renderRouter('./src/app', { initialUrl: '/' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(await screen.findByTestId('onboarding-restore'));
    expect(await screen.findByTestId('onboarding-step-2')).toBeTruthy();
    expect(alert).toHaveBeenCalledWith('Your purchase was restored.');
    expect(s.purchases.restoreCalls).toBe(1);
    alert.mockRestore();
  });

  it('stays on step 1 when the store account has nothing to restore', async () => {
    freshEnv('new');
    useSettings.setState({ onboardingDone: false });
    renderRouter('./src/app', { initialUrl: '/' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    fireEvent.press(await screen.findByTestId('onboarding-restore'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('No previous purchase was found for your store account.'),
    );
    expect(screen.getByTestId('onboarding-step-1')).toBeTruthy();
    alert.mockRestore();
  });
});

describe('entitlement confirmed mid-onboarding (quick-start race)', () => {
  it('does not mark the half-done draft as migrated, so the template chosen at step 3 is still created', async () => {
    freshEnv('lifetime');
    useSettings.setState({ onboardingDone: false });
    registerAppHooks();
    draftRepo.save({ sex: 'female', age: 29, weightKg: 61, profileSkipped: false });
    await bootstrapEntitlement();
    await flush();
    expect(useEntitlement.getState().cached?.state).toBe('LIFETIME');
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
