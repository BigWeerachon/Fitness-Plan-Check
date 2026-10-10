import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  AppText,
  Card,
  CardGroup,
  EmptyState,
  HeroTitle,
  ListRow,
  Screen,
  SectionTitle,
  StackHeader,
} from '../../../../components';
import { parseLocalDate } from '../../../../domain/dates';
import { strengthSeries } from '../../../../domain/stats';
import { displayWeight, formatWeight } from '../../../../domain/units';
import { useRepoQuery } from '../../../../features/data/useRepoQuery';
import { exerciseDisplayName } from '../../../../features/exercises/resolve';
import { TrendChart } from '../../../../features/stats/charts';
import { loadStats } from '../../../../features/stats/loadStats';
import { formatDateShort } from '../../../../i18n/format';
import { spacing } from '../../../../theme/tokens';

/** กราฟความแข็งแรงต่อท่า (SPEC I4): 1RM โดยประมาณด้วยสูตร Epley ต่อวันที่ฝึก */
export default function ExerciseStrengthScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const model = useRepoQuery(loadStats, i18n.language);
  const series = strengthSeries(model.data, id);
  const unit = model.unit;
  const unitLabel = t(`common.units.${unit}`);
  const today = parseLocalDate(model.today);
  const best = series.reduce<(typeof series)[number] | null>(
    (a, b) => (!a || b.e1rmKg > a.e1rmKg ? b : a),
    null,
  );

  return (
    <Screen header={<StackHeader title={t('stats.strengthTitle')} />} testID="exercise-strength">
      <HeroTitle title={exerciseDisplayName(id)} subtitle={t('stats.strengthHint')} compact />
      {series.length === 0 || !best ? (
        <EmptyState icon="barbell-outline" title={t('stats.noStrength')} />
      ) : (
        <>
          <Card>
            <AppText variant="headline" accent testID="strength-best">
              {t('stats.best', {
                value: formatWeight(best.e1rmKg, unit),
                unit: unitLabel,
                weight: formatWeight(best.weightKg, unit),
                reps: best.reps,
              })}
            </AppText>
            {series.length >= 2 ? (
              <TrendChart
                points={series.map((s) => ({
                  label: formatDateShort(parseLocalDate(s.date), today),
                  value: displayWeight(s.e1rmKg, unit),
                }))}
                a11yLabel={`${t('stats.strength')}: ${series
                  .map((s) => `${formatWeight(s.e1rmKg, unit)} ${unitLabel}`)
                  .join(', ')}`}
              />
            ) : null}
          </Card>
          <SectionTitle>{t('stats.history')}</SectionTitle>
          <CardGroup style={styles.group}>
            {[...series].reverse().map((s) => (
              <ListRow
                key={s.date}
                title={`${formatWeight(s.e1rmKg, unit)} ${unitLabel}`}
                value={`${formatDateShort(parseLocalDate(s.date), today)} · ${formatWeight(s.weightKg, unit)} ${unitLabel} × ${s.reps}`}
                testID={`strength-point-${s.date}`}
              />
            ))}
          </CardGroup>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.lg },
});
