import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  ActionBar,
  AppText,
  Badge,
  BigRow,
  Button,
  Card,
  CardGroup,
  CircleButton,
  EmptyState,
  HeroTitle,
  Icon,
  IconButton,
  ListRow,
  NumberPad,
  Screen,
  SectionTitle,
  Sheet,
} from '../../../components';
import { dailyLogRepo } from '../../../db/repos/dailyLogRepo';
import { dayOverrideRepo } from '../../../db/repos/weekPlanRepo';
import { addDays, parseLocalDate } from '../../../domain/dates';
import { describeSubscription } from '../../../features/access/subscriptionInfo';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { startSession } from '../../../features/session/sessionFlow';
import { loadToday, type TodayRoutine } from '../../../features/today/useToday';
import { formatDateShort, formatNumber, formatRelativeDay, formatTime } from '../../../i18n/format';
import { useAuth } from '../../../stores/auth';
import { useEntitlement } from '../../../stores/entitlement';
import { radius, spacing } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';

type Entry = 'burned' | 'eaten' | null;

/**
 * หน้าแรก (SPEC D): เปิดแล้วรู้ทันทีว่าวันนี้ต้องทำอะไร — หัวข้อสีหลักใหญ่ + การ์ด routine ของวันนี้ (ปุ่มวงกลม "เริ่ม")
 * เปลี่ยนใจได้ใน 1–2 แตะ โดยบันทึกเป็น override ของวันนั้น (ไม่แก้ตารางประจำสัปดาห์)
 */
