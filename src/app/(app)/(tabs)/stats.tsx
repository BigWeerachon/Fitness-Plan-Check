import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  CardGroup,
  Chip,
  Disclaimer,
  EmptyState,
  HeroTitle,
  IconButton,
  ListRow,
  NumberPad,
  Screen,
  SectionTitle,
  SegmentedControl,
} from '../../../components';
import { parseLocalDate } from '../../../domain/dates';
import { PERIODS, shiftPeriod, type Period } from '../../../domain/periods';
import { PROFILE_RANGES } from '../../../domain/profileInput';
import { METRICS, type Metric } from '../../../domain/stats';
import { displayWeight, formatWeight, weightToKg } from '../../../domain/units';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { exerciseDisplayName } from '../../../features/exercises/resolve';
import { logBodyWeight } from '../../../features/stats/bodyWeight';
import { DonutChart, KcalBars, ShareBars, TrendChart, type ShareItem } from '../../../features/stats/charts';
import { metricShortValue, metricValueLabel, periodLabel } from '../../../features/stats/labels';
import { loadStats } from '../../../features/stats/loadStats';
import { STATS_VIEWS, buildStatsView, type StatsViewKind } from '../../../features/stats/statsView';
import { formatDateShort, formatNumber, monthShort, weekdayShort } from '../../../i18n/format';
import { useSettings } from '../../../stores/settings';
import { spacing } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';

const RECENT_LIMIT = 5;

/**
 * สถิติ (SPEC I1–I5): ตัวสลับ วัน/สัปดาห์/เดือน/ปี ตัวเดียวใช้ทั้งหน้า ดูย้อนหลังได้, กรองกรุ๊ป,
 * สัดส่วน 3 มุมมอง (โดนัท + แท่ง + ตัวเลข รวม 100%), ประวัติ, ความแข็งแรง, พลังงาน, น้ำหนักตัว
 */
