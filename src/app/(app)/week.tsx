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
import { resolveDayPlan, weekDaysOrdered, type DayPlan } from '../../domain/schedule';
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
    const entries = program ? weekPlanRepo.listByProgram(program.id) : [];
    const today = toLocalDate(now());
    const overrides = dayOverrideRepo.listBetween({ start: today, end: addDays(today, 6) });
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
  const [copyFromWeekday, setCopyFromWeekday] = useState(1);
  const [copyToWeekday, setCopyToWeekday] = useState(2);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const weekStart = data.profile.weekStart;
  const order = weekDaysOrdered(weekStart);

  const entryFor = (routineId: string) => data.entries.find((e) => e.routineId === routineId);

  /** แถวตารางของ routine นี้ในโปรแกรมที่ใช้งาน (สร้างให้ถ้ายังไม่มี) — null เมื่อไม่มีโปรแกรมที่ใช้งาน */
  const entryOrCreate = (routineId: string) =>
    data.program ? (entryFor(routineId) ?? weekPlanRepo.ensureEntry(data.program.id, routineId, [])) : null;

  const toggleDay = (routineId: string, day: number) => {
    const entry = entryOrCreate(routineId);
    if (entry) weekPlanRepo.toggleDay(entry.id, day);
  };

  const setEnabled = (routineId: string, enabled: boolean) => {
    const entry = entryOrCreate(routineId);
    if (entry) weekPlanRepo.setEnabled(entry.id, enabled);
  };

  const describeDayPlan = (plan: DayPlan) => {
    if (plan.kind === 'rest') return t('week.rest');
    if (plan.kind === 'empty') return t('week.free');
    return plan.routineIds.map((id) => data.names.get(id) ?? '').join(' + ');
  };

  /** ทำการกับ override ของวันที่กำลังแก้ แล้วปิดชีต */
  const applyOverride = (change: () => void) => () => {
    change();
    setEditingDate(null);
  };

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
                  footer={
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
                value={`${describeDayPlan(plan)}${plan.source === 'override' ? ` · ${t('week.changed')}` : ''}`}
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
              selected={copyFromWeekday === d}
              onPress={() => setCopyFromWeekday(d)}
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
              selected={copyToWeekday === d}
              onPress={() => setCopyToWeekday(d)}
              testID={`copy-to-${d}`}
            />
          ))}
        </View>
        <Button
          title={t('week.copy')}
          disabled={copyFromWeekday === copyToWeekday || !data.program}
          onPress={() => {
            if (!data.program) return;
            weekPlanRepo.copyDay(data.program.id, copyFromWeekday, copyToWeekday);
            setCopying(false);
            Alert.alert(
              t('week.copied', { from: weekdayLong(copyFromWeekday), to: weekdayLong(copyToWeekday) }),
            );
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
              onPress={applyOverride(() => dayOverrideRepo.clear(editingDate))}
            />
            {data.allRoutines.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                icon="barbell-outline"
                onPress={applyOverride(() => dayOverrideRepo.set(editingDate, 'routine', r.id))}
              />
            ))}
            <ListRow
              title={t('week.free')}
              icon="add-circle-outline"
              onPress={applyOverride(() => dayOverrideRepo.set(editingDate, 'empty'))}
            />
            <ListRow
              title={t('week.rest')}
              icon="moon-outline"
              onPress={applyOverride(() => dayOverrideRepo.set(editingDate, 'rest'))}
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
