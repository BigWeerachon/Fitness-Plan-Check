import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  BigRow,
  Button,
  CardGroup,
  Chip,
  EmptyState,
  HeroTitle,
  ListRow,
  Screen,
  SectionTitle,
  SegmentedControl,
  Sheet,
  StackHeader,
  Toggle,
  WeekdayDots,
} from '../../components';
import { profileRepo } from '../../db/repos/profileRepo';
import { programRepo, routineRepo } from '../../db/repos/programRepo';
import { dayOverrideRepo, weekPlanRepo } from '../../db/repos/weekPlanRepo';
import { addDays, parseLocalDate, toLocalDate, weekdayOf } from '../../domain/dates';
import { resolveDayPlan, weekDaysOrdered } from '../../domain/schedule';
import { useRepoQuery } from '../../features/data/useRepoQuery';
import { formatDateShort, weekdayLong } from '../../i18n/format';
import { now } from '../../utils/clock';
import { spacing } from '../../theme/tokens';

/**
 * ตารางประจำสัปดาห์ (SPEC E): แถว routine + แถวจุดวัน (แตะเปิด/ปิดวัน) + สวิตช์เปิด/ปิด, คัดลอกจากวันอื่น,
 * override วันที่เฉพาะโดยไม่แก้ตารางหลัก, สลับโปรแกรมทั้งสัปดาห์ และตั้งวันเริ่มต้นสัปดาห์ (จ./อา.)
 */
