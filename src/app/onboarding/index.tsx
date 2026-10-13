import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components';
import { AppearanceGroup, AppearancePreview } from '../../features/appearance/AppearancePickers';
import { OnboardingFrame } from '../../features/onboarding/OnboardingFrame';

/** ขั้น 1: ภาษา (ตามภาษาเครื่อง), ธีม, สีหลัก 8 สี + เลือกเอง พร้อม preview สด (SPEC C) */
export default function OnboardingAppearance() {
  const { t } = useTranslation();
  return (
    <OnboardingFrame
      step={1}
      title={t('onboarding.step1Title')}
      subtitle={t('onboarding.step1Sub')}
      onNext={() => router.push('/onboarding/profile')}
      footer={
        <Button
          title={t('onboarding.haveAccount')}
          kind="plain"
          onPress={() => router.push({ pathname: '/login', params: { from: 'onboarding' } })}
          testID="onboarding-have-account"
        />
      }
    >
      <AppearanceGroup showLabels />
      <AppearancePreview />
    </OnboardingFrame>
  );
}
