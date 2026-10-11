import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  AppText,
  Card,
  CardGroup,
  Disclaimer,
  EmptyState,
  HeroTitle,
  ListRow,
  Screen,
  SectionTitle,
  StackHeader,
} from '../../../../components';
import { parseLocalDate } from '../../../../domain/dates';
import { PERIODS, type DateRange, type Period } from '../../../../domain/periods';
import { groupFilterOf, programGroups, strengthSeries } from '../../../../domain/stats';
import { displayWeight, formatWeight } from '../../../../domain/units';
import { useRepoQuery } from '../../../../features/data/useRepoQuery';
import { exerciseDisplayName } from '../../../../features/exercises/resolve';
import { TrendChart } from '../../../../features/stats/charts';
import { groupLabels, periodLabel } from '../../../../features/stats/labels';
import { loadStats } from '../../../../features/stats/loadStats';
import { formatDateShort } from '../../../../i18n/format';
import { spacing } from '../../../../theme/tokens';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * กราฟความแข็งแรงต่อท่า (SPEC I4): 1RM โดยประมาณด้วยสูตร Epley ต่อวันที่ฝึก
 * ตามกรุ๊ปและช่วงเวลาที่เลือกไว้ในแท็บสถิติ (D24, I5) — ไม่ส่งมา = ทุกกรุ๊ป ทุกช่วง
 */
export default function ExerciseStrengthScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    group?: string;
    period?: string;
    from?: string;
    to?: string;
  }>();
  const id = params.id;
  const model = useRepoQuery(loadStats, i18n.language);
  const unit = model.unit;
  const unitLabel = t(`common.units.${unit}`);
  const today = parseLocalDate(model.today);
  const groups = programGroups(model.data);
  const group = params.group ? groups.find((g) => g.key === params.group) : undefined;
  const range: DateRange | null =
    params.from && params.to && DATE_PARAM.test(params.from) && DATE_PARAM.test(params.to)
      ? { start: params.from, end: params.to }
      : null;
  const period = PERIODS.find((x) => x === params.period) as Period | undefined;
  const series = strengthSeries(model.data, id, { range, group: group ? groupFilterOf(group) : null });
  const labels = groupLabels(groups, t('stats.noProgram'), (d) => formatDateShort(parseLocalDate(d), today));
  const groupText = group ? (labels.get(group.key) ?? t('stats.noProgram')) : t('stats.allGroups');
  const scopeText = range
    ? `${groupText} · ${
        period
          ? periodLabel(period, range, model.today)
          : `${formatDateShort(parseLocalDate(range.start), today)} – ${formatDateShort(parseLocalDate(range.end), today)}`
      }`
    : groupText;
  const best = series.reduce<(typeof series)[number] | null>(
    (a, b) => (!a || b.e1rmKg > a.e1rmKg ? b : a),
    null,
  );

  return (
    <Screen header={<StackHeader title={t('stats.strengthTitle')} />} testID="exercise-strength">
      <HeroTitle title={exerciseDisplayName(id)} subtitle={scopeText} compact />
      <AppText variant="caption" secondary style={styles.hint}>
        {t('stats.strengthHint')}
      </AppText>
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
                value={[
                  formatDateShort(parseLocalDate(s.date), today),
                  `${formatWeight(s.weightKg, unit)} ${unitLabel} × ${s.reps}`,
                  s.programName ?? t('stats.noProgram'),
                ].join(' · ')}
                testID={`strength-point-${s.date}`}
              />
            ))}
          </CardGroup>
        </>
      )}
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.lg },
  hint: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
});
