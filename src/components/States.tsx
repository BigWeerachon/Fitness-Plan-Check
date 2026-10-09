import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

/** สถานะมาตรฐานของทุกหน้า (SCREENS.md): loading / ว่าง / error / ถูกล็อก */

export function LoadingState({ label }: { label?: string }) {
  const p = usePalette();
  const { t } = useTranslation();
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? t('common.loading')}
    >
      <ActivityIndicator color={p.accent} size="large" />
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'leaf-outline',
  actionLabel,
  onAction,
}: {
  title?: string;
  body?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const p = usePalette();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={36} color={p.accent} />
      <AppText variant="headline" align="center" style={styles.title}>
        {title ?? t('common.emptyTitle')}
      </AppText>
      {body ? (
        <AppText secondary align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const p = usePalette();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Icon name="cloud-offline-outline" size={36} color={p.danger} />
      <AppText variant="headline" align="center" style={styles.title}>
        {t('common.errorTitle')}
      </AppText>
      <AppText secondary align="center">
        {message ?? t('common.errorBody')}
      </AppText>
      {onRetry ? (
        <Button title={t('common.retry')} onPress={onRetry} kind="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

export function LockedState({ onUnlock }: { onUnlock: () => void }) {
  const p = usePalette();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap} accessibilityLabel={t('a11y.locked')}>
      <Icon name="lock-closed-outline" size={36} color={p.accent} />
      <AppText variant="headline" align="center" style={styles.title}>
        {t('common.lockedTitle')}
      </AppText>
      <AppText secondary align="center">
        {t('common.lockedBody')}
      </AppText>
      <Button title={t('common.lockedCta')} onPress={onUnlock} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  title: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
