import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { signOut } from './accountFlow';

/** คืนฟังก์ชันที่เปิดกล่องยืนยันออกจากระบบ แล้วล็อกเอาต์และกลับไปหน้า Paywall */
export function useConfirmSignOut(): () => void {
  const { t } = useTranslation();
  return useCallback(() => {
    Alert.alert(t('account.signOut'), t('account.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.signOut'),
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/paywall'));
        },
      },
    ]);
  }, [t]);
}
