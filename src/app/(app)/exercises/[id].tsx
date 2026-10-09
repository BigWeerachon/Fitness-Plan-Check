import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, ErrorState, HeroTitle, Screen, StackHeader } from '../../../components';
import { customExerciseRepo } from '../../../db/repos/customExerciseRepo';
import { exerciseName, localized } from '../../../data/exerciseLibrary';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { exerciseInfo } from '../../../features/exercises/resolve';
import { currentLanguage } from '../../../i18n';
import { spacing } from '../../../theme/tokens';

/** รายละเอียดท่า: กลุ่มกล้ามเนื้อหลัก/รอง อุปกรณ์ คำอธิบายสั้นที่เขียนเอง (F7, F9) และลิงก์กราฟความแข็งแรง (I4) */
export default function ExerciseDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = currentLanguage();
  const ex = useRepoQuery(() => exerciseInfo(id), id);
  if (!ex) {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState />
      </Screen>
    );
  }
  const name = exerciseName(ex, lang);
  return (
    <Screen header={<StackHeader title={t('exercises.detailTitle')} />} testID="exercise-detail">
      <HeroTitle title={name} subtitle={t(`exercises.equipment.${ex.equipment}`)} compact />
      <View style={styles.gap}>
        <Card>
          <AppText variant="caption" secondary>
            {t('exercises.primary')}
          </AppText>
          <AppText variant="headline" accent>
            {t(`exercises.muscles.${ex.primary}`)}
          </AppText>
          {ex.secondary.length > 0 ? (
            <>
              <AppText variant="caption" secondary style={styles.top}>
                {t('exercises.secondary')}
              </AppText>
              <AppText>{ex.secondary.map((m) => t(`exercises.muscles.${m}`)).join(', ')}</AppText>
            </>
          ) : null}
        </Card>
        {ex.description ? (
          <Card>
            <AppText variant="caption" secondary>
              {t('exercises.howTo')}
            </AppText>
            <AppText>{localized(ex.description, lang)}</AppText>
          </Card>
        ) : null}
        <Button
          title={t('stats.strengthTitle')}
          kind="secondary"
          icon="trending-up-outline"
          onPress={() => router.push({ pathname: '/stats/exercise/[id]', params: { id } })}
        />
        {ex.isCustom ? (
          <Button
            title={t('exercises.deleteExercise')}
            kind="danger"
            onPress={() =>
              Alert.alert(t('exercises.deleteExercise'), t('exercises.deleteConfirm'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: () => {
                    customExerciseRepo.remove(id);
                    router.back();
                  },
                },
              ])
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  top: { marginTop: spacing.sm },
});