export default function WeekScreen() {
  const { t } = useTranslation();
  const data = useRepoQuery(() => {
    const profile = profileRepo.ensure();
    const programs = programRepo.list();
    const program = programs.find((p) => p.id === profile.activeProgramId) ?? null;
    const routines = program ? routineRepo.listByProgram(program.id) : [];
    const entries = program ? weekPlanRepo.listForProgram(program.id) : [];
    const today = toLocalDate(now());
    const overrides = dayOverrideRepo.listBetween(today, addDays(today, 6));
    const allRoutines = routineRepo.listAll();
    const names = new Map(allRoutines.map((r) => [r.id, r.name]));
    const upcoming = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      const plan = resolveDayPlan({ entries, overrides, date });
      return { date, plan };
    });
    return { profile, programs, program, routines, entries, upcoming, names, allRoutines, today };
  });
  const [copying, setCopying] = useState(false);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const weekStart = data.profile.weekStart;
  const order = weekDaysOrdered(weekStart);

  const entryFor = (routineId: string) => data.entries.find((e) => e.routineId === routineId);

  const toggleDay = (routineId: string, day: number) => {
    if (!data.program) return;
    const entry = entryFor(routineId) ?? weekPlanRepo.ensureEntry(data.program.id, routineId, []);
    weekPlanRepo.toggleDay(entry.id, day);
  };

  const setEnabled = (routineId: string, enabled: boolean) => {
    if (!data.program) return;
    const entry = entryFor(routineId) ?? weekPlanRepo.ensureEntry(data.program.id, routineId, []);
    weekPlanRepo.setEnabled(entry.id, enabled);
  };

  const describe = (plan: (typeof data.upcoming)[number]['plan']) =>
    plan.kind === 'rest'
      ? t('week.rest')
      : plan.kind === 'empty'
        ? t('week.free')
        : plan.routineIds.map((id) => data.names.get(id) ?? '').join(' + ');

  return (
    <Screen header={<StackHeader title={t('week.title')} />} testID="week">
      <HeroTitle title={t('week.title')} subtitle={data.program?.name ?? t('programs.noActive')} compact />

      <SectionTitle>{t('week.program')}</SectionTitle>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('week.program')}>
        {data.programs.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            selected={p.id === data.program?.id}
            onPress={() => {
              if (p.id === data.program?.id) return;
              weekPlanRepo.setActiveProgram(p.id);
              Alert.alert(t('week.switched', { name: p.name }));
            }}
            testID={`week-program-${p.id}`}
          />
        ))}
      </View>

      <SectionTitle>{t('week.weekStart')}</SectionTitle>
      <SegmentedControl
        label={t('week.weekStart')}
        value={String(weekStart) as '0' | '1'}
        onChange={(v) => profileRepo.update({ weekStart: Number(v) })}
        options={[
          { value: '1', label: t('week.monday') },
          { value: '0', label: t('week.sunday') },
        ]}
      />

      {!data.program ? (
        <EmptyState
          icon="calendar-outline"
          title={t('week.noProgram')}
          body={t('week.noProgramBody')}
          actionLabel={t('today.choosePrograms')}
          onAction={() => router.push('/programs')}
        />
      ) : (
        <>
          <SectionTitle>{t('programs.routines')}</SectionTitle>
          <AppText variant="caption" secondary style={styles.hint}>
            {t('week.routinesHint')}
          </AppText>
          <CardGroup>
            {data.routines.map((r) => {
              const entry = entryFor(r.id);
              const enabled = entry?.enabled ?? true;
              return (
                <BigRow
                  key={r.id}
                  title={r.name}
                  dimmed={!enabled}
                  below={
                    <WeekdayDots
                      active={entry?.days ?? []}
                      weekStart={weekStart}
                      dimmed={!enabled}
                      label={r.name}
                      onToggleDay={(day) => toggleDay(r.id, day)}
                    />
                  }
                  right={
                    <Toggle
                      value={enabled}
                      onValueChange={(v) => setEnabled(r.id, v)}
                      label={t('week.enabledA11y', { name: r.name })}
                      testID={`week-toggle-${r.id}`}
                    />
                  }
                  testID={`week-row-${r.id}`}
                />
              );
            })}
          </CardGroup>
          <Button
            title={t('week.copyDay')}
            kind="plain"
            icon="copy-outline"
            onPress={() => setCopying(true)}
            testID="week-copy"
          />

          <SectionTitle>{t('week.upcoming')}</SectionTitle>
          <AppText variant="caption" secondary style={styles.hint}>
            {t('week.upcomingHint')}
          </AppText>
          <CardGroup>
            {data.upcoming.map(({ date, plan }) => (
              <ListRow
                key={date}
                title={formatDateShort(parseLocalDate(date))}
                value={`${describe(plan)}${plan.source === 'override' ? ` · ${t('week.changed')}` : ''}`}
                onPress={() => setEditingDate(date)}
                testID={`week-day-${date}`}
              />
            ))}
          </CardGroup>
        </>
      )}

      <Sheet visible={copying} onClose={() => setCopying(false)} title={t('week.copyDay')}>
        <AppText variant="caption" secondary>
          {t('week.copyFrom')}
        </AppText>
        <View style={styles.chips}>
          {order.map((d) => (
            <Chip
              key={d}
              label={weekdayLong(d)}
              selected={from === d}
              onPress={() => setFrom(d)}
              testID={`copy-from-${d}`}
            />
          ))}
        </View>
        <AppText variant="caption" secondary>
          {t('week.copyTo')}
        </AppText>
        <View style={styles.chips}>
          {order.map((d) => (
            <Chip
              key={d}
              label={weekdayLong(d)}
              selected={to === d}
              onPress={() => setTo(d)}
              testID={`copy-to-${d}`}
            />
          ))}
        </View>
        <Button
          title={t('week.copy')}
          disabled={from === to || !data.program}
          onPress={() => {
            if (!data.program) return;
            weekPlanRepo.copyDay(data.program.id, from, to);
            setCopying(false);
            Alert.alert(t('week.copied', { from: weekdayLong(from), to: weekdayLong(to) }));
          }}
          testID="copy-confirm"
        />
      </Sheet>

      <Sheet
        visible={editingDate !== null}
        onClose={() => setEditingDate(null)}
        title={editingDate ? t('week.dayTitle', { date: formatDateShort(parseLocalDate(editingDate)) }) : ''}
      >
        {editingDate ? (
          <CardGroup>
            <ListRow
              title={t('week.usePlan')}
              value={weekdayLong(weekdayOf(editingDate))}
              icon="calendar-outline"
              onPress={() => {
                dayOverrideRepo.clear(editingDate);
                setEditingDate(null);
              }}
            />
            {data.allRoutines.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                icon="barbell-outline"
                onPress={() => {
                  dayOverrideRepo.set(editingDate, 'routine', r.id);
                  setEditingDate(null);
                }}
              />
            ))}
            <ListRow
              title={t('week.free')}
              icon="add-circle-outline"
              onPress={() => {
                dayOverrideRepo.set(editingDate, 'empty');
                setEditingDate(null);
              }}
            />
            <ListRow
              title={t('week.rest')}
              icon="moon-outline"
              onPress={() => {
                dayOverrideRepo.set(editingDate, 'rest');
                setEditingDate(null);
              }}
            />
          </CardGroup>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { marginBottom: spacing.sm, marginHorizontal: spacing.xl },
});
