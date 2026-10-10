import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  CardGroup,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  NumberPad,
  ProgressBar,
  Screen,
  Sheet,
  StackHeader,
} from '../../../components';
import { routineExerciseRepo } from '../../../db/repos/routineExerciseRepo';
import { sessionRepo } from '../../../db/repos/sessionRepo';
import type { SessionSet } from '../../../db/schema';
import { parseLocalDate } from '../../../domain/dates';
import { adjustTarget } from '../../../domain/progression';
import { isExerciseComplete, restSecondsFor, sessionDurationSec } from '../../../domain/sessionSummary';
import { displayWeight, formatWeight, weightToKg } from '../../../domain/units';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { formatSet, isBodyweightExercise } from '../../../features/session/formatSet';
import { RestTimerBar } from '../../../features/session/RestTimerBar';
import { SetTick } from '../../../features/session/SetTick';
import { TargetSheet } from '../../../features/session/TargetSheet';
import { loadSession, type SessionExerciseView } from '../../../features/session/useSessionData';
import { formatDateShort, formatDuration } from '../../../i18n/format';
import { useRestTimer } from '../../../stores/restTimer';
import { now } from '../../../utils/clock';
import { MIN_TOUCH, radius, spacing } from '../../../theme/tokens';
import { usePalette } from '../../../theme/useTheme';

type Editing = { set: SessionSet; field: 'weight' | 'reps' } | null;

/**
 * หน้าเซสชัน (SPEC G1): พื้นดำ ติ๊กเซ็ตสีหลัก — แต่ละท่ามีตาราง "ครั้งก่อน" กับ "เป้าหมายครั้งนี้" ในแถวเดียวกัน
 * แตะแก้ด้วยแป้นตัวเลขใหญ่, ติ๊กวงกลมเมื่อเซ็ตเสร็จ (haptic + animation), พักอัตโนมัติหลังติ๊ก,
 * เพิ่ม/ลบ/สลับ/จัดลำดับท่า และเพิ่ม/ลบเซ็ตได้ทันที — ทุกการแตะบันทึกลงเครื่องทันที (ข้อมูลไม่หาย)
 */