export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const p = usePalette();
  const model = useRepoQuery(loadStats, i18n.language);
  const metric = useSettings((s) => s.statsMetric);
  const setSetting = useSettings((s) => s.set);
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(model.today);
  const [view, setView] = useState<StatsViewKind>('program');
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [weighing, setWeighing] = useState(false);

  const v = buildStatsView(model, { period, anchor, metric, view, groupKey });
  const unit = model.unit;
  const unitLabel = t(`common.units.${unit}`);
  const kcal = (n: number) => `${formatNumber(n)} ${t('common.units.kcal')}`;
  const atLatest = v.range.end >= model.today;
  const groupName = (name: string | null) => name ?? t('stats.noProgram');

  const shareItems: ShareItem[] =
    v.breakdown.view === 'needsGroup'
      ? []
      : v.breakdown.breakdown.entries.map((e, i) => ({
          key: e.key,
          label:
            v.breakdown.view === 'program'
              ? groupName((e as { programName: string | null }).programName)
              : v.breakdown.view === 'routineType'
                ? t(`programs.types.${e.key}`)
                : t(`exercises.muscles.${e.key}`),
          value: e.value,
          percent: e.percent,
          valueLabel: metricValueLabel(t, metric, e.value, unit),
          color: p.chart[i % p.chart.length],
        }));
  const total = v.breakdown.view === 'needsGroup' ? 0 : v.breakdown.breakdown.total;
  const totalSets = v.sessions.reduce((s, x) => s + x.sets, 0);
  const totalVolume = v.sessions.reduce((s, x) => s + x.volumeKg, 0);

  const energy = v.energy;
  const bucketLabel = (start: string) => {
    const d = parseLocalDate(start);
    if (period === 'year') return monthShort(d.getMonth());
    if (period === 'week') return weekdayShort(d.getDay());
    return String(d.getDate());
  };
  const macros = energy.macrosPerDay;
  const latestWeight = model.dailyLogs
    .filter((l) => l.bodyWeightKg != null)
    .reduce<{ date: string; kg: number } | null>(
      (acc, l) => (!acc || l.date >= acc.date ? { date: l.date, kg: l.bodyWeightKg as number } : acc),
      null,
    );

  return (
    <Screen withTabBar testID="stats">
      <HeroTitle title={t('stats.title')} subtitle={periodLabel(period, v.range, model.today)} />

      <SegmentedControl
        label={t('stats.periodLabel')}
        value={period}
        onChange={setPeriod}
        options={PERIODS.map((x) => ({ value: x, label: t(`stats.periods.${x}`) }))}
      />
      <View style={styles.nav}>
        <IconButton
          icon="chevron-back"
          label={t('stats.previous')}
          onPress={() => setAnchor(shiftPeriod(period, anchor, -1))}
          testID="stats-prev"
        />
        <AppText variant="headline" align="center" style={styles.flex} testID="stats-period">
          {periodLabel(period, v.range, model.today)}
        </AppText>
        <IconButton
          icon="chevron-forward"
          label={t('stats.next')}
          onPress={() => setAnchor(shiftPeriod(period, anchor, 1))}
          disabled={atLatest}
          testID="stats-next"
        />
      </View>

      {v.groups.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('stats.groupFilter')}
        >
          <Chip
            label={t('stats.allGroups')}
            selected={groupKey === null}
            onPress={() => setGroupKey(null)}
            testID="group-all"
          />
          {v.groups.map((g) => (
            <Chip
              key={g.key}
              label={groupName(g.programName)}
              selected={groupKey === g.key}
              onPress={() => setGroupKey(g.key)}
              testID={`group-${g.key}`}
            />
          ))}
        </ScrollView>
      ) : null}

      <SectionTitle>{t('stats.activity')}</SectionTitle>
      {v.sessions.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
      ) : (
        <>
          <Card>
            <AppText variant="headline" testID="stats-totals">
              {[
                t('stats.totalSessions', { count: v.sessions.length }),
                t('stats.totalSets', { count: totalSets }),
                t('stats.totalVolume', {
                  volume: formatNumber(displayWeight(totalVolume, unit)),
                  unit: unitLabel,
                }),
              ].join(' · ')}
            </AppText>
            {v.group ? (
              <AppText variant="caption" secondary>
                {`${t('stats.groupFilter')}: ${groupName(v.group.programName)}`}
              </AppText>
            ) : null}
          </Card>

          <SectionTitle>{t('stats.viewLabel')}</SectionTitle>
          <SegmentedControl
            label={t('stats.viewLabel')}
            value={view}
            onChange={setView}
            options={STATS_VIEWS.map((x) => ({ value: x, label: t(`stats.views.${x}`) }))}
          />
          <SegmentedControl
            label={t('stats.metricLabel')}
            value={metric}
            onChange={(m: Metric) => setSetting('statsMetric', m)}
            options={METRICS.map((x) => ({ value: x, label: t(`stats.metrics.${x}`) }))}
            style={styles.gapTop}
          />
          <Card style={styles.gapTop}>
            {v.breakdown.view === 'needsGroup' ? (
              <AppText secondary align="center" testID="stats-needs-group">
                {t('stats.chooseGroup')}
              </AppText>
            ) : shareItems.length === 0 ? (
              <AppText secondary align="center">
                {t('stats.emptyTitle')}
              </AppText>
            ) : (
              <>
                <DonutChart
                  items={shareItems}
                  centerValue={metricShortValue(metric, total, unit)}
                  centerCaption={metric === 'volume' ? unitLabel : t(`stats.metrics.${metric}`)}
                  a11yLabel={t('stats.chartA11y', {
                    title: t(`stats.views.${view}`),
                    items: shareItems
                      .map((s) => t('stats.share', { label: s.label, percent: s.percent }))
                      .join(', '),
                  })}
                />
                <ShareBars items={shareItems} />
              </>
            )}
          </Card>

          <View style={styles.sectionRow}>
            <SectionTitle>{t('stats.history')}</SectionTitle>
            <Button
              title={t('stats.seeAll')}
              kind="plain"
              onPress={() =>
                router.push({ pathname: '/history', params: groupKey ? { group: groupKey } : {} })
              }
              testID="stats-see-all"
            />
          </View>
          <CardGroup>
            {v.sessions.slice(0, RECENT_LIMIT).map((s) => (
              <ListRow
                key={s.sessionId}
                title={s.routineName ?? t('session.freeSession')}
                value={[
                  formatDateShort(parseLocalDate(s.date), parseLocalDate(model.today)),
                  groupName(s.programName),
                  t('stats.sessionLine', {
                    exercises: s.exercises,
                    sets: s.sets,
                    volume: formatNumber(displayWeight(s.volumeKg, unit)),
                    unit: unitLabel,
                  }),
                ].join(' · ')}
                onPress={() => router.push({ pathname: '/history/[id]', params: { id: s.sessionId } })}
                testID={`stats-session-${s.sessionId}`}
              />
            ))}
          </CardGroup>

          {v.strength.length > 0 ? (
            <>
              <SectionTitle>{t('stats.strength')}</SectionTitle>
              <AppText variant="caption" secondary style={styles.hint}>
                {t('stats.strengthHint')}
              </AppText>
              <CardGroup>
                {v.strength.map((s) => (
                  <ListRow
                    key={s.exerciseId}
                    title={exerciseDisplayName(s.exerciseId)}
                    value={t('stats.best', {
                      value: formatWeight(s.best.e1rmKg, unit),
                      unit: unitLabel,
                      weight: formatWeight(s.best.weightKg, unit),
                      reps: s.best.reps,
                    })}
                    onPress={() =>
                      router.push({ pathname: '/stats/exercise/[id]', params: { id: s.exerciseId } })
                    }
                    testID={`strength-${s.exerciseId}`}
                  />
                ))}
              </CardGroup>
            </>
          ) : null}
        </>
      )}

      <SectionTitle>{t('stats.energy')}</SectionTitle>
      {energy.series.length > 1 ? (
        <Card style={styles.gapBottom}>
          <KcalBars
            points={energy.series.map((x) => ({ label: bucketLabel(x.start), value: x.exerciseKcal }))}
            a11yLabel={`${t('stats.exerciseKcal')}: ${kcal(energy.exerciseKcal)}`}
          />
        </Card>
      ) : null}
      <CardGroup>
        <ListRow title={t('stats.exerciseKcal')} value={kcal(energy.exerciseKcal)} testID="energy-exercise" />
        <ListRow
          title={t('stats.dayKcal')}
          value={
            energy.expenditure.days > 0
              ? `${kcal(energy.expenditure.totalKcal)} · ${t('stats.enteredDays', { count: energy.expenditure.days })}`
              : '–'
          }
        />
        <ListRow
          title={t('stats.intakeKcal')}
          value={
            energy.intake.days > 0
              ? `${kcal(energy.intake.totalKcal)} · ${t('stats.enteredDays', { count: energy.intake.days })}`
              : '–'
          }
          testID="energy-intake"
        />
        {energy.tdeeKcal != null ? (
          <ListRow title={t('stats.tdee')} value={kcal(energy.tdeeKcal)} testID="energy-tdee" />
        ) : null}
        {energy.targetKcal != null ? (
          <ListRow title={t('stats.target')} value={kcal(energy.targetKcal)} />
        ) : null}
        {macros ? (
          <ListRow
            title={t('stats.macros')}
            value={t('stats.macroLine', {
              protein: formatNumber(macros.proteinG),
              carbs: formatNumber(macros.carbsG),
              fat: formatNumber(macros.fatG),
            })}
          />
        ) : null}
      </CardGroup>
      {energy.tdeeKcal == null ? (
        <AppText variant="caption" secondary style={styles.hint}>
          {t('stats.noProfile')}
        </AppText>
      ) : null}

      <SectionTitle>{t('stats.weight')}</SectionTitle>
      <Card>
        {v.weight.length >= 2 ? (
          <TrendChart
            points={v.weight.map((w) => ({
              label: formatDateShort(parseLocalDate(w.date), parseLocalDate(model.today)),
              value: displayWeight(w.weightKg, unit),
            }))}
            a11yLabel={`${t('stats.weight')}: ${v.weight
              .map((w) => `${formatWeight(w.weightKg, unit)} ${unitLabel}`)
              .join(', ')}`}
          />
        ) : v.weight.length === 0 ? (
          <AppText secondary>{t('stats.noWeight')}</AppText>
        ) : null}
        {latestWeight ? (
          <AppText variant="caption" secondary testID="stats-latest-weight">
            {t('stats.latestWeight', {
              weight: formatWeight(latestWeight.kg, unit),
              unit: unitLabel,
              date: formatDateShort(parseLocalDate(latestWeight.date), parseLocalDate(model.today)),
            })}
          </AppText>
        ) : null}
        <Button
          title={t('stats.logWeight')}
          kind="secondary"
          icon="scale-outline"
          onPress={() => setWeighing(true)}
          style={styles.gapTop}
          testID="stats-log-weight"
        />
      </Card>
      <Disclaimer />

      <NumberPad
        visible={weighing}
        title={t('stats.enterWeight')}
        initial={model.currentWeightKg != null ? displayWeight(model.currentWeightKg, unit) : null}
        suffix={unitLabel}
        max={unit === 'lb' ? 700 : 300}
        onClose={() => setWeighing(false)}
        onSubmit={(value) => {
          if (value === null) return setWeighing(false);
          const kg = weightToKg(value, unit);
          const { min, max } = PROFILE_RANGES.weightKg;
          if (kg < min || kg > max) {
            Alert.alert(
              t('errors.outOfRange', {
                min: `${formatWeight(min, unit)} ${unitLabel}`,
                max: `${formatWeight(max, unit)} ${unitLabel}`,
              }),
            );
            return;
          }
          logBodyWeight(kg);
          setWeighing(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  flex: { flex: 1 },
  chips: { gap: spacing.sm, paddingVertical: spacing.sm },
  gapTop: { marginTop: spacing.md },
  gapBottom: { marginBottom: spacing.md },
  hint: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
