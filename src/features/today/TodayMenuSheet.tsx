import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, CardGroup, ListRow, Sheet } from '../../components';
import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { addDays, parseLocalDate } from '../../domain/dates';
import { formatDateShort } from '../../i18n/format';
import type { TodayModel } from './loadToday';

/** เมนู ⋮ ของหน้าแรก: แผนสัปดาห์, ล้างแคลอรี่ที่กรอกเอง, เลือกวันย้อนหลัง 7 วันเพื่อบันทึกการฝึก */
export function TodayMenuSheet({
  visible,
  model,
  today,
  onClose,
  onPickPastDate,
}: {
  visible: boolean;
  model: TodayModel;
  today: Date;
  onClose: () => void;
  onPickPastDate: (date: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('today.menu.title')}>
      <CardGroup>
        <ListRow
          title={t('today.menu.weekPlan')}
          icon="calendar-outline"
          onPress={() => {
            onClose();
            router.push('/week');
          }}
        />
        {model.expenditure.isManual ? (
          <ListRow
            title={t('today.clearManual')}
            icon="calculator-outline"
            onPress={() => {
              dailyLogRepo.upsert(model.date, { kcalExpenditureOverride: null });
              onClose();
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
                onClose();
                onPickPastDate(date);
              }}
              testID={`log-past-${n}`}
            />
          );
        })}
      </CardGroup>
    </Sheet>
  );
}
