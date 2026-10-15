import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components';
import { useRestorePurchases } from '../../features/access/useRestorePurchases';
import { useBackup } from '../../features/backup/useBackup';
import { AppearanceGroup, AppearancePreview } from '../../features/appearance/AppearancePickers';
import { OnboardingFrame } from '../../features/onboarding/OnboardingFrame';

/**
 * ขั้น 1: ภาษา (ตามภาษาเครื่อง), ธีม, สีหลัก 8 สี + เลือกเอง พร้อม preview สด (SPEC C)
 * เคยซื้อแล้ว (เครื่องใหม่/ติดตั้งใหม่) → กู้คืนการซื้อจากบัญชีสโตร์ได้ทันที ไม่ต้องล็อกอิน (D81)
 * กู้คืนสำเร็จ → AccessGate ข้ามขั้นที่มีข้อมูลในเครื่องแล้ว
 * มีไฟล์สำรอง (D82) → กู้คืนข้อมูลได้ตั้งแต่ขั้นแรก ไม่ต้องกรอกโปรไฟล์/เลือกโปรแกรมที่จะถูกแทนที่อยู่ดี
 * ไฟล์สำรองตั้ง onboardingDone → AccessGate พาไป Paywall (ยังไม่มีสิทธิ์) หรือเข้าแอป
 */
export default function OnboardingAppearance() {
  const { t } = useTranslation();
  const restore = useRestorePurchases();
  const [restoring, setRestoring] = useState(false);
  const backup = useBackup({ onRestored: () => router.replace('/') });

  const onRestore = async () => {
    setRestoring(true);
    const outcome = await restore();
    setRestoring(false);
    if (outcome === 'restored') router.replace('/');
  };

  return (
    <OnboardingFrame
      step={1}
      title={t('onboarding.step1Title')}
      subtitle={t('onboarding.step1Sub')}
      onNext={() => router.push('/onboarding/profile')}
      footer={
        <>
          <Button
            title={t('onboarding.alreadyPurchased')}
            kind="plain"
            onPress={() => void onRestore()}
            loading={restoring}
            testID="onboarding-restore"
          />
          <Button
            title={t('onboarding.restoreFromFile')}
            kind="plain"
            onPress={() => void backup.restore()}
            loading={backup.busy}
            testID="onboarding-restore-file"
          />
        </>
      }
    >
      <AppearanceGroup showLabels />
      <AppearancePreview />
    </OnboardingFrame>
  );
}
