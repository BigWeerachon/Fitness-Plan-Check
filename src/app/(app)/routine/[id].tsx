import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CardGroup,
  EmptyState,
  ErrorState,
  HeroTitle,
  IconButton,
  ListRow,
  Screen,
  SectionTitle,
  Sheet,
  StackHeader,
  TextField,
} from '../../../components';
import { profileRepo } from '../../../db/repos/profileRepo';
import { programRepo, routineRepo } from '../../../db/repos/programRepo';
import { routineExerciseRepo } from '../../../db/repos/routineExerciseRepo';
import { weekPlanRepo } from '../../../db/repos/weekPlanRepo';
import type { RoutineExercise } from '../../../db/schema';
import { formatWeight } from '../../../domain/units';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { exerciseDisplayName, exerciseInfo } from '../../../features/exercises/resolve';
import { ExerciseSettingsSheet } from '../../../features/programs/ExerciseSettingsSheet';
import { RoutineTypePicker } from '../../../features/programs/RoutineTypePicker';
import { startSession } from '../../../features/session/sessionFlow';
import { spacing } from '../../../theme/tokens';

type Move = 'copy' | 'move' | null;

/** แก้ไข routine: ชื่อ, แท็กประเภท (F5), ท่า + เซ็ตเป้าหมาย + progression (G2), คัดลอก/ย้ายข้ามกรุ๊ป (F3) */
export default function RoutineScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => {
    const routine = routineRepo.get(id);
    if (!routine) return null;
    const profile = profileRepo.get();
    return {
      routine,
      program: programRepo.get(routine.programId),
      exercises: routineExerciseRepo.listByRoutine(id),
      programs: programRepo.list(),
      unit: profile?.weightUnit ?? 'kg',
      defaultRest: profile?.restTimerSec ?? 90,
    };
  }, `${id}|${i18n.language}`);
  const [editing, setEditing] = useState<RoutineExercise | null>(null);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [move, setMove] = useState<Move>(null);

  if (!data) {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState />
      </Screen>
    );
  }
  const { routine, exercises, unit } = data;

  const reorder = (index: number, delta: number) => {
    const ids = exercises.map((e) => e.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    routineExerciseRepo.reorder(id, ids);
  };

  const remove = () =>
    Alert.alert(t('programs.deleteRoutine'), t('programs.deleteRoutineConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          routineRepo.remove(id);
          router.back();
        },
      },
    ]);

  const summary = (e: RoutineExercise) => {
    const reps =
      e.repMin === e.repMax
        ? t('programs.setsRepsFixed', { sets: e.sets, reps: e.repMin })
        : t('programs.setsReps', { sets: e.sets, min: e.repMin, max: e.repMax });
    const target =
      e.targetWeightKg != null
        ? `${t('programs.currentTarget')}: ${formatWeight(e.targetWeightKg, unit)} ${t(`common.units.${unit}`)} × ${e.targetReps ?? e.repMin}`
        : t('programs.noTarget');
    return [reps, t(`programs.modes.${e.progressionMode}`), target].join(' · ');
  };

  return (
    <Screen
      header={
        <StackHeader
          title={data.program?.name}
          right={
            <IconButton
              icon="ellipsis-vertical"
              label={t('a11y.menu')}
              onPress={() => setMenu(true)}
              testID="routine-menu"
            />
          }
        />
      }
      testID="routine-editor"
    >
      <HeroTitle title={routine.name} subtitle={t(`programs.types.${routine.type}`)} compact />

      <SectionTitle>{t('programs.routineType')}</SectionTitle>
      <RoutineTypePicker value={routine.type} onChange={(type) => routineRepo.update(id, { type })} />

      <SectionTitle>{t('programs.exercisesTitle')}</SectionTitle>
      {exercises.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title={t('programs.noExercises')}
          body={t('programs.noExercisesBody')}
        />
      ) : (
        <CardGroup>
          {exercises.map((e, i) => {
            const label = exerciseDisplayName(e.exerciseId);
            const muscle = exerciseInfo(e.exerciseId)?.primary;
            return (
              <View key={e.id}>
                <ListRow
                  title={label}
                  value={`${muscle ? `${t(`exercises.muscles.${muscle}`)} · ` : ''}${summary(e)}`}
                  onPress={() => setEditing(e)}
                  testID={`rex-${e.exerciseId}`}
                />
                <View style={styles.tools}>
                  <IconButton
                    icon="arrow-up"
                    size={20}
                    label={`${t('programs.moveUp')}: ${label}`}
                    onPress={() => reorder(i, -1)}
                    disabled={i === 0}
                  />
                  <IconButton
                    icon="arrow-down"
                    size={20}
                    label={`${t('programs.moveDown')}: ${label}`}
                    onPress={() => reorder(i, 1)}
                    disabled={i === exercises.length - 1}
                  />
                  <IconButton
                    icon="trash-outline"
                    size={20}
                    label={`${t('programs.removeExercise')}: ${label}`}
                    onPress={() => routineExerciseRepo.remove(e.id)}
                  />
                </View>
              </View>
            );
          })}
        </CardGroup>
      )}
      <View style={styles.actions}>
        <Button
          title={t('programs.addExercise')}
          icon="add"
          kind="secondary"
          onPress={() => router.push({ pathname: '/exercises', params: { routineId: id } })}
          testID="routine-add-exercise"
        />
        {exercises.length > 0 ? (
          <Button
            title={t('programs.startRoutine')}
            icon="play"
            onPress={() => {
              const { session } = startSession({ routineId: id });
              router.push({ pathname: '/session/[id]', params: { id: session.id } });
            }}
            testID="routine-start"
          />
        ) : null}
      </View>

      <ExerciseSettingsSheet
        visible={!!editing}
        title={editing ? exerciseDisplayName(editing.exerciseId) : ''}
        value={editing}
        unit={unit}
        defaultRestSec={data.defaultRest}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) routineExerciseRepo.update(editing.id, patch);
          setEditing(null);
        }}
      />

      <Sheet visible={menu} onClose={() => setMenu(false)} title={routine.name}>
        <CardGroup>
          <ListRow
            title={t('programs.rename')}
            icon="create-outline"
            onPress={() => {
              setMenu(false);
              setName(routine.name);
              setRenaming(true);
            }}
          />
          <ListRow
            title={t('programs.copyTo')}
            icon="copy-outline"
            onPress={() => {
              setMenu(false);
              setMove('copy');
            }}
          />
          <ListRow
            title={t('programs.moveTo')}
            icon="arrow-redo-outline"
            onPress={() => {
              setMenu(false);
              setMove('move');
            }}
          />
          <ListRow
            title={t('programs.deleteRoutine')}
            icon="trash-outline"
            danger
            onPress={() => {
              setMenu(false);
              remove();
            }}
          />
        </CardGroup>
      </Sheet>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('programs.rename')}>
        <TextField label={t('programs.routineName')} value={name} onChangeText={setName} />
        <Button
          title={t('common.save')}
          disabled={!name.trim()}
          onPress={() => {
            routineRepo.update(id, { name });
            setRenaming(false);
          }}
        />
      </Sheet>

      <Sheet visible={move !== null} onClose={() => setMove(null)} title={t('programs.pickProgram')}>
        <CardGroup>
          {data.programs
            .filter((p) => move === 'copy' || p.id !== routine.programId)
            .map((p) => (
              <ListRow
                key={p.id}
                title={p.name}
                onPress={() => {
                  if (move === 'copy') {
                    const copy = routineRepo.copyTo(id, p.id);
                    if (copy && profileRepo.get()?.activeProgramId === p.id)
                      weekPlanRepo.ensureEntry(p.id, copy.id);
                    Alert.alert(t('programs.copied'));
                  } else {
                    routineRepo.moveTo(id, p.id);
                    if (profileRepo.get()?.activeProgramId === p.id) weekPlanRepo.ensureEntry(p.id, id);
                    Alert.alert(t('programs.moved'));
                  }
                  setMove(null);
                }}
              />
            ))}
        </CardGroup>
        <AppText variant="caption" secondary>
          {move === 'copy' ? t('programs.copyTo') : t('programs.moveTo')}
        </AppText>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tools: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    marginTop: -spacing.sm,
  },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
