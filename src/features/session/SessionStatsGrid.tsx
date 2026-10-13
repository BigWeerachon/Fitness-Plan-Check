import type { TFunction } from 'i18next';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '../../components';
import type { WeightUnit, WorkoutSession } from '../../db/schema';
import type { SessionTotals } from '../../domain/sessionSummary';
import { displayWeight } from '../../domain/units';
import { formatDuration, formatNumber } from '../../i18n/format';
import { spacing } from '../../theme/tokens';

export interface SessionFact {
  label: string;
  value: string;
  testID?: string;
}

/** สถิติสรุปของเซสชันที่จบแล้ว: ระยะเวลา · เซ็ต · ปริมาณรวม · แคลอรี่ (ไม่มีค่าแคลอรี่ = "–") */
export function sessionFacts(
  t: TFunction,
  session: Pick<WorkoutSession, 'durationSec' | 'kcal'>,
  totals: Pick<SessionTotals, 'setsDone' | 'volumeKg'>,
  unit: WeightUnit,
  kcalTestID?: string,
): SessionFact[] {
  return [
    { label: t('session.duration'), value: formatDuration(session.durationSec ?? 0) },
    { label: t('session.sets'), value: String(totals.setsDone) },
    {
      label: t('session.volume'),
      value: `${formatNumber(displayWeight(totals.volumeKg, unit))} ${t(`common.units.${unit}`)}`,
    },
    {
      label: t('session.kcal'),
      value:
        session.kcal != null ? `${formatNumber(session.kcal)} ${t('common.units.kcal')}` : t('session.none'),
      testID: kcalTestID,
    },
  ];
}

/** ตารางการ์ดสถิติ 2 คอลัมน์ ใช้ทั้งหน้าสรุปหลังจบเซสชันและรายละเอียดในประวัติ */
export function SessionStatsGrid({ facts }: { facts: readonly SessionFact[] }) {
  return (
    <View style={styles.grid}>
      {facts.map((f) => (
        <Card key={f.label} style={styles.stat}>
          <AppText variant="caption" secondary>
            {f.label}
          </AppText>
          <AppText variant="headline" testID={f.testID}>
            {f.value}
          </AppText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: '45%' },
});
