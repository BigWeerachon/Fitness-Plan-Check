import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formFromValues, parseProfileForm } from '../../domain/profileInput';
import { draftRepo } from '../../features/onboarding/draft';
import { OnboardingFrame } from '../../features/onboarding/OnboardingFrame';
import { ProfileFormView } from '../../features/profile/ProfileFormView';

/** ขั้น 2: ข้อมูลส่วนตัวเพื่อคำนวณ มีปุ่ม "ข้ามไปก่อน" (SPEC C) — เก็บในเครื่องจนกว่าจะได้สิทธิ์ */
export default function OnboardingProfile() {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => formFromValues(draftRepo.get()?.data ?? {}));
  const { values, errors } = parseProfileForm(form);
  const hasErrors = Object.keys(errors).length > 0;

  const next = () => {
    if (hasErrors) return;
    draftRepo.save({ ...values, profileSkipped: false });
    router.push('/onboarding/program');
  };

  const skip = () => {
    draftRepo.save({ weightUnit: form.weightUnit, lengthUnit: form.lengthUnit, profileSkipped: true });
    router.push('/onboarding/program');
  };

  return (
    <OnboardingFrame
      step={2}
      title={t('onboarding.step2Title')}
      subtitle={t('onboarding.step2Sub')}
      onNext={next}
      nextDisabled={hasErrors}
      onSkip={skip}
      showBack
    >
      <ProfileFormView form={form} errors={errors} onChange={setForm} />
    </OnboardingFrame>
  );
}
