import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Chip,
  Disclaimer,
  ErrorState,
  HeroTitle,
  Screen,
  SectionTitle,
  Sheet,
  StackHeader,
  Stepper,
  TextField,
} from '../../../../components';
import type { Intensity } from '../../../../db/schema';
import { displayWeight, weightToKg } from '../../../../domain/units';
import { useRepoQuery } from '../../../../features/data/useRepoQuery';
import {
  acceptSuggestion,
  declineSuggestion,
  finishSession,
  setCustomTarget,
  suggestionsFor,
  type ExerciseSuggestion,
} from '../../../../features/session/finish';
import { formatSet, isBodyweightExercise } from '../../../../features/session/formatSet';
import { loadSession } from '../../../../features/session/useSessionData';
import { formatDuration, formatNumber } from '../../../../i18n/format';
import { spacing } from '../../../../theme/tokens';

const INTENSITIES: Intensity[] = ['light', 'moderate', 'hard'];

/**
 * จบเซสชัน (SPEC G1/G2): เลือกความหนักเพื่อคำนวณแคลอรี่ → สรุปเซสชัน → "เป้าหมายครั้งหน้า" ที่ยอมรับ/ปรับ/ข้ามได้
 */
export default function SessionSummaryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => loadSession(id), id);
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [minutes, setMinutes] = useState(60);
  const [adjusting, setAdjusting] = useState<ExerciseSuggestion | null>(null);
  const suggestions = useRepoQuery(
    () => (data?.session.status === 'completed' ? suggestionsFor(id) : []),
    `${id}|${data?.session.status}`,
  );

  if (!data) {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState message={t('session.notFound')} />
      </Screen>
    );
  }
  const { session, totals, unit } = data;
  const unitLabel = t(`common.units.${unit}`);
  const target = (exerciseId: string, weightKg: number | null, reps: number) => ({
    target: formatSet(t, {
      weightKg,
      reps,
      unit,
      bodyweight: isBodyweightExercise(exerciseId),
      withUnit: true,
    }),
  });

  if (session.status === 'active') {
    return (
      <Screen header={<StackHeader title={t('session.summaryTitle')} />} testID="session-finish-form">
        <HeroTitle title={t('session.finishTitle')} subtitle={t('session.intensityHelp')} compact />
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('session.finishTitle')}
        >
          {INTENSITIES.map((i) => (
            <Chip
              key={i}
              label={t(`session.intensity.${i}`)}
              selected={intensity === i}
              onPress={() => setIntensity(i)}
              testID={`intensity-${i}`}
            />
          ))}
        </View>
        {session.backfilled ? (
          <Card style={styles.block}>
            <Stepper
              label={t('session.duration')}
              value={minutes}
              onChange={setMinutes}
              min={5}
              max={300}
              step={5}
              format={(v) => t('session.durationMin', { count: v })}
            />
          </Card>
        ) : null}
        <Button
          title={t('session.save')}
          onPress={() => finishSession(id, intensity, session.backfilled ? minutes * 60 : undefined)}
          style={styles.block}
          testID="session-save"
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={<StackHeader title={t('session.summaryTitle')} onBack={() => router.replace('/')} />}
      testID="session-summary"
    >
      <HeroTitle
        title={session.routineName ?? t('session.freeSession')}
        subtitle={session.programName}
        compact
      />
      <View style={styles.grid}>
        <Card style={styles.stat}>
          <AppText variant="caption" secondary>
            {t('session.duration')}
          </AppText>
          <AppText variant="headline">{formatDuration(session.durationSec ?? 0)}</AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText variant="caption" secondary>
            {t('session.sets')}
          </AppText>
          <AppText variant="headline">{totals.setsDone}</AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText variant="caption" secondary>
            {t('session.volume')}
          </AppText>
          <AppText variant="headline">{`${formatNumber(displayWeight(totals.volumeKg, unit))} ${unitLabel}`}</AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText variant="caption" secondary>
            {t('session.kcal')}
          </AppText>
          <AppText variant="headline" testID="summary-kcal">
            {session.kcal != null
              ? `${formatNumber(session.kcal)} ${t('common.units.kcal')}`
              : t('session.none')}
          </AppText>
        </Card>
      </View>
      {session.kcal == null ? (
        <AppText variant="caption" secondary align="center">
          {t('session.kcalUnknown')}
        </AppText>
      ) : null}
      <Card style={styles.block}>
        <AppText variant="caption" secondary>
          {t('session.muscles')}
        </AppText>
        <AppText>
          {totals.musclesDone.map((m) => t(`exercises.muscles.${m}`)).join(', ') || t('session.none')}
        </AppText>
      </Card>
      <Disclaimer />

      {suggestions.length > 0 ? (
        <>
          <SectionTitle>{t('session.nextTargets')}</SectionTitle>
          <AppText variant="caption" secondary style={styles.hint}>
            {t('session.nextTargetsHint')}
          </AppText>
          <View style={styles.list}>
            {suggestions.map((s) => {
              const tg = target(
                s.routineExercise.exerciseId,
                s.suggestion.targetWeightKg,
                s.suggestion.targetReps,
              );
              const decision = s.decision;
              return (
                <Card key={s.sessionExerciseId}>
                  <AppText variant="headline">{s.exerciseName}</AppText>
                  <AppText accent testID={`suggestion-${s.routineExercise.exerciseId}`}>
                    {t(`session.reason.${s.suggestion.reason}`, tg)}
                  </AppText>
                  {decision ? (
                    <AppText variant="caption" secondary>
                      {decision === 'skipped' ? t('session.skipped') : t('session.accepted')}
                    </AppText>
                  ) : (
                    <View style={styles.row}>
                      <Button
                        title={t('session.accept')}
                        onPress={() => acceptSuggestion(s)}
                        style={styles.flex}
                        testID={`accept-${s.routineExercise.exerciseId}`}
                      />
                      <Button
                        title={t('session.adjust')}
                        kind="secondary"
                        onPress={() => setAdjusting(s)}
                        style={styles.flex}
                      />
                      <Button
                        title={t('session.skip')}
                        kind="plain"
                        onPress={() => declineSuggestion(s)}
                        testID={`skip-${s.routineExercise.exerciseId}`}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      <Button
        title={t('session.backHome')}
        onPress={() => router.replace('/')}
        style={styles.block}
        testID="summary-home"
      />

      <Sheet visible={!!adjusting} onClose={() => setAdjusting(null)} title={t('session.adjustTitle')}>
        {adjusting ? (
          <AdjustBody
            suggestion={adjusting}
            unit={unit}
            onSave={(weightKg, reps) => {
              setCustomTarget(adjusting, weightKg, reps);
              setAdjusting(null);
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

function AdjustBody({
  suggestion,
  unit,
  onSave,
}: {
  suggestion: ExerciseSuggestion;
  unit: 'kg' | 'lb';
  onSave: (weightKg: number | null, reps: number) => void;
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(
    suggestion.suggestion.targetWeightKg != null
      ? String(displayWeight(suggestion.suggestion.targetWeightKg, unit))
      : '',
  );
  const [reps, setReps] = useState(suggestion.suggestion.targetReps);
  const parsed = weight.trim() === '' ? null : Number(weight.replace(',', '.'));
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0);
  return (
    <View style={styles.list}>
      <AppText variant="headline" align="center">
        {suggestion.exerciseName}
      </AppText>
      <TextField
        label={t('session.enterWeight', { unit: t(`common.units.${unit}`) })}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        error={valid ? null : t('errors.invalidNumber')}
      />
      <Stepper label={t('session.enterReps')} value={reps} onChange={setReps} min={1} max={100} />
      <Button
        title={t('common.save')}
        disabled={!valid}
        onPress={() => onSave(parsed === null ? null : weightToKg(parsed, unit), reps)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  block: { marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: '45%' },
  hint: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
});
