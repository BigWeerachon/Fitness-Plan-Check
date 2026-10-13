import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, IconButton, Stepper, TextField } from '../../components';
import type { CustomWeek, WeightUnit } from '../../db/schema';
import { MAX_CUSTOM_WEEKS, WEEK_PERCENT } from '../../domain/exerciseSettings';
import { spacing } from '../../theme/tokens';

/** โหมด progression แบบกำหนดเอง (SPEC G2): น้ำหนักตั้งต้น + ตารางครั้ง/เปอร์เซ็นต์รายสัปดาห์ */
export function CustomWeeksEditor({
  weeks,
  onChange,
  baseText,
  onBaseTextChange,
  unit,
  newWeekReps,
}: {
  weeks: CustomWeek[];
  onChange: (weeks: CustomWeek[]) => void;
  baseText: string;
  onBaseTextChange: (text: string) => void;
  unit: WeightUnit;
  /** จำนวนครั้งของสัปดาห์ที่เพิ่มใหม่ */
  newWeekReps: number;
}) {
  const { t } = useTranslation();
  const updateWeek = (index: number, patch: Partial<CustomWeek>) =>
    onChange(weeks.map((w, j) => (j === index ? { ...w, ...patch } : w)));
  return (
    <View style={styles.gap}>
      <TextField
        label={t('programs.baseWeight')}
        value={baseText}
        onChangeText={onBaseTextChange}
        keyboardType="decimal-pad"
        suffix={t(`common.units.${unit}`)}
      />
      {weeks.map((w, i) => (
        <View key={i} style={styles.weekRow}>
          <AppText variant="headline" style={styles.weekLabel}>
            {t('programs.week', { n: i + 1 })}
          </AppText>
          <View style={styles.flex}>
            <Stepper
              label={t('programs.weekReps')}
              value={w.reps}
              onChange={(v) => updateWeek(i, { reps: v })}
              min={1}
              max={100}
            />
            <Stepper
              label={t('programs.weekPercent')}
              value={w.percent}
              step={WEEK_PERCENT.step}
              onChange={(v) => updateWeek(i, { percent: v })}
              min={WEEK_PERCENT.min}
              max={WEEK_PERCENT.max}
              format={(v) => `${v}%`}
            />
          </View>
          {weeks.length > 1 ? (
            <IconButton
              icon="trash-outline"
              label={t('programs.removeWeek')}
              onPress={() => onChange(weeks.filter((_, j) => j !== i))}
            />
          ) : null}
        </View>
      ))}
      {weeks.length < MAX_CUSTOM_WEEKS ? (
        <Button
          title={t('programs.addWeek')}
          kind="plain"
          icon="add"
          onPress={() => onChange([...weeks, { reps: newWeekReps, percent: 100 }])}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  flex: { flex: 1 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekLabel: { width: 72 },
});
