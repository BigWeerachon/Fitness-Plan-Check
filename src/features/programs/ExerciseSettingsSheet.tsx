import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Chip, IconButton, Sheet, Stepper, TextField } from '../../components';
import type { CustomWeek, ProgressionMode, RoutineExercise, WeightUnit } from '../../db/schema';
import { changeProgressionMode, WEIGHT_STEP_OPTIONS } from '../../domain/progression';
import { displayWeight, lbToKg, roundTo, weightToKg } from '../../domain/units';
import { now } from '../../utils/clock';
import { spacing } from '../../theme/tokens';

const MODES: ProgressionMode[] = ['off', 'double', 'linear', 'custom'];
type RestChoice = 'default' | 'off' | 'custom';

export interface ExerciseSettingsPatch {
  sets: number;
  repMin: number;
  repMax: number;
  progressionMode: ProgressionMode;
  failStreak: number;
  progressionStartedAt: number | null;
  weightStepKg: number;
  rir: number | null;
  rpe: number | null;
  restSec: number | null;
  customWeeks: CustomWeek[] | null;
  baseWeightKg: number | null;
}

/**
 * ตั้งค่าท่าใน routine (SPEC G2): จำนวนเซ็ต, ช่วงครั้ง, โหมด progression, ก้าวน้ำหนัก (2.5 kg / 5 lb ปรับเป็น 1.25 ได้),
 * RIR/RPE (ไม่บังคับ), ตัวจับเวลาพักต่อท่า และสัปดาห์แบบกำหนดเอง
 */
export function ExerciseSettingsSheet({
  visible,
  title,
  value,
  unit,
  defaultRestSec,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  value: RoutineExercise | null;
  unit: WeightUnit;
  defaultRestSec: number;
  onClose: () => void;
  onSave: (patch: ExerciseSettingsPatch) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} testID="exercise-settings">
      {visible && value ? (
        <SettingsBody value={value} unit={unit} defaultRestSec={defaultRestSec} onSave={onSave} />
      ) : null}
    </Sheet>
  );
}

