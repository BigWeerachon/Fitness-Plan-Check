import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmDestructive } from '../../utils/confirmDestructive';
import { signOut } from './accountFlow';

/** คืนฟังก์ชันที่เปิดกล่องยืนยันออกจากระบบ แล้วล็อกเอาต์และกลับไปหน้า Paywall */
export function useConfirmSignOut(): () => void {
  const { t } = useTranslation();
  return useCallback(() => {
    confirmDestructive(t, {
      title: t('account.signOut'),
      message: t('account.signOutConfirm'),
      confirmLabel: t('account.signOut'),
      onConfirm: () => {
        void signOut().then(() => router.replace('/paywall'));
      },
    });
  }, [t]);
}
