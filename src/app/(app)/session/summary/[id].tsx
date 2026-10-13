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
import type { Intensity, WeightUnit } from '../../../../db/schema';
import { displayWeight, parseWeightInput, weightToKg } from '../../../../domain/units';
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
import { SessionStatsGrid, sessionFacts } from '../../../../features/session/SessionStatsGrid';
import { loadSession } from '../../../../features/session/useSessionData';
import { muscleNames } from '../../../../i18n/format';
import { spacing } from '../../../../theme/tokens';

const INTENSITIES: Intensity[] = ['light', 'moderate', 'hard'];
/** ระยะเวลา (นาที) ของเซสชันย้อนหลังที่ผู้ใช้ต้องกรอกเอง */
const BACKFILL_MINUTES = { initial: 60, min: 5, max: 300, step: 5 } as const;

/**
 * จบเซสชัน (SPEC G1/G2): เลือกความหนักเพื่อคำนวณแคลอรี่ → สรุปเซสชัน → "เป้าหมายครั้งหน้า" ที่ยอมรับ/ปรับ/ข้ามได้
 */
export default function SessionSummaryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => loadSession(id), id);
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
  // พารามิเตอร์ `{ target }` ของข้อความเหตุผลในใบเสนอเป้าหมายครั้งหน้า (session.reason.*)
  const suggestionTargetParams = (exerciseId: string, weightKg: number | null, reps: number) => ({
    target: formatSet(t, {
      weightKg,
      reps,
      unit,
      bodyweight: isBodyweightExercise(exerciseId),
      withUnit: true,
    }),
  });

  if (session.status === 'active')
    return <FinishSessionForm sessionId={id} backfilled={session.backfilled} />;

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
      <SessionStatsGrid facts={sessionFacts(t, session, totals, unit, 'summary-kcal')} />
      {session.kcal == null ? (
        <AppText variant="caption" secondary align="center">
          {t('session.kcalUnknown')}
        </AppText>
      ) : null}
      <Card style={styles.block}>
        <AppText variant="caption" secondary>
          {t('session.muscles')}
        </AppText>
        <AppText>{muscleNames(t, totals.musclesDone) || t('session.none')}</AppText>
      </Card>
      <Disclaimer />

      {suggestions.length > 0 ? (
        <>
          <SectionTitle>{t('session.nextTargets')}</SectionTitle>
          <AppText variant="caption" secondary style={styles.hint}>
            {t('session.nextTargetsHint')}
          </AppText>
          <View style={styles.list}>
            {suggestions.map((exerciseSuggestion) => {
              const targetParams = suggestionTargetParams(
                exerciseSuggestion.routineExercise.exerciseId,
                exerciseSuggestion.suggestion.targetWeightKg,
                exerciseSuggestion.suggestion.targetReps,
              );
              const decision = exerciseSuggestion.decision;
              return (
                <Card key={exerciseSuggestion.sessionExerciseId}>
                  <AppText variant="headline">{exerciseSuggestion.exerciseName}</AppText>
                  <AppText accent testID={`suggestion-${exerciseSuggestion.routineExercise.exerciseId}`}>
                    {t(`session.reason.${exerciseSuggestion.suggestion.reason}`, targetParams)}
                  </AppText>
                  {decision ? (
                    <AppText variant="caption" secondary>
                      {decision === 'skipped' ? t('session.skipped') : t('session.accepted')}
                    </AppText>
                  ) : (
                    <View style={styles.row}>
                      <Button
                        title={t('session.accept')}
                        onPress={() => acceptSuggestion(exerciseSuggestion)}
                        style={styles.flex}
                        testID={`accept-${exerciseSuggestion.routineExercise.exerciseId}`}
                      />
                      <Button
                        title={t('session.adjust')}
                        kind="secondary"
                        onPress={() => setAdjusting(exerciseSuggestion)}
                        style={styles.flex}
                      />
                      <Button
                        title={t('session.skip')}
                        kind="plain"
                        onPress={() => declineSuggestion(exerciseSuggestion)}
                        testID={`skip-${exerciseSuggestion.routineExercise.exerciseId}`}
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

/** ฟอร์มจบเซสชันที่ยังไม่จบ (เลือกความหนัก + ระยะเวลาถ้าเป็นเซสชันย้อนหลัง) — บันทึกแล้วหน้านี้จะเปลี่ยนเป็นหน้าสรุป */
function FinishSessionForm({ sessionId, backfilled }: { sessionId: string; backfilled: boolean }) {
  const { t } = useTranslation();
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [minutes, setMinutes] = useState<number>(BACKFILL_MINUTES.initial);
  return (
    <Screen header={<StackHeader title={t('session.summaryTitle')} />} testID="session-finish-form">
      <HeroTitle title={t('session.finishTitle')} subtitle={t('session.intensityHelp')} compact />
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('session.finishTitle')}>
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
      {backfilled ? (
        <Card style={styles.block}>
          <Stepper
            label={t('session.duration')}
            value={minutes}
            onChange={setMinutes}
            min={BACKFILL_MINUTES.min}
            max={BACKFILL_MINUTES.max}
            step={BACKFILL_MINUTES.step}
            format={(v) => t('session.durationMin', { count: v })}
          />
        </Card>
      ) : null}
      <Button
        title={t('session.save')}
        onPress={() => finishSession(sessionId, intensity, backfilled ? minutes * 60 : undefined)}
        style={styles.block}
        testID="session-save"
      />
    </Screen>
  );
}

function AdjustBody({
  suggestion,
  unit,
  onSave,
}: {
  suggestion: ExerciseSuggestion;
  unit: WeightUnit;
  onSave: (weightKg: number | null, reps: number) => void;
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(
    suggestion.suggestion.targetWeightKg != null
      ? String(displayWeight(suggestion.suggestion.targetWeightKg, unit))
      : '',
  );
  const [reps, setReps] = useState(suggestion.suggestion.targetReps);
  const { valid, value: weightValue } = parseWeightInput(weight);
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
        onPress={() => onSave(weightValue === null ? null : weightToKg(weightValue, unit), reps)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  block: { marginTop: spacing.lg },
  hint: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
});
