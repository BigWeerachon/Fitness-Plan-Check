import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  BigRow,
  Button,
  CardGroup,
  EmptyState,
  ErrorState,
  HeroTitle,
  Icon,
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
import type { RoutineType } from '../../../db/schema';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { exerciseInfo } from '../../../features/exercises/resolve';
import { RoutineTypePicker } from '../../../features/programs/RoutineTypePicker';
import { spacing } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';

/** รายละเอียดกรุ๊ป: รายการ routine ที่สร้างไว้ เพิ่ม/เปลี่ยนชื่อ/ลบ/ตั้งเป็นโปรแกรมที่ใช้ (SPEC F2, F3) */
export default function ProgramScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => {
    const program = programRepo.get(id);
    if (!program) return null;
    const routines = routineRepo.listByProgram(id).map((r) => {
      const exercises = routineExerciseRepo.listByRoutine(r.id);
      const muscles = [...new Set(exercises.map((e) => exerciseInfo(e.exerciseId)?.primary).filter(Boolean))];
      return { routine: r, count: exercises.length, muscles };
    });
    return { program, routines, isActive: profileRepo.get()?.activeProgramId === id };
  }, id);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<RoutineType>('other');

  if (!data) {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState />
      </Screen>
    );
  }

  const addRoutine = () => {
    if (!name.trim()) return;
    const r = routineRepo.create(id, name, type);
    if (data.isActive) weekPlanRepo.ensureEntry(id, r.id, []);
    setAdding(false);
    setName('');
    router.push({ pathname: '/routine/[id]', params: { id: r.id } });
  };

  const remove = () => {
    Alert.alert(t('programs.deleteProgram'), t('programs.deleteProgramConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          if (data.isActive) weekPlanRepo.setActiveProgram(null);
          programRepo.remove(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      header={
        <StackHeader
          title={data.program.name}
          right={
            <IconButton
              icon="ellipsis-vertical"
              label={t('a11y.menu')}
              onPress={() => setMenu(true)}
              testID="program-menu"
            />
          }
        />
      }
      testID="program-detail"
    >
      <HeroTitle title={data.program.name} subtitle={data.isActive ? t('programs.active') : null} compact />
      {!data.isActive ? (
        <Button
          title={t('programs.useProgram')}
          kind="secondary"
          onPress={() => weekPlanRepo.setActiveProgram(id)}
          testID="program-use"
        />
      ) : null}

      <SectionTitle>{t('programs.routines')}</SectionTitle>
      {data.routines.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title={t('programs.noRoutines')}
          body={t('programs.noRoutinesBody')}
        />
      ) : (
        <CardGroup>
          {data.routines.map(({ routine, count, muscles }) => (
            <BigRow
              key={routine.id}
              title={routine.name}
              below={
                <AppText variant="callout" secondary numberOfLines={2}>
                  {[
                    t(`programs.types.${routine.type}`),
                    t('today.exercisesCount', { count }),
                    muscles.map((m) => t(`exercises.muscles.${m}`)).join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              }
              right={<Icon name="chevron-forward" size={22} color={p.textSecondary} />}
              onPress={() => router.push({ pathname: '/routine/[id]', params: { id: routine.id } })}
              testID={`routine-${routine.id}`}
            />
          ))}
        </CardGroup>
      )}
      <View style={styles.actions}>
        <Button
          title={t('programs.addRoutine')}
          icon="add"
          onPress={() => setAdding(true)}
          testID="program-add-routine"
        />
      </View>

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('programs.addRoutine')}>
        <TextField
          label={t('programs.routineName')}
          placeholder={t('programs.routineNamePlaceholder')}
          value={name}
          onChangeText={setName}
          testID="routine-name"
        />
        <AppText variant="caption" secondary>
          {t('programs.routineType')}
        </AppText>
        <RoutineTypePicker value={type} onChange={setType} />
        <Button
          title={t('common.create')}
          onPress={addRoutine}
          disabled={!name.trim()}
          testID="routine-create"
        />
      </Sheet>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('programs.rename')}>
        <TextField label={t('programs.newProgramName')} value={name} onChangeText={setName} />
        <Button
          title={t('common.save')}
          disabled={!name.trim()}
          onPress={() => {
            programRepo.rename(id, name);
            setRenaming(false);
            setName('');
          }}
        />
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={data.program.name}>
        <CardGroup>
          <ListRow
            title={t('programs.rename')}
            icon="create-outline"
            onPress={() => {
              setMenu(false);
              setName(data.program.name);
              setRenaming(true);
            }}
          />
          <ListRow
            title={t('programs.deleteProgram')}
            icon="trash-outline"
            danger
            onPress={() => {
              setMenu(false);
              remove();
            }}
          />
        </CardGroup>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: spacing.lg },
});
