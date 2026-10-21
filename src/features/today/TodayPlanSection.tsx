import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, BigRow, CardGroup, CircleButton, EmptyState } from '../../components';
import { parseLocalDate } from '../../domain/dates';
import { formatRelativeDay, muscleNames } from '../../i18n/format';
import type { TodayModel, TodayRoutine } from './loadToday';

/** การ์ดแผนของวันนี้: ไม่มีโปรแกรม → ว่าง, routine → การ์ดเริ่ม, ฝึกอิสระ → การ์ดเริ่มเซสชันว่าง, พัก → ไม่แสดง */
export function TodayPlanSection({
  model,
  today,
  onStart,
}: {
  model: TodayModel;
  today: Date;
  /** routineId = null → เซสชันว่าง */
  onStart: (routineId: string | null) => void;
}) {
  const { t } = useTranslation();

  if (!model.hasAnyRoutine) {
    return (
      <EmptyState
        icon="barbell-outline"
        body={t('today.noProgramBody')}
        actionLabel={t('today.choosePrograms')}
        onAction={() => router.push('/programs')}
      />
    );
  }

  // loadToday กรอง routine ที่ถูกลบออก จึงมีแผน 'routines' ที่ไม่เหลือแถวให้แสดง — ต้องไม่ render กล่องการ์ดว่าง
  const hasRoutineRows = model.routines.length > 0;
  if (model.plan.kind === 'routines' && hasRoutineRows) {
    return (
      <CardGroup>
        {model.routines.map((r) => (
          <BigRow
            key={r.routine.id}
            title={r.routine.name}
            below={<RoutineDetails routine={r} today={today} />}
            right={
              <CircleButton
                label={t('today.startA11y', { name: r.routine.name })}
                text={t('today.start')}
                onPress={() => onStart(r.routine.id)}
                testID={`start-${r.routine.id}`}
              />
            }
          />
        ))}
      </CardGroup>
    );
  }

  if (model.plan.kind === 'empty') {
    return (
      <CardGroup>
        <BigRow
          title={t('today.freeSession')}
          right={
            <CircleButton
              label={t('today.startEmpty')}
              text={t('today.start')}
              onPress={() => onStart(null)}
              testID="start-empty"
            />
          }
        />
      </CardGroup>
    );
  }

  return null;
}

function RoutineDetails({ routine: r, today }: { routine: TodayRoutine; today: Date }) {
  const { t } = useTranslation();
  return (
    <View style={styles.below}>
      {r.programName ? (
        <AppText variant="callout" secondary numberOfLines={1} testID={`today-card-group-${r.routine.id}`}>
          {r.programName}
        </AppText>
      ) : null}
      {r.muscles.length > 0 ? (
        <AppText variant="callout" secondary numberOfLines={2} testID={`today-card-muscles-${r.routine.id}`}>
          {muscleNames(t, r.muscles)}
        </AppText>
      ) : null}
      <AppText variant="caption" secondary>
        {r.lastDone
          ? t('today.lastDone', { when: formatRelativeDay(parseLocalDate(r.lastDone), today) })
          : t('today.neverDone')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  below: { gap: 2 },
});