function SettingsBody({
  value,
  unit,
  defaultRestSec,
  onSave,
}: {
  value: RoutineExercise;
  unit: WeightUnit;
  defaultRestSec: number;
  onSave: (patch: ExerciseSettingsPatch) => void;
}) {
  const { t } = useTranslation();
  const [sets, setSets] = useState(value.sets);
  const [repMin, setRepMin] = useState(value.repMin);
  const [repMax, setRepMax] = useState(value.repMax);
  const [mode, setMode] = useState<ProgressionMode>(value.progressionMode);
  const stepOptions = WEIGHT_STEP_OPTIONS[unit];
  const currentStep = roundTo(displayWeight(value.weightStepKg, unit), 2);
  const [step, setStep] = useState<number>(
    stepOptions.find((s) => Math.abs(s - currentStep) < 0.05) ?? stepOptions[0],
  );
  const [rir, setRir] = useState(value.rir != null ? String(value.rir) : '');
  const [rpe, setRpe] = useState(value.rpe != null ? String(value.rpe) : '');
  const [rest, setRest] = useState<RestChoice>(
    value.restSec === null ? 'default' : value.restSec === 0 ? 'off' : 'custom',
  );
  const [restSec, setRestSec] = useState(value.restSec && value.restSec > 0 ? value.restSec : defaultRestSec);
  const [weeks, setWeeks] = useState<CustomWeek[]>(
    value.customWeeks && value.customWeeks.length > 0
      ? value.customWeeks
      : [
          { reps: repMax, percent: 100 },
          { reps: Math.max(repMin, repMax - 2), percent: 105 },
          { reps: repMin, percent: 110 },
        ],
  );
  const [base, setBase] = useState(
    value.baseWeightKg != null ? String(displayWeight(value.baseWeightKg, unit)) : '',
  );

  const save = () => {
    const modeFields = changeProgressionMode(value, mode, now());
    const baseNum = Number(base.replace(',', '.'));
    onSave({
      sets,
      repMin: Math.min(repMin, repMax),
      repMax: Math.max(repMin, repMax),
      ...modeFields,
      weightStepKg: unit === 'lb' ? lbToKg(step) : step,
      rir: rir.trim() === '' || Number.isNaN(Number(rir)) ? null : Math.round(Number(rir)),
      rpe: rpe.trim() === '' || Number.isNaN(Number(rpe)) ? null : Number(rpe),
      restSec: rest === 'default' ? null : rest === 'off' ? 0 : Math.max(5, restSec),
      customWeeks: mode === 'custom' ? weeks : value.customWeeks,
      baseWeightKg:
        base.trim() !== '' && Number.isFinite(baseNum) && baseNum > 0
          ? weightToKg(baseNum, unit)
          : value.baseWeightKg,
    });
  };

  return (
    <View style={styles.gap}>
      <Stepper
        label={t('programs.sets')}
        value={sets}
        onChange={setSets}
        min={1}
        max={20}
        testID="setting-sets"
      />
      <Stepper
        label={t('programs.repMin')}
        value={repMin}
        onChange={setRepMin}
        min={1}
        max={100}
        testID="setting-repmin"
      />
      <Stepper
        label={t('programs.repMax')}
        value={repMax}
        onChange={setRepMax}
        min={1}
        max={100}
        testID="setting-repmax"
      />

      <AppText variant="caption" secondary>
        {t('programs.progression')}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {MODES.map((m) => (
          <Chip
            key={m}
            label={t(`programs.modes.${m}`)}
            selected={mode === m}
            onPress={() => setMode(m)}
            testID={`mode-${m}`}
          />
        ))}
      </View>
      <AppText variant="caption" secondary>
        {t(`programs.modeHelp.${mode}`)}
      </AppText>

      {mode === 'custom' ? (
        <View style={styles.gap}>
          <TextField
            label={t('programs.baseWeight')}
            value={base}
            onChangeText={setBase}
            keyboardType="decimal-pad"
            suffix={t(`common.units.${unit}`)}
          />
          {weeks.map((w, i) => (
            <View key={i} style={styles.weekRow}>
              <AppText variant="headline" style={styles.weekLabel}>
                {t('programs.week', { n: i + 1 })}
              </AppText>
              <View style={styles.flex}>
                <Stepper
                  label={t('programs.weekReps')}
                  value={w.reps}
                  onChange={(v) => setWeeks(weeks.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                  min={1}
                  max={100}
                />
                <Stepper
                  label={t('programs.weekPercent')}
                  value={w.percent}
                  step={2.5}
                  onChange={(v) => setWeeks(weeks.map((x, j) => (j === i ? { ...x, percent: v } : x)))}
                  min={20}
                  max={150}
                  format={(v) => `${v}%`}
                />
              </View>
              {weeks.length > 1 ? (
                <IconButton
                  icon="trash-outline"
                  label={t('programs.removeWeek')}
                  onPress={() => setWeeks(weeks.filter((_, j) => j !== i))}
                />
              ) : null}
            </View>
          ))}
          {weeks.length < 8 ? (
            <Button
              title={t('programs.addWeek')}
              kind="plain"
              icon="add"
              onPress={() => setWeeks([...weeks, { reps: repMin, percent: 100 }])}
            />
          ) : null}
        </View>
      ) : null}

      <AppText variant="caption" secondary>
        {t('programs.weightStep')}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {stepOptions.map((s) => (
          <Chip
            key={s}
            label={`${s} ${t(`common.units.${unit}`)}`}
            selected={step === s}
            onPress={() => setStep(s)}
          />
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={t('programs.rir')} value={rir} onChangeText={setRir} keyboardType="number-pad" />
        </View>
        <View style={styles.flex}>
          <TextField label={t('programs.rpe')} value={rpe} onChangeText={setRpe} keyboardType="decimal-pad" />
        </View>
      </View>

      <AppText variant="caption" secondary>
        {t('programs.rest')}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip
          label={t('programs.restDefault', { sec: defaultRestSec })}
          selected={rest === 'default'}
          onPress={() => setRest('default')}
        />
        <Chip label={t('programs.restOff')} selected={rest === 'off'} onPress={() => setRest('off')} />
        <Chip
          label={t('programs.restCustom')}
          selected={rest === 'custom'}
          onPress={() => setRest('custom')}
        />
      </View>
      {rest === 'custom' ? (
        <Stepper
          label={t('programs.restSeconds')}
          value={restSec}
          onChange={setRestSec}
          min={10}
          max={600}
          step={15}
          format={(v) => t('common.secondsShort', { count: v })}
        />
      ) : null}

      <Button title={t('common.save')} onPress={save} testID="exercise-settings-save" />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekLabel: { width: 72 },
});
