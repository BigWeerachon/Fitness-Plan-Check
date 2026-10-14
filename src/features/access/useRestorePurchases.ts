import type { TFunction } from 'i18next';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { restorePurchases, type RestoreOutcome } from './accountFlow';

/** แจ้งผลการกู้คืนการซื้อ */
export function alertRestoreOutcome(outcome: RestoreOutcome, t: TFunction): void {
  if (outcome === 'restored') Alert.alert(t('paywall.restored'));
  else if (outcome === 'none') Alert.alert(t('paywall.nothingToRestore'));
  else Alert.alert(t('common.errorTitle'), t('errors.restoreFailed'));
}

/** กู้คืนการซื้อจากบัญชีสโตร์ (ไม่ต้องล็อกอิน D81) แล้วแจ้งผล — คืนผลให้หน้าจอตัดสินใจต่อ */
export function useRestorePurchases(): () => Promise<RestoreOutcome> {
  const { t } = useTranslation();
  return useCallback(async () => {
    const outcome = await restorePurchases();
    alertRestoreOutcome(outcome, t);
    return outcome;
  }, [t]);
}
