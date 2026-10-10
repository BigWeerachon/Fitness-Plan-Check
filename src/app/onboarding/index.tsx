import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, CardGroup } from '../../components';
import {
  AccentPicker,
  AppearancePreview,
  LanguagePicker,
  ThemePicker,
} from '../../features/appearance/AppearancePickers';
import { OnboardingFrame } from '../../features/onboarding/OnboardingFrame';
import { spacing } from '../../theme/tokens';

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
      <CardGroup>
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('appearance.language')}
          </AppText>
          <LanguagePicker />
        </View>
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('appearance.theme')}
          </AppText>
          <ThemePicker />
        </View>
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('appearance.accent')}
          </AppText>
          <AccentPicker />
        </View>
      </CardGroup>
      <AppearancePreview />
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, gap: spacing.sm },
});
