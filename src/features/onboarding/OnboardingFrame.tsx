import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, HeroTitle, ProgressBar, Screen, StackHeader } from '../../components';
import { spacing } from '../../theme/tokens';

/** โครงหน้าของขั้นตั้งค่าเริ่มต้น 3 ขั้น (SPEC C) — แถบความคืบหน้า + ปุ่มถัดไป/ข้าม */
export function OnboardingFrame({
  step,
  title,
  subtitle,
  children,
  onNext,
  nextLabel,
  nextDisabled,
  onSkip,
  skipLabel,
  showBack,
  footer,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  showBack?: boolean;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Screen header={showBack ? <StackHeader /> : undefined} testID={`onboarding-step-${step}`}>
      <View style={styles.progress}>
        <AppText variant="caption" secondary align="center">
          {t('onboarding.stepOf', { step, total: 3 })}
        </AppText>
        <ProgressBar value={step / 3} label={t('onboarding.stepOf', { step, total: 3 })} />
      </View>
      <HeroTitle title={title} subtitle={subtitle} compact />
      <View style={styles.body}>{children}</View>
      <View style={styles.actions}>
        {onNext ? (
          <Button
            title={nextLabel ?? t('common.next')}
            onPress={onNext}
            disabled={nextDisabled}
            testID="onboarding-next"
          />
        ) : null}
        {onSkip ? (
          <Button
            title={skipLabel ?? t('common.skipForNow')}
            kind="plain"
            onPress={onSkip}
            testID="onboarding-skip"
          />
        ) : null}
        {footer}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.xs, marginTop: spacing.md, paddingHorizontal: spacing.xl },
  body: { gap: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
