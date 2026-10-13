import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CardGroup,
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
import type { RoutineExercise, SessionSet } from '../../../db/schema';
import { parseLocalDate } from '../../../domain/dates';
import type { ExerciseSettingsPatch } from '../../../domain/exerciseSettings';
import { moveItem } from '../../../domain/listOrder';
import { adjustTarget } from '../../../domain/progression';
import { setCellPatch, type SetCellField } from '../../../domain/sessionEdit';
import { restSecondsFor, sessionDurationSec } from '../../../domain/sessionSummary';
import { displayWeight } from '../../../domain/units';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { ExerciseSettingsSheet } from '../../../features/programs/ExerciseSettingsSheet';
import { ExerciseCard } from '../../../features/session/ExerciseCard';
import { ExerciseMenuSheet } from '../../../features/session/ExerciseMenuSheet';
import { RestTimerBar } from '../../../features/session/RestTimerBar';
import { TargetSheet } from '../../../features/session/TargetSheet';
import { loadSession, type SessionExerciseView } from '../../../features/session/useSessionData';
import { formatDateShort, formatDuration, joinDot, muscleNames } from '../../../i18n/format';
import { useNow } from '../../../hooks/useNow';
import { useRestTimer } from '../../../stores/restTimer';
import { now } from '../../../utils/clock';
import { confirmDestructive } from '../../../utils/confirmDestructive';
import { spacing } from '../../../theme/tokens';

type EditingCell = { set: SessionSet; field: SetCellField };

/** รีเฟรชเวลาปัจจุบันของหน้า (ใช้คำนวณระยะเวลาเซสชัน) ทุกกี่ ms */
const SESSION_CLOCK_REFRESH_MS = 30_000;
/** ค่าสูงสุดที่แป้นตัวเลขรับได้ของแต่ละช่อง */
const MAX_WEIGHT_INPUT = 2000;
const MAX_REPS_INPUT = 999;

/**
 * หน้าเซสชัน (SPEC G1): พื้นดำ ติ๊กเซ็ตสีหลัก — แต่ละท่ามีตาราง "ครั้งก่อน" กับ "เป้าหมายครั้งนี้" ในแถวเดียวกัน
 * แตะแก้ด้วยแป้นตัวเลขใหญ่, ติ๊กวงกลมเมื่อเซ็ตเสร็จ (haptic + animation), พักอัตโนมัติหลังติ๊ก,
 * เพิ่ม/ลบ/สลับ/จัดลำดับท่า และเพิ่ม/ลบเซ็ตได้ทันที — ทุกการแตะบันทึกลงเครื่องทันที (ข้อมูลไม่หาย)
 */
