import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import {
  ActionBar,
  AppText,
  Badge,
  BigRow,
  Button,
  CardGroup,
  CircleButton,
  Disclaimer,
  HeroTitle,
  IconButton,
  ListRow,
  Screen,
  SectionTitle,
} from '../../../components';
import { dayOverrideRepo } from '../../../db/repos/weekPlanRepo';
import { parseLocalDate } from '../../../domain/dates';
import { describeSubscription } from '../../../features/access/subscriptionInfo';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { startSession } from '../../../features/session/sessionFlow';
import { describeTodayHero } from '../../../features/today/describeTodayHero';
import { KcalSection } from '../../../features/today/KcalSection';
import { loadToday } from '../../../features/today/loadToday';
import { MusclesCard } from '../../../features/today/MusclesCard';
import { PastDaySheet } from '../../../features/today/PastDaySheet';
import { TodayMenuSheet } from '../../../features/today/TodayMenuSheet';
import { TodayPlanSection } from '../../../features/today/TodayPlanSection';
import { formatTime } from '../../../i18n/format';
import { useEntitlement } from '../../../stores/entitlement';
import { spacing } from '../../../theme/tokens';

/**
 * หน้าแรก (SPEC D): เปิดแล้วรู้ทันทีว่าวันนี้ต้องทำอะไร — หัวข้อสีหลักใหญ่ + การ์ด routine ของวันนี้ (ปุ่มวงกลม "เริ่ม")
 * เปลี่ยนใจได้ใน 1–2 แตะ โดยบันทึกเป็น override ของวันนั้น (ไม่แก้ตารางประจำสัปดาห์)
 */
export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const model = useRepoQuery(() => loadToday(), i18n.language);
  const cached = useEntitlement((s) => s.cached);
  const sub = describeSubscription(cached, t);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pastDate, setPastDate] = useState<string | null>(null);
  const today = parseLocalDate(model.date);

  const startAndOpenSession = (routineId: string | null, date?: string) => {
    const { session, resumed } = startSession({ routineId, date });
    const resumedOtherSession =
      resumed && (routineId !== session.routineId || (!!date && date !== session.date));
    if (resumedOtherSession) Alert.alert(t('today.activeExists'));
    router.push({ pathname: '/session/[id]', params: { id: session.id } });
  };

  const startForPastDate = (routineId: string | null) => {
    if (!pastDate) return;
    const date = pastDate;
    setPastDate(null);
    startAndOpenSession(routineId, date);
  };

  const choose = (routineId: string) => dayOverrideRepo.set(model.date, 'routine', routineId);

  const { title, subtitle } = describeTodayHero(model, today, t);

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
        <IconButton
          icon="add"
          label={t('today.startEmpty')}
          onPress={() => startAndOpenSession(null)}
          testID="today-add"
        />
        <IconButton
          icon="ellipsis-vertical"
          label={t('a11y.menu')}
          onPress={() => setIsMenuOpen(true)}
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

      <TodayPlanSection model={model} today={today} onStart={startAndOpenSession} />

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
                startAndOpenSession(null);
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
      <MusclesCard planned={model.plannedMuscles} done={model.doneMuscles} />

      <KcalSection model={model} />
      <Disclaimer />

      <TodayMenuSheet
        visible={isMenuOpen}
        model={model}
        today={today}
        onClose={() => setIsMenuOpen(false)}
        onPickPastDate={setPastDate}
      />

      <PastDaySheet
        date={pastDate}
        today={today}
        routines={[...model.routines, ...model.others]}
        onClose={() => setPastDate(null)}
        onPick={startForPastDate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { marginTop: spacing.sm },
  gap: { marginBottom: spacing.md },
  override: { marginTop: spacing.sm },
});
