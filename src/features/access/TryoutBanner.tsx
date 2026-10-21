import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../components';
import { env } from '../../services/config';
import { radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

/**
 * ป้ายบอกว่าเป็นบิลด์ทดลอง (D85) — แสดงเฉพาะ APK จากโปรไฟล์ EAS `tryout` ที่ใช้สโตร์จำลอง
 * ปิดไม่ได้ (ไม่มีปุ่ม) แต่เป็นกรอบเล็กๆ ไม่บังเนื้อหา; ไม่ใช่ปุ่มจึงไม่มีพื้นที่แตะ
 * ไม่แสดงอะไรเลยเมื่อไม่ใช่บิลด์ทดลอง
 */
export function TryoutBanner() {
  const p = usePalette();
  const { t } = useTranslation();
  if (!env.tryoutBuild) return null;
  return (
    <View
      style={[styles.box, { borderColor: p.warning }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${t('tryout.title')}. ${t('tryout.body')}`}
      testID="tryout-banner"
    >
      <Icon name="flask-outline" size={18} color={p.warning} />
      <View style={styles.text}>
        <AppText variant="caption" color={p.warning}>
          {t('tryout.title')}
        </AppText>
        <AppText variant="caption" secondary>
          {t('tryout.body')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  text: { flex: 1 },
});
