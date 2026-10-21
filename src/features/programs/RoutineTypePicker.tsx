import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Chip } from '../../components';
import type { RoutineType } from '../../db/schema';
import { spacing } from '../../theme/tokens';

export const ROUTINE_TYPES: RoutineType[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'other'];

/** แท็กประเภท routine (SPEC F5) ใช้คำนวณสัดส่วนในสถิติ */
export function RoutineTypePicker({
  value,
  onChange,
}: {
  value: RoutineType;
  onChange: (v: RoutineType) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('programs.routineType')}>
      {ROUTINE_TYPES.map((type) => (
        <Chip
          key={type}
          label={t(`programs.types.${type}`)}
          selected={value === type}
          onPress={() => onChange(type)}
          testID={`type-${type}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
