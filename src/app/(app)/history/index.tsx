import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  CardGroup,
  EmptyState,
  HeroTitle,
  ListRow,
  Screen,
  SectionTitle,
  StackHeader,
} from '../../../components';
import { parseLocalDate } from '../../../domain/dates';
import { groupFilterOf, programGroups, sessionSummaries, type SessionSummary } from '../../../domain/stats';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { groupLabels, parseRangeParams, rangeText, sessionLine } from '../../../features/stats/labels';
import { loadStats } from '../../../features/stats/loadStats';
import { formatDateShort, formatMonthYear } from '../../../i18n/format';
import { spacing } from '../../../theme/tokens';

/**
 * ประวัติการฝึก (SPEC I1) เรียงจากใหม่ไปเก่า แบ่งตามเดือน — กรองกรุ๊ปได้ (I5) และแสดงชื่อกรุ๊ปทุกแถว
 * เปิดจากแท็บสถิติจะรับช่วงเวลาที่กำลังดูมาด้วย (from/to) แล้วแสดงช่วงนั้นที่หัวข้อ; ไม่มี = ทั้งหมด
 */
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    group?: string;
    period?: string;
    from?: string;
    to?: string;
  }>();
  const groupKey = params.group;
  const { range, period } = parseRangeParams(params);
  const model = useRepoQuery(loadStats, i18n.language);
  const group = groupKey ? programGroups(model.data).find((g) => g.key === groupKey) : undefined;
  const sessions = sessionSummaries(model.data, { range, group: group ? groupFilterOf(group) : null });
  const today = parseLocalDate(model.today);
  const labels = groupLabels(programGroups(model.data), t('stats.noProgram'), (d) =>
    formatDateShort(parseLocalDate(d), today),
  );
  const rangeLabel = rangeText(range, period, model.today);
  const groupText = group
    ? (labels.get(group.key) ?? group.programName ?? t('stats.noProgram'))
    : t('stats.allGroups');

  const months: { key: string; label: string; items: SessionSummary[] }[] = [];
  for (const s of sessions) {
    const key = s.date.slice(0, 7);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      const d = parseLocalDate(s.date);
      m = { key, label: formatMonthYear(d.getFullYear(), d.getMonth()), items: [] };
      months.push(m);
    }
    m.items.push(s);
  }

  return (
    <Screen header={<StackHeader title={t('stats.title')} />} testID="history">
      <HeroTitle
        title={t('stats.historyTitle')}
        subtitle={rangeLabel ? `${groupText} · ${rangeLabel}` : groupText}
        compact
      />
      {sessions.length === 0 ? (
        <EmptyState icon="time-outline" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
      ) : (
        months.map((m) => (
          <React.Fragment key={m.key}>
            <SectionTitle>{m.label}</SectionTitle>
            <CardGroup style={styles.group}>
              {m.items.map((s) => (
                <ListRow
                  key={s.sessionId}
                  title={s.routineName ?? t('session.freeSession')}
                  value={[
                    formatDateShort(parseLocalDate(s.date), today),
                    s.programName ?? t('stats.noProgram'),
                    sessionLine(t, s, model.unit),
                  ].join(' · ')}
                  onPress={() => router.push({ pathname: '/history/[id]', params: { id: s.sessionId } })}
                  testID={`history-${s.sessionId}`}
                />
              ))}
            </CardGroup>
          </React.Fragment>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.sm },
});
