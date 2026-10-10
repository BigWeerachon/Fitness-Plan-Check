import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Linking } from 'react-native';
import { profileRepo } from '@/db/repos/profileRepo';
import { programRepo } from '@/db/repos/programRepo';
import { draftRepo } from '@/features/onboarding/draft';
import { instantiateTemplate } from '@/features/programs/instantiate';
import { useAuth } from '@/stores/auth';
import { setClockForTests } from '@/utils/clock';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  setClockForTests(null);
  jest.restoreAllMocks();
});

describe('delete account screen (SPEC B12)', () => {
  it('warns about store subscriptions, requires confirmation, then removes cloud + device data', async () => {
    const s = await entitledApp();
    const userId = useAuth.getState().user!.id;
    draftRepo.save({ sex: 'female', age: 31, weightKg: 60 });
    profileRepo.update({ weightKg: 60 });
    instantiateTemplate('ppl3', 'en');
    expect(programRepo.list()).toHaveLength(1);

    renderRouter('./src/app', { initialUrl: '/delete-account' });
    expect(await screen.findByTestId('delete-account')).toBeTruthy();
    // การลบบัญชีไม่ยกเลิกสมาชิกในสโตร์ — มีคำเตือนและทางลัดไปจัดการสมาชิก
    expect(screen.getByTestId('delete-subscription-warning')).toBeTruthy();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    fireEvent.press(screen.getByText('Open subscription settings'));
    await flush();
    expect(openURL).toHaveBeenCalled();

    // ปุ่มลบใช้ไม่ได้จนกว่าจะติ๊กยืนยัน
    expect(screen.getByTestId('delete-confirm').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('delete-understood'));
    await flush();
    expect(screen.getByTestId('delete-confirm').props.accessibilityState).toMatchObject({ disabled: false });

    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(screen.getByTestId('paywall')).toBeTruthy());

    expect(s.auth.deletedUsers).toEqual([userId]);
    expect(useAuth.getState().user).toBeNull();
    expect(draftRepo.get()).toBeNull();
    expect(programRepo.list()).toHaveLength(0);
  });
});
