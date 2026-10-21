import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Linking } from 'react-native';
import { dailyLogRepo } from '@/db/repos/dailyLogRepo';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo } from '@/db/repos/programRepo';
import { draftRepo } from '@/features/onboarding/draft';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { useEntitlement } from '@/stores/entitlement';
import { useSettings } from '@/stores/settings';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';
import { freshEnv } from '../helpers/env';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

describe('delete all data on this device (SPEC B12, D81)', () => {
  it('warns about store subscriptions, needs two confirmations, then wipes everything on the device', async () => {
    const s = await entitledApp();
    draftRepo.save({ sex: 'female', age: 31, weightKg: 60 });
    profileRepo.update({ weightKg: 60 });
    instantiateTemplate('ppl3', 'en');
    dailyLogRepo.upsert('2026-10-09', { kcalIntake: 2000 });
    expect(programRepo.list()).toHaveLength(1);

    renderRouter('./src/app', { initialUrl: '/delete-data' });
    expect(await screen.findByTestId('delete-data')).toBeTruthy();
    // การลบข้อมูลไม่ยกเลิกสมาชิกในสโตร์ — มีคำเตือนและทางลัดไปจัดการสมาชิก
    expect(screen.getByTestId('delete-subscription-warning')).toBeTruthy();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(screen.getByTestId('delete-manage'));
    await flush();
    expect(openURL).toHaveBeenCalled();

    // ขั้น 1: ปุ่มลบใช้ไม่ได้จนกว่าจะติ๊กยืนยัน
    expect(screen.getByTestId('delete-confirm').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('delete-understood'));
    await flush();
    expect(screen.getByTestId('delete-confirm').props.accessibilityState).toMatchObject({ disabled: false });

    // ขั้น 2: กล่องยืนยัน — กดยกเลิกแล้วไม่มีอะไรถูกลบ
    const alert = jest.spyOn(Alert, 'alert').mockImplementationOnce(() => undefined);
    fireEvent.press(screen.getByTestId('delete-confirm'));
    await flush();
    expect(programRepo.list()).toHaveLength(1);

    alert.mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    fireEvent.press(screen.getByTestId('delete-confirm'));
    // เริ่มใหม่ที่ตั้งค่าเริ่มต้น (สิทธิ์ยังอยู่ในสโตร์ → ข้ามไปขั้นที่ยังไม่มีข้อมูล)
    await waitFor(() => expect(screen.getByTestId('onboarding-step-2')).toBeTruthy());
    expect(alert).toHaveBeenCalledWith('All data on this device has been deleted.');

    expect(programRepo.list()).toHaveLength(0);
    expect(profileRepo.get()).toBeUndefined();
    expect(dailyLogRepo.get('2026-10-09')).toBeUndefined();
    expect(draftRepo.get()).toBeNull();
    expect(useSettings.getState()).toMatchObject({ onboardingDone: false, language: 'en' });
    // ไม่ยกเลิกการสมัครในสโตร์: ตรวจสิทธิ์ใหม่แล้วยังเป็นซื้อขาด
    expect(s.purchases.purchaseCalls).toHaveLength(0);
    expect(useEntitlement.getState().cached?.state).toBe('LIFETIME');
  });

  it('is reachable without an active plan from the always-accessible settings page (B3)', async () => {
    freshEnv('new');
    useSettings.getState().set('onboardingDone', true);
    useSettings.getState().set('language', 'en');
    renderRouter('./src/app', { initialUrl: '/account' });
    fireEvent.press(await screen.findByTestId('account-delete-data'));
    expect(await screen.findByTestId('delete-data')).toBeTruthy();
  });
});
