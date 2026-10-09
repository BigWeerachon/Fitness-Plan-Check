import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  CardGroup,
  EmptyState,
  Icon,
  IconButton,
  ListRow,
  Screen,
  StackHeader,
  TextField,
  Toggle,
  AppText,
} from '../../../components';
import { profileRepo } from '../../../db/repos/profileRepo';
import { routineExerciseRepo } from '../../../db/repos/routineExerciseRepo';
import { sessionRepo } from '../../../db/repos/sessionRepo';
import type { Equipment, MuscleGroup } from '../../../db/schema';
import { exerciseName, searchExercises } from '../../../data/exerciseLibrary';
import { defaultWeightStepKg } from '../../../domain/progression';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { EquipmentFilter, MuscleFilter } from '../../../features/exercises/ExerciseFilters';
import { allExercises, resolveExercise } from '../../../features/exercises/resolve';
import { currentLanguage } from '../../../i18n';
import { spacing } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';

/**
 * คลังท่า (SPEC F7): ค้นหา/กรองตามกลุ่มกล้ามเนื้อและอุปกรณ์
 * โหมดเลือกท่า: ?routineId (เพิ่มเข้า routine) / ?sessionId (เพิ่มระหว่างฝึก) / ?swap=<sessionExerciseId> (สลับท่า)
 */
export default function ExercisesScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const params = useLocalSearchParams<{ routineId?: string; sessionId?: string; swap?: string }>();
  const picking = !!(params.routineId || params.sessionId || params.swap);
  const single = !!params.swap;
  const lang = currentLanguage();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [secondary, setSecondary] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const list = useRepoQuery(allExercises);
  const results = searchExercises(list, query, { muscle, equipment, includeSecondary: secondary }, lang);

  const confirm = (ids: string[]) => {
    if (params.routineId) {
      const unit = profileRepo.get()?.weightUnit ?? 'kg';
      for (const exerciseId of ids) {
        routineExerciseRepo.add(params.routineId, exerciseId, {
          weightStepKg: defaultWeightStepKg(unit),
          targetReps: 8,
        });
      }
    } else if (params.sessionId) {
      for (const exerciseId of ids) sessionRepo.addExercise(params.sessionId, exerciseId, resolveExercise);
    } else if (params.swap) {
      sessionRepo.swapExercise(params.swap, ids[0], resolveExercise);
    }
    router.back();
  };

  const onPressItem = (id: string) => {
    if (!picking) return router.push({ pathname: '/exercises/[id]', params: { id } });
    if (single) return confirm([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Screen
      header={
        <StackHeader
          title={t('exercises.title')}
          right={
            <IconButton
              icon="add"
              label={t('exercises.createCustom')}
              onPress={() =>
                router.push({
                  pathname: '/exercises/new',
                  params: params.routineId ? { routineId: params.routineId } : {},
                })
              }
              testID="exercises-new"
            />
          }
        />
      }
      testID="exercises"
    >
      <View style={styles.filters}>
        <TextField
          label={t('common.search')}
          placeholder={t('exercises.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          testID="exercise-search"
        />
        <MuscleFilter value={muscle} onChange={setMuscle} />
        <EquipmentFilter value={equipment} onChange={setEquipment} />
        {muscle ? (
          <View style={styles.toggleRow}>
            <AppText style={styles.flex}>{t('exercises.includeSecondary')}</AppText>
            <Toggle value={secondary} onValueChange={setSecondary} label={t('exercises.includeSecondary')} />
          </View>
        ) : null}
      </View>

      {results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          body={t('exercises.noResults')}
          actionLabel={t('exercises.createCustom')}
          onAction={() => router.push('/exercises/new')}
        />
      ) : (
        <CardGroup>
          {results.map((ex) => {
            const on = selected.includes(ex.id);
            return (
              <ListRow
                key={ex.id}
                title={exerciseName(ex, lang)}
                value={[
                  t(`exercises.muscles.${ex.primary}`),
                  t(`exercises.equipment.${ex.equipment}`),
                  ex.isCustom ? t('exercises.custom') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => onPressItem(ex.id)}
                right={
                  picking && !single ? (
                    <Icon
                      name={on ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={on ? p.accent : p.textSecondary}
                    />
                  ) : undefined
                }
                testID={`ex-${ex.id}`}
              />
            );
          })}
        </CardGroup>
      )}

      {picking && !single ? (
        <View style={styles.footer}>
          <Button
            title={`${t('exercises.addSelected')} · ${t('exercises.selected', { count: selected.length })}`}
            onPress={() => confirm(selected)}
            disabled={selected.length === 0}
            testID="exercises-add-selected"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing.sm, marginBottom: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  footer: { marginTop: spacing.lg },
});
