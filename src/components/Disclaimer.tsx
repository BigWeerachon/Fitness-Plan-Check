import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** คำเตือนตาม SPEC H5 — แสดงในทุกหน้าผลลัพธ์การคำนวณและหน้าตั้งค่า */
export function Disclaimer() {
  const p = usePalette();
  const { t } = useTranslation();
  return (
    <View
      style={[styles.box, { borderColor: p.separator }]}
      accessibilityRole="text"
      testID="health-disclaimer"
    >
      <Icon name="information-circle-outline" size={18} color={p.textSecondary} />
      <AppText variant="caption" secondary style={styles.text}>
        {t('nutrition.disclaimer')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.button,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  text: { flex: 1 },
});
