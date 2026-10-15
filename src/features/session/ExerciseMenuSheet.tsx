import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, CardGroup, Chip, ListRow, Sheet } from '../../components';
import type { RoutineExercise } from '../../db/schema';
import { spacing } from '../../theme/tokens';
import type { SessionExerciseView } from './useSessionData';

/** เวลาพักเฉพาะท่าที่เลือกได้ (วินาที) นอกจาก "ค่าเริ่มต้น" และ "ปิด" */
const REST_PRESET_SEC = [60, 90, 120, 180];

/** เมนูของท่าในเซสชัน (⋯): ตั้งค่าท่า · สลับ · เลื่อนขึ้น/ลง · ลบ · เวลาพักเฉพาะท่า — ทุกการกระทำปิดเมนูก่อน */
export function ExerciseMenuSheet({
  view,
  onClose,
  onOpenSettings,
  onSwap,
  onMove,
  onRemove,
  onSetRest,
}: {
  /** null = ปิดเมนู */
  view: SessionExerciseView | null;
  onClose: () => void;
  onOpenSettings: (view: SessionExerciseView, config: RoutineExercise) => void;
  onSwap: (view: SessionExerciseView) => void;
  onMove: (view: SessionExerciseView, delta: -1 | 1) => void;
  onRemove: (view: SessionExerciseView) => void;
  /** null = ใช้ค่าเริ่มต้น, 0 = ปิดการพัก */
  onSetRest: (view: SessionExerciseView, restSec: number | null) => void;
}) {
  const { t } = useTranslation();
  const closeThen = (action: () => void) => () => {
    onClose();
    action();
  };
  const restOptions: { key: string; label: string; value: number | null }[] = [
    { key: 'default', label: t('session.restDefault'), value: null },
    { key: 'off', label: t('session.restOff'), value: 0 },
    ...REST_PRESET_SEC.map((sec) => ({
      key: String(sec),
      label: t('common.secondsShort', { count: sec }),
      value: sec,
    })),
  ];

  return (
    <Sheet visible={!!view} onClose={onClose} title={view?.exercise.exerciseName}>
      {view ? (
        <>
          <CardGroup>
            {view.config ? (
              <ListRow
                title={t('session.exerciseSettings')}
                icon="settings-outline"
                onPress={closeThen(() => view.config && onOpenSettings(view, view.config))}
                testID="ex-settings"
              />
            ) : null}
            <ListRow
              title={t('session.swap')}
              icon="swap-horizontal-outline"
              onPress={closeThen(() => onSwap(view))}
            />
            <ListRow
              title={t('session.moveUp')}
              icon="arrow-up"
              onPress={closeThen(() => onMove(view, -1))}
            />
            <ListRow
              title={t('session.moveDown')}
              icon="arrow-down"
              onPress={closeThen(() => onMove(view, 1))}
            />
            <ListRow
              title={t('session.removeExercise')}
              icon="trash-outline"
              danger
              onPress={closeThen(() => onRemove(view))}
              testID="ex-remove"
            />
          </CardGroup>
          <AppText variant="caption" secondary>
            {t('session.exerciseRest')}
          </AppText>
          <View style={styles.chips}>
            {restOptions.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={view.exercise.restSec === option.value}
                onPress={closeThen(() => onSetRest(view, option.value))}
              />
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
