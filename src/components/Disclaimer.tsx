import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/**
 * คำเตือนตาม SPEC H5 — แสดงในทุกหน้าผลลัพธ์การคำนวณและหน้าตั้งค่า พร้อมลิงก์ไปหน้าแหล่งอ้างอิง (H6, N1)
 * หน้าแหล่งอ้างอิงเองส่ง showSources={false} เพื่อไม่ให้ลิงก์วนกลับมาที่ตัวเอง
 */
export function Disclaimer({ showSources = true }: { showSources?: boolean }) {
  const p = usePalette();
  const { t } = useTranslation();
  return (
    <View style={[styles.box, { borderColor: p.separator }]} testID="health-disclaimer">
      <View style={styles.row} accessibilityRole="text" accessible>
        <Icon name="information-circle-outline" size={18} color={p.textSecondary} />
        <AppText variant="caption" secondary style={styles.text}>
          {t('nutrition.disclaimer')}
        </AppText>
      </View>
      {showSources ? (
        <Pressable
          onPress={() => router.push('/references')}
          accessibilityRole="link"
          accessibilityLabel={t('nutrition.sources')}
          style={styles.link}
          testID="disclaimer-sources"
        >
          <AppText variant="caption" accent>
            {t('nutrition.sources')}
          </AppText>
          <Icon name="chevron-forward" size={14} color={p.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.button,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  text: { flex: 1 },
  link: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
});