export default function SessionScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useRepoQuery(() => loadSession(id), id);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [targetFor, setTargetFor] = useState<SessionExerciseView | null>(null);
  const [menuFor, setMenuFor] = useState<SessionExerciseView | null>(null);
  const [sessionMenu, setSessionMenu] = useState(false);
  const [setOptionsTarget, setSetOptionsTarget] = useState<{
    view: SessionExerciseView;
    set: SessionSet;
    setNumber: number;
  } | null>(null);
  const [settingsFor, setSettingsFor] = useState<{
    view: SessionExerciseView;
    config: RoutineExercise;
  } | null>(null);
  const nowMs = useNow(SESSION_CLOCK_REFRESH_MS);

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

  /** ติ๊ก/เลิกติ๊กเซ็ต: ติ๊กแล้วเติมน้ำหนัก/ครั้งที่ยังว่างจากเป้า และเริ่มจับเวลาพัก (ยกเว้นเซ็ตสุดท้ายของเซสชัน) */
  const toggleSetDone = (view: SessionExerciseView, set: SessionSet, setNumber: number) => {
    const becomingDone = !set.done;
    if (becomingDone && (set.weightKg == null || set.reps == null)) {
      sessionRepo.updateSet(set.id, {
        weightKg: set.weightKg ?? set.targetWeightKg,
        reps: set.reps ?? set.targetReps,
      });
    }
    sessionRepo.setDone(set.id, becomingDone);
    if (becomingDone) {
      const sec = restSecondsFor(view.exercise.restSec, data.defaultRestSec, data.restEnabled);
      const isLastSetOfSession =
        setNumber === view.sets.length && view.exercise.id === exercises[exercises.length - 1]?.exercise.id;
      if (!isLastSetOfSession) useRestTimer.getState().start(session.id, sec, now());
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
    // เซ็ตที่ผู้ใช้พิมพ์น้ำหนัก/ครั้งไว้เองแล้วไม่ถูกทับ (retargetSet)
    sessionRepo.retargetPending(view.exercise.id, {
      targetWeightKg: result.session.targetWeightKg,
      targetReps: result.session.targetReps,
    });
    if (config && result.routineExercise) routineExerciseRepo.update(config.id, result.routineExercise);
    setTargetFor(null);
  };

  const saveSettings = (
    target: { view: SessionExerciseView; config: RoutineExercise },
    patch: ExerciseSettingsPatch,
  ) => {
    routineExerciseRepo.update(target.config.id, patch);
    // สะท้อนค่าที่เปลี่ยนมายังเซสชันนี้ด้วย: จำนวนเซ็ตและเวลาพักของท่า
    sessionRepo.resizeSets(target.view.exercise.id, patch.sets);
    if (patch.restSec !== target.config.restSec)
      sessionRepo.setExerciseRest(target.view.exercise.id, patch.restSec);
    setSettingsFor(null);
  };

  const removeExercise = (view: SessionExerciseView) => {
    if (!view.sets.some((s) => s.done)) {
      sessionRepo.removeExercise(view.exercise.id);
      return;
    }
    confirmDestructive(t, {
      title: t('session.removeExercise'),
      message: t('session.removeExerciseConfirm'),
      confirmLabel: t('session.removeExercise'),
      onConfirm: () => sessionRepo.removeExercise(view.exercise.id),
    });
  };

  const moveExercise = (view: SessionExerciseView, delta: -1 | 1) => {
    const ids = exercises.map((e) => e.exercise.id);
    const next = moveItem(ids, ids.indexOf(view.exercise.id), delta);
    if (next) sessionRepo.reorderExercises(session.id, next);
  };

  const discard = () =>
    confirmDestructive(t, {
      title: t('session.discard'),
      message: t('session.discardConfirm'),
      confirmLabel: t('session.discard'),
      onConfirm: () => {
        useRestTimer.getState().stop();
        sessionRepo.remove(session.id);
        router.replace('/');
      },
    });

  const title = session.routineName ?? t('session.freeSession');
  const musclesLine = joinDot(
    totals.musclesDone.length > 0 && `${t('session.musclesDone')}: ${muscleNames(t, totals.musclesDone)}`,
    totals.musclesRemaining.length > 0 &&
      `${t('session.musclesLeft')}: ${muscleNames(t, totals.musclesRemaining)}`,
  );

  const editingView = editingCell
    ? exercises.find((e) => e.exercise.id === editingCell.set.sessionExerciseId)
    : undefined;
  const isWeightField = editingCell?.field === 'weight';
  const padTitle = editingCell
    ? `${editingView?.exercise.exerciseName ?? ''} · ${t('session.setN', { n: (editingView?.sets.findIndex((s) => s.id === editingCell.set.id) ?? 0) + 1 })}`
    : '';
  let padInitial: number | null = null;
  if (editingCell) {
    if (!isWeightField) padInitial = editingCell.set.reps;
    else if (editingCell.set.weightKg != null) padInitial = displayWeight(editingCell.set.weightKg, unit);
  }

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
          {musclesLine ? (
            <AppText variant="caption" secondary align="center">
              {musclesLine}
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
          {exercises.map((view) => (
            <ExerciseCard
              key={view.exercise.id}
              view={view}
              unit={unit}
              onToggleSet={(set, setNumber) => toggleSetDone(view, set, setNumber)}
              onEditCell={(set, field) => setEditingCell({ set, field })}
              onOpenMenu={() => setMenuFor(view)}
              onOpenTarget={() => setTargetFor(view)}
              onOpenSetMenu={(set, setNumber) => setSetOptionsTarget({ view, set, setNumber })}
            />
          ))}
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
        visible={!!editingCell}
        title={padTitle}
        initial={padInitial}
        allowDecimal={isWeightField}
        suffix={isWeightField ? unitLabel : t('session.reps')}
        max={isWeightField ? MAX_WEIGHT_INPUT : MAX_REPS_INPUT}
        onClose={() => setEditingCell(null)}
        onSubmit={(value) => {
          if (editingCell)
            sessionRepo.updateSet(editingCell.set.id, setCellPatch(editingCell.field, value, unit));
          setEditingCell(null);
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

      <ExerciseMenuSheet
        view={menuFor}
        onClose={() => setMenuFor(null)}
        onOpenSettings={(view, config) => setSettingsFor({ view, config })}
        onSwap={(view) => router.push({ pathname: '/exercises', params: { swap: view.exercise.id } })}
        onMove={moveExercise}
        onRemove={removeExercise}
        onSetRest={(view, restSec) => sessionRepo.setExerciseRest(view.exercise.id, restSec)}
      />

      <ExerciseSettingsSheet
        visible={!!settingsFor}
        title={settingsFor?.view.exercise.exerciseName ?? ''}
        value={settingsFor?.config ?? null}
        unit={unit}
        defaultRestSec={data.defaultRestSec}
        onClose={() => setSettingsFor(null)}
        onSave={(patch) => settingsFor && saveSettings(settingsFor, patch)}
      />

      <Sheet
        visible={!!setOptionsTarget}
        onClose={() => setSetOptionsTarget(null)}
        title={
          setOptionsTarget
            ? `${setOptionsTarget.view.exercise.exerciseName} · ${t('session.setN', { n: setOptionsTarget.setNumber })}`
            : ''
        }
      >
        {setOptionsTarget ? (
          <CardGroup>
            <ListRow
              title={t('session.removeThisSet')}
              icon="trash-outline"
              danger
              onPress={() => {
                const { set, view } = setOptionsTarget;
                setSetOptionsTarget(null);
                if (view.sets.length > 1) sessionRepo.removeSet(set.id);
              }}
              disabled={setOptionsTarget.view.sets.length <= 1}
              testID="set-remove"
            />
          </CardGroup>
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
  actions: { marginTop: spacing.xl, gap: spacing.sm, paddingBottom: spacing.xxxl * 2 },
});
