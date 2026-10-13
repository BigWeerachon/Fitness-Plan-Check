import React from 'react';
import { useTranslation } from 'react-i18next';
import { CardGroup, ListRow, Sheet } from '../../components';
import { parseLocalDate } from '../../domain/dates';
import { formatDateShort } from '../../i18n/format';
import type { TodayRoutine } from './loadToday';

/** เลือก routine (หรือฝึกอิสระ) สำหรับวันย้อนหลังที่เลือก — date = null คือปิดอยู่ */
export function PastDaySheet({
  date,
  today,
  routines,
  onClose,
  onPick,
}: {
  date: string | null;
  today: Date;
  routines: TodayRoutine[];
  onClose: () => void;
  /** routineId = null → เซสชันว่าง */
  onPick: (routineId: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet
      visible={date !== null}
      onClose={onClose}
      title={date ? `${t('today.menu.pickRoutine')} · ${formatDateShort(parseLocalDate(date), today)}` : ''}
    >
      <CardGroup>
        {routines.map((r) => (
          <ListRow
            key={r.routine.id}
            title={r.routine.name}
            value={r.programName}
            onPress={() => onPick(r.routine.id)}
            testID={`log-past-routine-${r.routine.id}`}
          />
        ))}
        <ListRow
          title={t('today.menu.emptySession')}
          icon="add-circle-outline"
          onPress={() => onPick(null)}
          testID="log-past-empty"
        />
      </CardGroup>
    </Sheet>
  );
}
