import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, Icon } from '../../components';
import type { MuscleGroup } from '../../db/schema';
import { radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

/** เช็กลิสต์กลุ่มกล้ามเนื้อของวันนี้: ที่วางแผนไว้ + ที่ทำเสร็จแล้ว (ไม่ซ้ำกัน) */
export function MusclesCard({ planned, done }: { planned: MuscleGroup[]; done: MuscleGroup[] }) {
  const { t } = useTranslation();
  const p = usePalette();
  const shown = [...new Set([...planned, ...done])];
  return (
    <Card>
      {shown.length === 0 ? (
        <AppText secondary>{t('today.noMusclesYet')}</AppText>
      ) : (
        <View style={styles.muscles} accessibilityRole="list">
          {shown.map((m) => {
            const isDone = done.includes(m);
            return (
              <View
                key={m}
                style={[styles.muscle, { borderColor: isDone ? p.accent : p.separator }]}
                accessible
                accessibilityLabel={`${t(`exercises.muscles.${m}`)}, ${isDone ? t('today.muscleDone') : t('today.muscleTodo')}`}
              >
                <Icon
                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={isDone ? p.accent : p.textSecondary}
                />
                <AppText variant="caption" color={isDone ? p.accent : p.textSecondary}>
                  {t(`exercises.muscles.${m}`)}
                </AppText>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
