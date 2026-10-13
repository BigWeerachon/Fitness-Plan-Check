import type { TFunction } from 'i18next';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { restorePurchases, type RestoreOutcome } from './accountFlow';

/** แจ้งผลการกู้คืนการซื้อ — ไม่รวม needLogin เพราะหน้าล็อกอินเองเรียกใช้หลังเพิ่งล็อกอินสำเร็จ จึงไม่ต้องพาไปล็อกอินซ้ำ */
export function alertRestoreOutcome(outcome: Exclude<RestoreOutcome, 'needLogin'>, t: TFunction): void {
  if (outcome === 'restored') Alert.alert(t('paywall.restored'));
  else if (outcome === 'none') Alert.alert(t('paywall.nothingToRestore'));
  else Alert.alert(t('common.errorTitle'), t('errors.restoreFailed'));
}

/** กู้คืนการซื้อ: ยังไม่ล็อกอิน → ไปหน้าล็อกอินแล้วกู้คืนต่อทันที (?then=restore) ไม่งั้นแจ้งผล */
export function useRestorePurchases(): () => Promise<void> {
  const { t } = useTranslation();
  return useCallback(async () => {
    const outcome = await restorePurchases();
    if (outcome === 'needLogin') router.push({ pathname: '/login', params: { then: 'restore' } });
    else alertRestoreOutcome(outcome, t);
  }, [t]);
}