export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const p = usePalette();
  const model = useRepoQuery(() => loadToday(), i18n.language);
  const user = useAuth((s) => s.user);
  const cached = useEntitlement((s) => s.cached);
  const sub = describeSubscription(user ? cached : null, t);
  const [menu, setMenu] = useState(false);
  const [entry, setEntry] = useState<Entry>(null);
  const today = parseLocalDate(model.date);

  const open = (routineId: string | null, date?: string) => {
    const { session, resumed } = startSession({ routineId, date });
    if (resumed && (routineId !== session.routineId || (date && date !== session.date))) {
      Alert.alert(t('today.activeExists'));
    }
    router.push({ pathname: '/session/[id]', params: { id: session.id } });
  };

  const choose = (routineId: string) => dayOverrideRepo.set(model.date, 'routine', routineId);

  const first = model.routines[0];
  let title: string;
  let subtitle: string;
  if (!model.hasAnyRoutine) {
    title = t('today.heroNoProgram');
    subtitle = formatDateShort(today);
  } else if (model.plan.kind === 'rest') {
    title = t('today.heroRest');
    subtitle = t('today.subtitleRest', { date: formatDateShort(today) });
  } else if (model.plan.kind === 'empty') {
    title = t('today.heroEmpty');
    subtitle = formatDateShort(today);
  } else {
    title = t('today.heroRoutine', { name: model.routines.map((r) => r.routine.name).join(' + ') });
    subtitle = t('today.subtitle', {
      date: formatDateShort(today),
      count: model.routines.reduce((n, r) => n + r.exerciseCount, 0),
      minutes: model.routines.reduce((n, r) => n + r.estMinutes, 0),
    });
  }

  const routineBelow = (r: TodayRoutine) => (
    <View style={styles.below}>
      <AppText variant="callout" secondary numberOfLines={1}>
        {[r.programName, r.muscles.map((m) => t(`exercises.muscles.${m}`)).join(', ')]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      <AppText variant="caption" secondary>
        {r.lastDone
          ? t('today.lastDone', { when: formatRelativeDay(parseLocalDate(r.lastDone), today) })
          : t('today.neverDone')}
      </AppText>
    </View>
  );

  const shownMuscles = [...new Set([...model.plannedMuscles, ...model.doneMuscles])];

  return (
    <Screen withTabBar testID="today">
      <HeroTitle title={title} subtitle={subtitle}>
        {sub.badge ? (
          <View style={styles.badge}>
            <Badge label={sub.badge} tone={cached?.state === 'BILLING_GRACE' ? 'warning' : 'neutral'} />
          </View>
        ) : null}
      </HeroTitle>

      <ActionBar>
        <IconButton icon="add" label={t('today.startEmpty')} onPress={() => open(null)} testID="today-add" />
        <IconButton
          icon="ellipsis-vertical"
          label={t('a11y.menu')}
          onPress={() => setMenu(true)}
          testID="today-menu"
        />
      </ActionBar>

      {model.activeSession ? (
        <CardGroup style={styles.gap}>
          <BigRow
            title={t('today.resume')}
            below={
              <AppText variant="callout" secondary>
                {t('today.resumeSub', {
                  time: formatTime(new Date(model.activeSession.startedAt)),
                  name: model.activeSession.routineName ?? t('today.freeSession'),
                })}
              </AppText>
            }
            right={
              <CircleButton
                label={t('today.resume')}
                icon="play"
                onPress={() =>
                  router.push({ pathname: '/session/[id]', params: { id: model.activeSession!.id } })
                }
                testID="today-resume"
              />
            }
          />
        </CardGroup>
      ) : null}

      {!model.hasAnyRoutine ? (
        <EmptyState
          icon="barbell-outline"
          body={t('today.noProgramBody')}
          actionLabel={t('today.choosePrograms')}
          onAction={() => router.push('/programs')}
        />
      ) : model.plan.kind === 'routines' && first ? (
        <CardGroup>
          {model.routines.map((r) => (
            <BigRow
              key={r.routine.id}
              title={r.routine.name}
              below={routineBelow(r)}
              right={
                <CircleButton
                  label={t('today.startA11y', { name: r.routine.name })}
                  text={t('today.start')}
                  onPress={() => open(r.routine.id)}
                  testID={`start-${r.routine.id}`}
                />
              }
            />
          ))}
        </CardGroup>
      ) : model.plan.kind === 'empty' ? (
        <CardGroup>
          <BigRow
            title={t('today.freeSession')}
            right={
              <CircleButton
                label={t('today.startEmpty')}
                text={t('today.start')}
                onPress={() => open(null)}
                testID="start-empty"
              />
            }
          />
        </CardGroup>
      ) : null}

      {model.plan.source === 'override' ? (
        <View style={styles.override}>
          <AppText variant="caption" secondary align="center">
            {t('today.overrideNote')}
          </AppText>
          <Button
            title={t('today.backToPlan')}
            kind="plain"
            onPress={() => dayOverrideRepo.clear(model.date)}
            testID="today-back-to-plan"
          />
        </View>
      ) : null}

      {model.hasAnyRoutine ? (
        <>
          <SectionTitle>{t('today.changeMind')}</SectionTitle>
          <CardGroup>
            {model.others.map((r) => (
              <ListRow
                key={r.routine.id}
                title={r.routine.name}
                value={r.programName}
                icon="swap-horizontal-outline"
                onPress={() => choose(r.routine.id)}
                testID={`choose-${r.routine.id}`}
              />
            ))}
            <ListRow
              title={t('today.startEmpty')}
              icon="add-circle-outline"
              onPress={() => {
                dayOverrideRepo.set(model.date, 'empty');
                open(null);
              }}
              testID="today-empty"
            />
            {model.plan.kind !== 'rest' ? (
              <ListRow
                title={t('today.restToday')}
                icon="moon-outline"
                onPress={() => dayOverrideRepo.set(model.date, 'rest')}
                testID="today-rest"
              />
            ) : null}
          </CardGroup>
        </>
      ) : null}

      <SectionTitle>{t('today.musclesToday')}</SectionTitle>
      <Card>
        {shownMuscles.length === 0 ? (
          <AppText secondary>{t('today.noMusclesYet')}</AppText>
        ) : (
          <View style={styles.muscles} accessibilityRole="list">
            {shownMuscles.map((m) => {
              const done = model.doneMuscles.includes(m);
              return (
                <View
                  key={m}
                  style={[styles.muscle, { borderColor: done ? p.accent : p.separator }]}
                  accessible
                  accessibilityLabel={`${t(`exercises.muscles.${m}`)}, ${done ? t('today.muscleDone') : t('today.muscleTodo')}`}
                >
                  <Icon
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={done ? p.accent : p.textSecondary}
                  />
                  <AppText variant="caption" color={done ? p.accent : p.textSecondary}>
                    {t(`exercises.muscles.${m}`)}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <View style={styles.kcalRow}>
        <Pressable
          style={[styles.kcal, { backgroundColor: p.card }]}
          onPress={() => setEntry('burned')}
          accessibilityRole="button"
          accessibilityLabel={`${t('today.kcalBurned')}: ${formatNumber(model.expenditure.kcal)} kcal`}
          accessibilityHint={t('today.tapToEnter')}
          testID="today-kcal-burned"
        >
          <AppText variant="caption" secondary>
            {t('today.kcalBurned')}
          </AppText>
          <AppText variant="mediumNumber" accent>
            {formatNumber(model.expenditure.kcal)}
          </AppText>
          <AppText variant="caption" secondary>
            {model.expenditure.isManual ? t('today.kcalManual') : t('today.kcalComputed')}
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.kcal, { backgroundColor: p.card }]}
          onPress={() => setEntry('eaten')}
          accessibilityRole="button"
          accessibilityLabel={`${t('today.kcalEaten')}: ${model.intakeKcal ?? '–'}`}
          accessibilityHint={t('today.tapToEnter')}
          testID="today-kcal-eaten"
        >
          <AppText variant="caption" secondary>
            {t('today.kcalEaten')}
          </AppText>
          <AppText variant="mediumNumber">
            {model.intakeKcal != null ? formatNumber(model.intakeKcal) : '–'}
          </AppText>
          <AppText variant="caption" secondary>
            {model.targetKcal != null
              ? t('today.kcalTarget', { kcal: formatNumber(model.targetKcal) })
              : t('today.tapToEnter')}
          </AppText>
        </Pressable>
      </View>

      <NumberPad
        visible={entry !== null}
        title={entry === 'eaten' ? t('today.enterEaten') : t('today.enterBurned')}
        initial={
          entry === 'eaten' ? model.intakeKcal : model.expenditure.isManual ? model.expenditure.kcal : null
        }
        allowDecimal={false}
        suffix={t('common.units.kcal')}
        max={20000}
        onClose={() => setEntry(null)}
        onSubmit={(value) => {
          if (entry === 'eaten') dailyLogRepo.upsert(model.date, { kcalIntake: value });
          else dailyLogRepo.upsert(model.date, { kcalExpenditureOverride: value });
          setEntry(null);
        }}
      />

      <Sheet visible={menu} onClose={() => setMenu(false)} title={t('today.menu.title')}>
        <CardGroup>
          <ListRow
            title={t('today.menu.weekPlan')}
            icon="calendar-outline"
            onPress={() => {
              setMenu(false);
              router.push('/week');
            }}
          />
          {model.expenditure.isManual ? (
            <ListRow
              title={t('today.clearManual')}
              icon="calculator-outline"
              onPress={() => {
                dailyLogRepo.upsert(model.date, { kcalExpenditureOverride: null });
                setMenu(false);
              }}
            />
          ) : null}
        </CardGroup>
        <AppText variant="caption" secondary>
          {t('today.menu.logPast')}
        </AppText>
        <CardGroup>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const date = addDays(model.date, -n);
            return (
              <ListRow
                key={date}
                title={formatDateShort(parseLocalDate(date), today)}
                value={t('today.menu.daysAgo', { count: n })}
                onPress={() => {
                  setMenu(false);
                  open(null, date);
                }}
                testID={`log-past-${n}`}
              />
            );
          })}
        </CardGroup>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { marginTop: spacing.sm },
  gap: { marginBottom: spacing.md },
  below: { gap: 2 },
  override: { marginTop: spacing.sm },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  kcalRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  kcal: { flex: 1, borderRadius: radius.card, padding: spacing.lg, minHeight: 110, gap: 2 },
});
