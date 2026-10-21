import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, IconButton, MuscleIcon } from '../../components';
import { sessionRepo } from '../../db/repos/sessionRepo';
import type { SessionSet, WeightUnit } from '../../db/schema';
import { isExerciseComplete } from '../../domain/sessionSummary';
import type { SetCellField } from '../../domain/sessionEdit';
import { formatWeight } from '../../domain/units';
import { joinDot } from '../../i18n/format';
import { MIN_TOUCH, radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';
import { formatSet, isBodyweightExercise } from './formatSet';
import { SetTick } from './SetTick';
import type { SessionExerciseView } from './useSessionData';

/** การ์ดท่าในหน้าเซสชัน: หัวท่า + ตาราง ครั้งก่อน / เป้าหมาย / ค่าจริง + ติ๊กเซ็ต + เพิ่ม/ลบเซ็ต (SPEC G1) */
export function ExerciseCard({
  view,
  unit,
  onToggleSet,
  onEditCell,
  onOpenMenu,
  onOpenTarget,
  onOpenSetMenu,
}: {
  view: SessionExerciseView;
  unit: WeightUnit;
  /** setNumber เริ่มที่ 1 */
  onToggleSet: (set: SessionSet, setNumber: number) => void;
  onEditCell: (set: SessionSet, field: SetCellField) => void;
  onOpenMenu: () => void;
  onOpenTarget: () => void;
  onOpenSetMenu: (set: SessionSet, setNumber: number) => void;
}) {
  const { t } = useTranslation();
  const p = usePalette();
  const unitLabel = t(`common.units.${unit}`);
  const complete = isExerciseComplete(view.sets);
  const { exercise, config, sets } = view;
  const effortLine = joinDot(
    config?.rir != null && t('session.targetRir', { value: config.rir }),
    config?.rpe != null && t('session.targetRpe', { value: config.rpe }),
  );
  const formatSetValue = (exerciseId: string, kg: number | null, reps: number | null) =>
    formatSet(t, { weightKg: kg, reps, unit, bodyweight: isBodyweightExercise(exerciseId) });

  return (
    <Card>
      <View style={styles.exHeader}>
        <View style={styles.exIcon}>
          <MuscleIcon muscle={exercise.muscleGroup} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">{exercise.exerciseName}</AppText>
          <AppText variant="caption" color={complete ? p.accent : p.textSecondary}>
            {complete ? t('session.exerciseDone') : t(`exercises.muscles.${exercise.muscleGroup}`)}
          </AppText>
          {effortLine ? (
            <AppText variant="caption" secondary testID={`effort-${exercise.exerciseId}`}>
              {effortLine}
            </AppText>
          ) : null}
        </View>
        <IconButton
          icon="ellipsis-horizontal"
          label={`${t('a11y.menu')}: ${exercise.exerciseName}`}
          onPress={onOpenMenu}
          testID={`ex-menu-${exercise.exerciseId}`}
        />
      </View>
      <View style={styles.headRow}>
        <AppText variant="caption" secondary style={styles.cSet}>
          {t('session.set')}
        </AppText>
        <AppText variant="caption" secondary style={styles.cPrev}>
          {t('session.previous')}
        </AppText>
        <AppText variant="caption" secondary style={styles.cTargetHead}>
          {t('session.target')}
        </AppText>
        <AppText variant="caption" secondary style={styles.cDo}>
          {`${unitLabel} × ${t('session.reps')}`}
        </AppText>
        <View style={styles.cTick} />
      </View>
      {sets.map((set, i) => {
        const setNumber = i + 1;
        return (
          <View key={set.id} style={styles.setRow}>
            <Pressable
              onPress={() => onOpenSetMenu(set, setNumber)}
              style={styles.cSetTouch}
              hitSlop={{ left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('session.setOptions', { n: setNumber })}
              testID={`set-menu-${exercise.exerciseId}-${i}`}
            >
              <AppText variant="tabular">{setNumber}</AppText>
            </Pressable>
            <AppText variant="callout" secondary style={styles.cPrev} numberOfLines={2}>
              {formatSetValue(set.exerciseId, set.prevWeightKg, set.prevReps)}
            </AppText>
            <Pressable
              onPress={onOpenTarget}
              style={styles.cTarget}
              accessibilityRole="button"
              accessibilityLabel={`${t('session.target')}: ${formatSetValue(set.exerciseId, set.targetWeightKg, set.targetReps)}`}
              testID={`target-${exercise.exerciseId}-${i}`}
            >
              <AppText variant="callout" accent numberOfLines={2}>
                {formatSetValue(set.exerciseId, set.targetWeightKg, set.targetReps)}
              </AppText>
            </Pressable>
            <View style={[styles.cDo, styles.doRow]}>
              <Pressable
                onPress={() => onEditCell(set, 'weight')}
                style={[styles.cell, { backgroundColor: p.inputBg }]}
                accessibilityRole="button"
                accessibilityLabel={`${t('session.setN', { n: setNumber })}, ${t('session.weight')}: ${set.weightKg != null ? formatWeight(set.weightKg, unit) : t('session.none')}`}
                testID={`weight-${exercise.exerciseId}-${i}`}
              >
                <AppText variant="tabular">
                  {set.weightKg != null ? formatWeight(set.weightKg, unit) : t('session.none')}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => onEditCell(set, 'reps')}
                style={[styles.cell, { backgroundColor: p.inputBg }]}
                accessibilityRole="button"
                accessibilityLabel={`${t('session.setN', { n: setNumber })}, ${t('session.reps')}: ${set.reps ?? t('session.none')}`}
                testID={`reps-${exercise.exerciseId}-${i}`}
              >
                <AppText variant="tabular">{set.reps ?? t('session.none')}</AppText>
              </Pressable>
            </View>
            <View style={styles.cTick}>
              <SetTick
                done={set.done}
                onToggle={() => onToggleSet(set, setNumber)}
                label={set.done ? t('session.untick', { n: setNumber }) : t('session.tick', { n: setNumber })}
                testID={`tick-${exercise.exerciseId}-${i}`}
              />
            </View>
          </View>
        );
      })}
      <View style={styles.setTools}>
        <Button
          title={t('session.addSet')}
          kind="plain"
          icon="add"
          onPress={() => sessionRepo.addSet(exercise.id)}
          testID={`add-set-${exercise.exerciseId}`}
        />
        {sets.length > 1 ? (
          <Button
            title={t('session.removeSet')}
            kind="plain"
            icon="remove"
            onPress={() => sessionRepo.removeSet(sets[sets.length - 1].id)}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  exHeader: { flexDirection: 'row', alignItems: 'center' },
  exIcon: { marginRight: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 8, gap: spacing.xs },
  cSet: { width: 28, textAlign: 'center' },
  cSetTouch: { width: 28, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  cPrev: { flex: 1.1 },
  cTarget: { flex: 1.1, minHeight: MIN_TOUCH, justifyContent: 'center' },
  cTargetHead: { flex: 1.1 },
  cDo: { flex: 1.4 },
  cTick: { width: MIN_TOUCH, alignItems: 'center' },
  doRow: { flexDirection: 'row', gap: spacing.xs },
  cell: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTools: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
});
