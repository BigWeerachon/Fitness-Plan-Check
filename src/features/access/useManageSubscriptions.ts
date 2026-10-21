import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking } from 'react-native';
import { manageSubscriptionsUrl } from './accountFlow';

/**
 * เปิดหน้าจัดการ/ยกเลิกสมาชิกของสโตร์ (SPEC B5, K) — ใช้ร่วมกันทุกหน้าที่มีลิงก์นี้
 * เปิดไม่ได้ (ไม่มีแอปสโตร์/ขอ URL จาก SDK ไม่ได้) → แจ้งผู้ใช้ ไม่ปล่อย promise ที่ reject ทิ้งไว้
 */
export function useManageSubscriptions(): () => Promise<void> {
  const { t } = useTranslation();
  return useCallback(async () => {
    try {
      await Linking.openURL(await manageSubscriptionsUrl());
    } catch {
      Alert.alert(t('common.errorTitle'), t('errors.storeUnavailable'));
    }
  }, [t]);
}
