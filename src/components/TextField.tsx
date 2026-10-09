import React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { BODY_MAX_SCALE, typography } from '../theme/typography';
import { radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';

export function TextField({
  label,
  error,
  suffix,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string | null; suffix?: string }) {
  const p = usePalette();
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" secondary style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: p.inputBg, borderColor: error ? p.danger : 'transparent' },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={p.textSecondary}
          maxFontSizeMultiplier={BODY_MAX_SCALE}
          selectionColor={p.accent}
          {...rest}
          style={[typography.body, styles.input, { color: p.text }, style]}
        />
        {suffix ? (
          <AppText secondary style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={p.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  suffix: { marginLeft: spacing.sm },
});
