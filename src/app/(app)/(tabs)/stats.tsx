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
import { METRICS, latestBodyWeight, type Metric } from '../../../domain/stats';
import { displayWeight, formatWeight, weightToKg } from '../../../domain/units';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { exerciseDisplayName } from '../../../features/exercises/resolve';
import { logBodyWeight } from '../../../features/stats/bodyWeight';
import { DonutChart, KcalBars, ShareBars, TrendChart } from '../../../features/stats/charts';
import {
  buildShareItems,
  groupLabels,
  metricShortValue,
  periodLabel,
  sessionLine,
} from '../../../features/stats/labels';
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

  const statsView = buildStatsView(model, { period, anchor, metric, view, groupKey });
  const unit = model.unit;
  const unitLabel = t(`common.units.${unit}`);
  const formatKcal = (n: number) => `${formatNumber(n)} ${t('common.units.kcal')}`;
  const atLatest = statsView.range.end >= model.today;
  const programNameOrFallback = (name: string | null) => name ?? t('stats.noProgram');
  // กรุ๊ปที่ชื่อซ้ำกันต้องแยกออกด้วยป้ายต่อท้าย ไม่งั้นเลือกผิดอันไม่รู้ตัว (I5)
  const groupLabelByKey = groupLabels(statsView.groups, t('stats.noProgram'), (d) =>
    formatDateShort(parseLocalDate(d), parseLocalDate(model.today)),
  );
  const groupLabel = (key: string, name: string | null) =>
    groupLabelByKey.get(key) ?? programNameOrFallback(name);

  const shares = buildShareItems(statsView.breakdown, {
    t,
    metric,
    unit,
    chartColors: p.chart,
    groupLabel,
  });
  // ช่วงเวลาและตัวกรองกรุ๊ปที่ส่งต่อให้หน้าประวัติและหน้าความแข็งแรงต่อท่า
  const rangeParams = {
    period,
    from: statsView.range.start,
    to: statsView.range.end,
    ...(groupKey ? { group: groupKey } : {}),
  };
  const totalSets = statsView.sessions.reduce((s, x) => s + x.sets, 0);
  const totalVolume = statsView.sessions.reduce((s, x) => s + x.volumeKg, 0);

  const energy = statsView.energy;
  const bucketLabel = (start: string) => {
    const d = parseLocalDate(start);
    if (period === 'year') return monthShort(d.getMonth());
    if (period === 'week') return weekdayShort(d.getDay());
    return String(d.getDate());
  };
  const macros = energy.macrosPerDay;
  const latestWeight = latestBodyWeight(model.dailyLogs);
  const enteredKcalLine = (totals: { days: number; totalKcal: number }) =>
    totals.days > 0
      ? `${formatKcal(totals.totalKcal)} · ${t('stats.enteredDays', { count: totals.days })}`
      : '–';

  const saveBodyWeight = (value: number | null) => {
    if (value === null) {
      setWeighing(false);
      return;
    }
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
  };

  return (
    <Screen withTabBar testID="stats">
      <HeroTitle
        title={t('stats.title')}
        subtitle={
          statsView.group
            ? groupLabel(statsView.group.key, statsView.group.programName)
            : t('stats.allGroups')
        }
      />

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
          {periodLabel(period, statsView.range, model.today)}
        </AppText>
        <IconButton
          icon="chevron-forward"
          label={t('stats.next')}
          onPress={() => setAnchor(shiftPeriod(period, anchor, 1))}
          disabled={atLatest}
          testID="stats-next"
        />
      </View>

      {statsView.groups.length > 0 ? (
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
          {statsView.groups.map((g) => (
            <Chip
              key={g.key}
              label={groupLabel(g.key, g.programName)}
              selected={groupKey === g.key}
              onPress={() => setGroupKey(g.key)}
              testID={`group-${g.key}`}
            />
          ))}
        </ScrollView>
      ) : null}

      <SectionTitle>{t('stats.activity')}</SectionTitle>
      {statsView.sessions.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
      ) : (
        <>
          <Card>
            <AppText variant="headline" testID="stats-totals">
              {[
                t('stats.totalSessions', { count: statsView.sessions.length }),
                t('stats.totalSets', { count: totalSets }),
                t('stats.totalVolume', {
                  volume: formatNumber(displayWeight(totalVolume, unit)),
                  unit: unitLabel,
                }),
              ].join(' · ')}
            </AppText>
            {statsView.group ? (
              <AppText variant="caption" secondary>
                {`${t('stats.groupFilter')}: ${groupLabel(statsView.group.key, statsView.group.programName)}`}
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
            {shares === null ? (
              <AppText secondary align="center" testID="stats-needs-group">
                {t('stats.chooseGroup')}
              </AppText>
            ) : shares.items.length === 0 ? (
              <AppText secondary align="center" testID="stats-empty-metric">
                {t(`stats.emptyMetric.${metric}`)}
              </AppText>
            ) : (
              <>
                <DonutChart
                  items={shares.items}
                  centerValue={metricShortValue(metric, shares.total, unit)}
                  centerCaption={metric === 'volume' ? unitLabel : t(`stats.metrics.${metric}`)}
                  a11yLabel={t('stats.chartA11y', {
                    title: t(`stats.views.${view}`),
                    items: shares.items
                      .map((s) => t('stats.share', { label: s.label, percent: s.percent }))
                      .join(', '),
                  })}
                />
                <ShareBars items={shares.items} />
              </>
            )}
          </Card>

          <View style={styles.sectionRow}>
            <SectionTitle>{t('stats.history')}</SectionTitle>
            <Button
              title={t('stats.seeAll')}
              kind="plain"
              onPress={() => router.push({ pathname: '/history', params: rangeParams })}
              testID="stats-see-all"
            />
          </View>
          <CardGroup>
            {statsView.sessions.slice(0, RECENT_LIMIT).map((s) => (
              <ListRow
                key={s.sessionId}
                title={s.routineName ?? t('session.freeSession')}
                value={[
                  formatDateShort(parseLocalDate(s.date), parseLocalDate(model.today)),
                  programNameOrFallback(s.programName),
                  sessionLine(t, s, unit),
                ].join(' · ')}
                onPress={() => router.push({ pathname: '/history/[id]', params: { id: s.sessionId } })}
                testID={`stats-session-${s.sessionId}`}
              />
            ))}
          </CardGroup>

          {statsView.strength.length > 0 ? (
            <>
              <SectionTitle>{t('stats.strength')}</SectionTitle>
              <AppText variant="caption" secondary style={styles.hint}>
                {t('stats.strengthHint')}
              </AppText>
              <CardGroup>
                {statsView.strength.map((s) => (
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
                      router.push({
                        pathname: '/stats/exercise/[id]',
                        params: { id: s.exerciseId, ...rangeParams },
                      })
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
      {statsView.group ? (
        <AppText variant="caption" secondary style={styles.hint} testID="stats-energy-all-programs">
          {t('stats.allProgramsNote')}
        </AppText>
      ) : null}
      {energy.series.length > 1 ? (
        <Card style={styles.gapBottom}>
          <KcalBars
            points={energy.series.map((x) => ({ label: bucketLabel(x.start), value: x.exerciseKcal }))}
            a11yLabel={`${t('stats.exerciseKcal')}: ${formatKcal(energy.exerciseKcal)}`}
          />
        </Card>
      ) : null}
      <CardGroup>
        <ListRow
          title={t('stats.exerciseKcal')}
          value={formatKcal(energy.exerciseKcal)}
          testID="energy-exercise"
        />
        <ListRow title={t('stats.dayKcal')} value={enteredKcalLine(energy.expenditure)} />
        <ListRow
          title={t('stats.intakeKcal')}
          value={enteredKcalLine(energy.intake)}
          testID="energy-intake"
        />
        {energy.tdeeKcal != null ? (
          <ListRow title={t('stats.tdee')} value={formatKcal(energy.tdeeKcal)} testID="energy-tdee" />
        ) : null}
        {energy.targetKcal != null ? (
          <ListRow title={t('stats.target')} value={formatKcal(energy.targetKcal)} />
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
      {statsView.group ? (
        <AppText variant="caption" secondary style={styles.hint} testID="stats-weight-all-programs">
          {t('stats.allProgramsNote')}
        </AppText>
      ) : null}
      <Card>
        {statsView.weight.length >= 2 ? (
          <TrendChart
            points={statsView.weight.map((w) => ({
              label: formatDateShort(parseLocalDate(w.date), parseLocalDate(model.today)),
              value: displayWeight(w.weightKg, unit),
            }))}
            a11yLabel={`${t('stats.weight')}: ${statsView.weight
              .map((w) => `${formatWeight(w.weightKg, unit)} ${unitLabel}`)
              .join(', ')}`}
          />
        ) : statsView.weight.length === 0 ? (
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
        max={unit === 'lb' ? 700 : PROFILE_RANGES.weightKg.max}
        onClose={() => setWeighing(false)}
        onSubmit={saveBodyWeight}
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
