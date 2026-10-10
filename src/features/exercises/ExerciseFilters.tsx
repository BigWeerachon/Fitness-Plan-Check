import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '../../components';
import type { Equipment, MuscleGroup } from '../../db/schema';
import { EQUIPMENT, MUSCLE_GROUPS } from '../../data/exerciseLibrary';
import { spacing } from '../../theme/tokens';

/** แถวชิปกรองกลุ่มกล้ามเนื้อ/อุปกรณ์ (เลื่อนแนวนอน) */
export function MuscleFilter({
  value,
  onChange,
}: {
  value: MuscleGroup | null;
  onChange: (v: MuscleGroup | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label={t('exercises.allMuscles')} selected={value === null} onPress={() => onChange(null)} />
      {MUSCLE_GROUPS.map((m) => (
        <Chip
          key={m}
          label={t(`exercises.muscles.${m}`)}
          selected={value === m}
          onPress={() => onChange(m)}
          testID={`filter-${m}`}
        />
      ))}
    </ScrollView>
  );
}

export function EquipmentFilter({
  value,
  onChange,
}: {
  value: Equipment | null;
  onChange: (v: Equipment | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label={t('exercises.allEquipment')} selected={value === null} onPress={() => onChange(null)} />
      {EQUIPMENT.map((e) => (
        <Chip
          key={e}
          label={t(`exercises.equipment.${e}`)}
          selected={value === e}
          onPress={() => onChange(e)}
          testID={`filter-eq-${e}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
});