export default function SessionScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => loadSession(id), id);
  const [editing, setEditing] = useState<Editing>(null);
  const [targetFor, setTargetFor] = useState<SessionExerciseView | null>(null);
  const [menuFor, setMenuFor] = useState<SessionExerciseView | null>(null);
  const [sessionMenu, setSessionMenu] = useState(false);
  const [nowMs, setNowMs] = useState(now);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!data) {
    return (
      <Screen glow={false} header={<StackHeader />}>
        <ErrorState message={t('session.notFound')} />
      </Screen>
    );
  }
  // เซสชันที่จบแล้วแก้ไม่ได้ (กลับมาหน้านี้จากหน้าสรุป → ไปหน้าสรุป) ประวัติเปลี่ยนได้ทางหน้าประวัติเท่านั้น
  if (data.session.status === 'completed') {
    return <Redirect href={{ pathname: '/session/summary/[id]', params: { id: data.session.id } }} />;
  }
  const { session, exercises, totals, unit } = data;
  const unitLabel = t(`common.units.${unit}`);
  const fmt = (exerciseId: string, kg: number | null, reps: number | null) =>
    formatSet(t, { weightKg: kg, reps, unit, bodyweight: isBodyweightExercise(exerciseId) });

  const toggle = (view: SessionExerciseView, set: SessionSet, n: number) => {
    const becomingDone = !set.done;
    if (becomingDone && (set.weightKg == null || set.reps == null)) {
      sessionRepo.updateSet(set.id, {
        weightKg: set.weightKg ?? set.targetWeightKg,
        reps: set.reps ?? set.targetReps,
      });
    }
    sessionRepo.setDone(set.id, becomingDone);
    if (becomingDone) {
      const sec = restSecondsFor(view.exercise.restSec, data.restDefaultSec, data.restEnabled);
      const isLast =
        n === view.sets.length && view.exercise.id === exercises[exercises.length - 1]?.exercise.id;
      if (!isLast) useRestTimer.getState().start(session.id, sec, now());
    }
  };

  const applyTarget = (
    view: SessionExerciseView,
    target: { weightKg: number | null; reps: number },
    scope: 'today' | 'forward',
  ) => {
    const config = view.config;
    const result = config
      ? adjustTarget(config, target, scope, now())
      : { session: { targetWeightKg: target.weightKg, targetReps: target.reps }, routineExercise: null };
    for (const s of view.sets) {
      if (s.done) continue;
      sessionRepo.updateSet(s.id, {
        targetWeightKg: result.session.targetWeightKg,
        targetReps: result.session.targetReps,
        weightKg: result.session.targetWeightKg,
        reps: result.session.targetReps,
      });
    }
    if (config && result.routineExercise) routineExerciseRepo.update(config.id, result.routineExercise);
    setTargetFor(null);
  };

  const move = (index: number, delta: number) => {
    const ids = exercises.map((e) => e.exercise.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    sessionRepo.reorderExercises(session.id, ids);
  };

  const discard = () =>
    Alert.alert(t('session.discard'), t('session.discardConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('session.discard'),
        style: 'destructive',
        onPress: () => {
          useRestTimer.getState().stop();
          sessionRepo.remove(session.id);
          router.replace('/');
        },
      },
    ]);

  const title = session.routineName ?? t('session.freeSession');
  const editingView = editing
    ? exercises.find((e) => e.exercise.id === editing.set.sessionExerciseId)
    : undefined;

  return (
    <View style={styles.root}>
      <Screen
        glow={false}
        header={
          <StackHeader
            title={title}
            right={
              <IconButton
                icon="ellipsis-vertical"
                label={t('a11y.menu')}
                onPress={() => setSessionMenu(true)}
                testID="session-menu"
              />
            }
          />
        }
        testID="session"
      >
        <View style={styles.top}>
          <AppText variant="caption" secondary align="center">
            {session.backfilled
              ? t('session.backfilled', { date: formatDateShort(parseLocalDate(session.date)) })
              : t('session.elapsed', { time: formatDuration(sessionDurationSec(session.startedAt, nowMs)) })}
          </AppText>
          <AppText variant="headline" accent align="center" testID="session-progress">
            {t('session.progress', { done: totals.setsDone, total: totals.setsTotal })}
          </AppText>
          <ProgressBar
            value={totals.progress}
            label={t('session.progress', { done: totals.setsDone, total: totals.setsTotal })}
          />
          {totals.musclesDone.length + totals.musclesRemaining.length > 0 ? (
            <AppText variant="caption" secondary align="center">
              {[
                totals.musclesDone.length
                  ? `${t('session.musclesDone')}: ${totals.musclesDone.map((m) => t(`exercises.muscles.${m}`)).join(', ')}`
                  : null,
                totals.musclesRemaining.length
                  ? `${t('session.musclesLeft')}: ${totals.musclesRemaining.map((m) => t(`exercises.muscles.${m}`)).join(', ')}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          ) : null}
        </View>

        {exercises.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title={t('session.emptySession')}
            body={t('session.emptySessionBody')}
          />
        ) : null}

        <View style={styles.list}>
          {exercises.map((view) => {
            const complete = isExerciseComplete(view.sets);
            return (
              <Card key={view.exercise.id}>
                <View style={styles.exHeader}>
                  <View style={styles.flex}>
                    <AppText variant="headline">{view.exercise.exerciseName}</AppText>
                    <AppText variant="caption" color={complete ? p.accent : p.textSecondary}>
                      {complete
                        ? t('session.exerciseDone')
                        : t(`exercises.muscles.${view.exercise.muscleGroup}`)}
                    </AppText>
                  </View>
                  <IconButton
                    icon="ellipsis-horizontal"
                    label={`${t('a11y.menu')}: ${view.exercise.exerciseName}`}
                    onPress={() => setMenuFor(view)}
                    testID={`ex-menu-${view.exercise.exerciseId}`}
                  />
                </View>
                <View style={styles.headRow}>
                  <AppText variant="caption" secondary style={styles.cSet}>
                    {t('session.set')}
                  </AppText>
                  <AppText variant="caption" secondary style={styles.cPrev}>
                    {t('session.previous')}
                  </AppText>
                  <AppText variant="caption" secondary style={styles.cTargetHead}>
                    {t('session.target')}
                  </AppText>
                  <AppText variant="caption" secondary style={styles.cDo}>
                    {`${unitLabel} × ${t('session.reps')}`}
                  </AppText>
                  <View style={styles.cTick} />
                </View>
                {view.sets.map((set, i) => (
                  <View key={set.id} style={styles.setRow}>
                    <AppText variant="tabular" style={styles.cSet}>
                      {i + 1}
                    </AppText>
                    <AppText variant="callout" secondary style={styles.cPrev} numberOfLines={2}>
                      {fmt(set.exerciseId, set.prevWeightKg, set.prevReps)}
                    </AppText>
                    <Pressable
                      onPress={() => setTargetFor(view)}
                      style={styles.cTarget}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('session.target')}: ${fmt(set.exerciseId, set.targetWeightKg, set.targetReps)}`}
                      testID={`target-${view.exercise.exerciseId}-${i}`}
                    >
                      <AppText variant="callout" accent numberOfLines={2}>
                        {fmt(set.exerciseId, set.targetWeightKg, set.targetReps)}
                      </AppText>
                    </Pressable>
                    <View style={[styles.cDo, styles.doRow]}>
                      <Pressable
                        onPress={() => setEditing({ set, field: 'weight' })}
                        style={[styles.cell, { backgroundColor: p.inputBg }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('session.setN', { n: i + 1 })}, ${t('session.weight')}: ${set.weightKg != null ? formatWeight(set.weightKg, unit) : t('session.none')}`}
                        testID={`weight-${view.exercise.exerciseId}-${i}`}
                      >
                        <AppText variant="tabular">
                          {set.weightKg != null ? formatWeight(set.weightKg, unit) : t('session.none')}
                        </AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditing({ set, field: 'reps' })}
                        style={[styles.cell, { backgroundColor: p.inputBg }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('session.setN', { n: i + 1 })}, ${t('session.reps')}: ${set.reps ?? t('session.none')}`}
                        testID={`reps-${view.exercise.exerciseId}-${i}`}
                      >
                        <AppText variant="tabular">{set.reps ?? t('session.none')}</AppText>
                      </Pressable>
                    </View>
                    <View style={styles.cTick}>
                      <SetTick
                        done={set.done}
                        onToggle={() => toggle(view, set, i + 1)}
                        label={set.done ? t('session.untick', { n: i + 1 }) : t('session.tick', { n: i + 1 })}
                        testID={`tick-${view.exercise.exerciseId}-${i}`}
                      />
                    </View>
                  </View>
                ))}
                <View style={styles.setTools}>
                  <Button
                    title={t('session.addSet')}
                    kind="plain"
                    icon="add"
                    onPress={() => sessionRepo.addSet(view.exercise.id)}
                    testID={`add-set-${view.exercise.exerciseId}`}
                  />
                  {view.sets.length > 1 ? (
                    <Button
                      title={t('session.removeSet')}
                      kind="plain"
                      icon="remove"
                      onPress={() => sessionRepo.removeSet(view.sets[view.sets.length - 1].id)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button
            title={t('session.addExercise')}
            kind="secondary"
            icon="add"
            onPress={() => router.push({ pathname: '/exercises', params: { sessionId: session.id } })}
            testID="session-add-exercise"
          />
          <Button
            title={t('session.finish')}
            icon="flag-outline"
            onPress={() => {
              useRestTimer.getState().stop();
              router.push({ pathname: '/session/summary/[id]', params: { id: session.id } });
            }}
            disabled={totals.setsDone === 0}
            testID="session-finish"
          />
          <Button title={t('session.discard')} kind="danger" onPress={discard} testID="session-discard" />
        </View>
      </Screen>

      <RestTimerBar />

      <NumberPad
        visible={!!editing}
        title={
          editing
            ? `${editingView?.exercise.exerciseName ?? ''} · ${t('session.setN', { n: (editingView?.sets.findIndex((s) => s.id === editing.set.id) ?? 0) + 1 })}`
            : ''
        }
        initial={
          editing
            ? editing.field === 'weight'
              ? editing.set.weightKg != null
                ? displayWeight(editing.set.weightKg, unit)
                : null
              : editing.set.reps
            : null
        }
        allowDecimal={editing?.field === 'weight'}
        suffix={editing?.field === 'weight' ? unitLabel : t('session.reps')}
        max={editing?.field === 'weight' ? 2000 : 999}
        onClose={() => setEditing(null)}
        onSubmit={(value) => {
          if (editing) {
            if (editing.field === 'weight')
              sessionRepo.updateSet(editing.set.id, {
                weightKg: value === null ? null : weightToKg(value, unit),
              });
            else sessionRepo.updateSet(editing.set.id, { reps: value === null ? null : Math.round(value) });
          }
          setEditing(null);
        }}
      />

      <TargetSheet
        visible={!!targetFor}
        title={targetFor?.exercise.exerciseName ?? ''}
        weightKg={
          targetFor?.sets.find((s) => !s.done)?.targetWeightKg ?? targetFor?.sets[0]?.targetWeightKg ?? null
        }
        reps={targetFor?.sets.find((s) => !s.done)?.targetReps ?? targetFor?.config?.repMin ?? 8}
        unit={unit}
        canForward={!!targetFor?.config}
        onClose={() => setTargetFor(null)}
        onApply={(target, scope) => targetFor && applyTarget(targetFor, target, scope)}
      />

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.exercise.exerciseName}>
        {menuFor ? (
          <>
            <CardGroup>
              <ListRow
                title={t('session.swap')}
                icon="swap-horizontal-outline"
                onPress={() => {
                  const target = menuFor.exercise.id;
                  setMenuFor(null);
                  router.push({ pathname: '/exercises', params: { swap: target } });
                }}
              />
              <ListRow
                title={t('session.moveUp')}
                icon="arrow-up"
                onPress={() => {
                  move(
                    exercises.findIndex((e) => e.exercise.id === menuFor.exercise.id),
                    -1,
                  );
                  setMenuFor(null);
                }}
              />
              <ListRow
                title={t('session.moveDown')}
                icon="arrow-down"
                onPress={() => {
                  move(
                    exercises.findIndex((e) => e.exercise.id === menuFor.exercise.id),
                    1,
                  );
                  setMenuFor(null);
                }}
              />
              <ListRow
                title={t('session.removeExercise')}
                icon="trash-outline"
                danger
                onPress={() => {
                  sessionRepo.removeExercise(menuFor.exercise.id);
                  setMenuFor(null);
                }}
              />
            </CardGroup>
            <AppText variant="caption" secondary>
              {t('session.exerciseRest')}
            </AppText>
            <View style={styles.chips}>
              <Chip
                label={t('session.restDefault')}
                selected={menuFor.exercise.restSec === null}
                onPress={() => {
                  sessionRepo.setExerciseRest(menuFor.exercise.id, null);
                  setMenuFor(null);
                }}
              />
              <Chip
                label={t('session.restOff')}
                selected={menuFor.exercise.restSec === 0}
                onPress={() => {
                  sessionRepo.setExerciseRest(menuFor.exercise.id, 0);
                  setMenuFor(null);
                }}
              />
              {[60, 90, 120, 180].map((sec) => (
                <Chip
                  key={sec}
                  label={t('common.secondsShort', { count: sec })}
                  selected={menuFor.exercise.restSec === sec}
                  onPress={() => {
                    sessionRepo.setExerciseRest(menuFor.exercise.id, sec);
                    setMenuFor(null);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}
      </Sheet>

      <Sheet visible={sessionMenu} onClose={() => setSessionMenu(false)} title={title}>
        <CardGroup>
          <ListRow
            title={t('session.addExercise')}
            icon="add"
            onPress={() => {
              setSessionMenu(false);
              router.push({ pathname: '/exercises', params: { sessionId: session.id } });
            }}
          />
          <ListRow
            title={t('session.discard')}
            icon="trash-outline"
            danger
            onPress={() => {
              setSessionMenu(false);
              discard();
            }}
          />
        </CardGroup>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { gap: spacing.xs, marginVertical: spacing.md },
  list: { gap: spacing.md },
  flex: { flex: 1 },
  exHeader: { flexDirection: 'row', alignItems: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 8, gap: spacing.xs },
  cSet: { width: 28, textAlign: 'center' },
  cPrev: { flex: 1.1 },
  cTarget: { flex: 1.1, minHeight: MIN_TOUCH, justifyContent: 'center' },
  cTargetHead: { flex: 1.1 },
  cDo: { flex: 1.4 },
  cTick: { width: MIN_TOUCH, alignItems: 'center' },
  doRow: { flexDirection: 'row', gap: spacing.xs },
  cell: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTools: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  actions: { marginTop: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl * 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
