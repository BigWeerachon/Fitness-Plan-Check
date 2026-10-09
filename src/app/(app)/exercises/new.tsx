import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Chip, Screen, StackHeader, TextField, HeroTitle } from '../../../components';
import { customExerciseRepo } from '../../../db/repos/customExerciseRepo';
import { profileRepo } from '../../../db/repos/profileRepo';
import { routineExerciseRepo } from '../../../db/repos/routineExerciseRepo';
import type { Equipment, MuscleGroup } from '../../../db/schema';
import { EQUIPMENT, MUSCLE_GROUPS } from '../../../data/exerciseLibrary';
import { defaultWeightStepKg } from '../../../domain/progression';
import { spacing } from '../../../theme/tokens';

/** สร้างท่าเอง (SPEC F7): ต้องมีกลุ่มกล้ามเนื้อหลัก 1 กลุ่ม + กลุ่มรอง/อุปกรณ์/โน้ต */
export default function NewExerciseScreen() {
  const { t } = useTranslation();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<MuscleGroup | null>(null);
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('other');
  const [notes, setNotes] = useState('');
  const valid = name.trim().length > 0 && primary !== null;

  const save = () => {
    if (!valid || !primary) return;
    const ex = customExerciseRepo.create({
      name,
      primaryMuscle: primary,
      secondaryMuscles: secondary.filter((m) => m !== primary),
      equipment,
      notes: notes.trim() || null,
    });
    if (routineId) {
      const unit = profileRepo.get()?.weightUnit ?? 'kg';
      routineExerciseRepo.add(routineId, ex.id, { weightStepKg: defaultWeightStepKg(unit), targetReps: 8 });
    }
    router.back();
  };

  return (
    <Screen header={<StackHeader title={t('exercises.newTitle')} />} testID="exercise-new">
      <HeroTitle title={t('exercises.createCustom')} compact />
      <View style={styles.gap}>
        <TextField
          label={t('exercises.name')}
          placeholder={t('exercises.namePlaceholder')}
          value={name}
          onChangeText={setName}
          error={name.length > 0 && !name.trim() ? t('errors.required') : null}
          testID="custom-name"
        />
        <AppText variant="caption" secondary>
          {t('exercises.primary')}
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('exercises.primary')}>
          {MUSCLE_GROUPS.map((m) => (
            <Chip
              key={m}
              label={t(`exercises.muscles.${m}`)}
              selected={primary === m}
              onPress={() => setPrimary(m)}
              testID={`primary-${m}`}
            />
          ))}
        </View>
        <AppText variant="caption" secondary>
          {t('exercises.secondary')}
        </AppText>
        <View style={styles.chips}>
          {MUSCLE_GROUPS.filter((m) => m !== primary).map((m) => (
            <Chip
              key={m}
              role="checkbox"
              label={t(`exercises.muscles.${m}`)}
              selected={secondary.includes(m)}
              onPress={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}
            />
          ))}
        </View>
        <AppText variant="caption" secondary>
          {t('exercises.equipmentLabel')}
        </AppText>
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('exercises.equipmentLabel')}
        >
          {EQUIPMENT.map((e) => (
            <Chip
              key={e}
              label={t(`exercises.equipment.${e}`)}
              selected={equipment === e}
              onPress={() => setEquipment(e)}
            />
          ))}
        </View>
        <TextField label={t('exercises.notes')} value={notes} onChangeText={setNotes} multiline />
        <Button title={t('exercises.saveExercise')} onPress={save} disabled={!valid} testID="custom-save" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
