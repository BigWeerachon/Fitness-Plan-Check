import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  CardGroup,
  Disclaimer,
  ErrorState,
  HeroTitle,
  ListRow,
  Screen,
  SectionTitle,
  StackHeader,
} from '../../../components';
import { sessionRepo } from '../../../db/repos/sessionRepo';
import { parseLocalDate } from '../../../domain/dates';
import { displayWeight, formatWeight } from '../../../domain/units';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { exerciseDisplayName } from '../../../features/exercises/resolve';
import { loadSession } from '../../../features/session/useSessionData';
import { formatDateLong, formatDuration, formatNumber, formatTime } from '../../../i18n/format';
import { spacing } from '../../../theme/tokens';

/** รายละเอียดเซสชันจากประวัติ (SPEC I1): ท่า เซ็ต น้ำหนัก × ครั้ง ปริมาณรวม แคลอรี่ — ลบเซสชันได้ */
export default function HistoryDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => loadSession(id), `${id}|${i18n.language}`);

  if (!data || data.session.status !== 'completed') {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState message={t('session.notFound')} />
      </Screen>
    );
  }
  const { session, totals, unit } = data;
  const unitLabel = t(`common.units.${unit}`);

  const remove = () =>
    Alert.alert(t('stats.deleteSession'), t('stats.deleteSessionConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          sessionRepo.remove(id);
          router.back();
        },
      },
    ]);

  const facts: { label: string; value: string }[] = [
    {
      label: t('session.duration'),
      value: formatDuration(session.durationSec ?? 0),
    },
    { label: t('session.sets'), value: String(totals.setsDone) },
    {
      label: t('session.volume'),
      value: `${formatNumber(displayWeight(totals.volumeKg, unit))} ${unitLabel}`,
    },
    {
      label: t('session.kcal'),
      value:
        session.kcal != null ? `${formatNumber(session.kcal)} ${t('common.units.kcal')}` : t('session.none'),
    },
  ];

  return (
    <Screen header={<StackHeader title={t('stats.sessionDetailTitle')} />} testID="history-detail">
      <HeroTitle
        title={session.routineName ?? t('session.freeSession')}
        subtitle={[
          session.programName ?? t('stats.noProgram'),
          `${formatDateLong(parseLocalDate(session.date))} ${formatTime(new Date(session.startedAt))}`,
        ].join(' · ')}
        compact
      />
      <View style={styles.grid}>
        {facts.map((f) => (
          <Card key={f.label} style={styles.stat}>
            <AppText variant="caption" secondary>
              {f.label}
            </AppText>
            <AppText variant="headline">{f.value}</AppText>
          </Card>
        ))}
      </View>
      <CardGroup style={styles.block}>
        {session.intensity ? (
          <ListRow title={t('stats.intensity')} value={t(`session.intensity.${session.intensity}`)} />
        ) : null}
        <ListRow
          title={t('session.muscles')}
          value={totals.musclesDone.map((m) => t(`exercises.muscles.${m}`)).join(', ') || t('session.none')}
        />
        {session.backfilled ? <ListRow title={t('stats.backfilled')} icon="time-outline" /> : null}
      </CardGroup>

      <SectionTitle>{t('stats.exercises')}</SectionTitle>
      <View style={styles.list}>
        {data.exercises.map(({ exercise, sets }) => {
          const done = sets.filter((s) => s.done);
          return (
            <Card key={exercise.id}>
              <AppText variant="headline">{exerciseDisplayName(exercise.exerciseId)}</AppText>
              {done.length === 0 ? (
                <AppText secondary>{t('session.none')}</AppText>
              ) : (
                done.map((s, i) => (
                  <AppText key={s.id} secondary testID={`history-set-${exercise.exerciseId}-${i}`}>
                    {`${i + 1}. ${
                      s.weightKg != null
                        ? `${formatWeight(s.weightKg, unit)} ${unitLabel}`
                        : t('session.bodyweight')
                    } × ${s.reps ?? 0}`}
                  </AppText>
                ))
              )}
            </Card>
          );
        })}
      </View>
      <Disclaimer />
      <Button
        title={t('stats.deleteSession')}
        kind="plain"
        icon="trash-outline"
        onPress={remove}
        style={styles.block}
        testID="history-delete"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: '45%' },
  block: { marginTop: spacing.lg },
  list: { gap: spacing.md },
});
