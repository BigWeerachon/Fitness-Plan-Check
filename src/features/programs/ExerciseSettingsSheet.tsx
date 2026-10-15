import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Chip, Sheet, Stepper, TextField } from '../../components';
import type { CustomWeek, ProgressionMode, RoutineExercise, WeightUnit } from '../../db/schema';
import { parseEffort } from '../../domain/effort';
import {
  buildSettingsPatch,
  defaultCustomWeeks,
  restChoiceOf,
  type ExerciseSettingsPatch,
  type RestChoice,
} from '../../domain/exerciseSettings';
import { WEIGHT_STEP_OPTIONS } from '../../domain/progression';
import { displayWeight, parseWeightInput, roundTo } from '../../domain/units';
import { now } from '../../utils/clock';
import { spacing } from '../../theme/tokens';
import { CustomWeeksEditor } from './CustomWeeksEditor';
import { RestField } from './RestField';

const MODES: ProgressionMode[] = ['off', 'double', 'linear', 'custom'];
/** ความต่างของก้าวน้ำหนัก (หน่วยของผู้ใช้) ที่ถือว่าเป็นตัวเลือกเดียวกัน */
const STEP_MATCH_EPSILON = 0.05;

/**
 * ตั้งค่าท่าใน routine (SPEC G2): จำนวนเซ็ต, ช่วงครั้ง, โหมด progression, ก้าวน้ำหนัก (2.5 kg / 5 lb ปรับเป็น 1.25 ได้),
 * RIR/RPE (ไม่บังคับ), ตัวจับเวลาพักต่อท่า และสัปดาห์แบบกำหนดเอง
 * ตัวเลือกขั้นสูง (ก้าวน้ำหนัก, RIR, RPE, พัก) ซ่อนอยู่หลังปุ่ม "เพิ่มเติม" (SPEC A3)
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
    stepOptions.find((s) => Math.abs(s - currentStep) < STEP_MATCH_EPSILON) ?? stepOptions[0],
  );
  const [rir, setRir] = useState(value.rir != null ? String(value.rir) : '');
  const [rpe, setRpe] = useState(value.rpe != null ? String(value.rpe) : '');
  const [restChoice, setRestChoice] = useState<RestChoice>(restChoiceOf(value.restSec));
  const [customRestSec, setCustomRestSec] = useState(
    value.restSec && value.restSec > 0 ? value.restSec : defaultRestSec,
  );
  const [weeks, setWeeks] = useState<CustomWeek[]>(
    value.customWeeks && value.customWeeks.length > 0
      ? value.customWeeks
      : defaultCustomWeeks(repMin, repMax),
  );
  const [baseText, setBaseText] = useState(
    value.baseWeightKg != null ? String(displayWeight(value.baseWeightKg, unit)) : '',
  );

  const rirParsed = parseEffort(rir, 'rir');
  const rpeParsed = parseEffort(rpe, 'rpe');
  const invalid = !rirParsed.ok || !rpeParsed.ok;
  // เปิดส่วนเพิ่มเติมไว้เลยถ้าท่านี้เคยตั้งค่าขั้นสูงไว้แล้ว เพื่อไม่ให้ค่าที่ตั้งไว้ถูกซ่อน
  const hasAdvancedSettings =
    value.rir != null || value.rpe != null || value.restSec !== null || step !== stepOptions[0];
  const [showMore, setShowMore] = useState(hasAdvancedSettings);

  const save = () => {
    if (!rirParsed.ok || !rpeParsed.ok) return;
    onSave(
      buildSettingsPatch(
        value,
        {
          sets,
          repMin,
          repMax,
          mode,
          step,
          rir: rirParsed.value,
          rpe: rpeParsed.value,
          restChoice,
          customRestSec,
          weeks,
          baseWeight: parseWeightInput(baseText).value,
        },
        unit,
        now(),
      ),
    );
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
        <CustomWeeksEditor
          weeks={weeks}
          onChange={setWeeks}
          baseText={baseText}
          onBaseTextChange={setBaseText}
          unit={unit}
          newWeekReps={repMin}
        />
      ) : null}

      <Button
        title={t('common.more')}
        kind="plain"
        icon={showMore ? 'chevron-up' : 'chevron-down'}
        expanded={showMore}
        onPress={() => setShowMore(!showMore)}
        testID="setting-more"
      />
      {showMore ? (
        <View style={styles.gap}>
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
              <TextField
                label={t('programs.rir')}
                value={rir}
                onChangeText={setRir}
                keyboardType="number-pad"
                error={rirParsed.ok ? null : t('programs.rirInvalid')}
                testID="setting-rir"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label={t('programs.rpe')}
                value={rpe}
                onChangeText={setRpe}
                keyboardType="decimal-pad"
                error={rpeParsed.ok ? null : t('programs.rpeInvalid')}
                testID="setting-rpe"
              />
            </View>
          </View>

          <RestField
            choice={restChoice}
            onChoiceChange={setRestChoice}
            customSec={customRestSec}
            onCustomSecChange={setCustomRestSec}
            defaultRestSec={defaultRestSec}
          />
        </View>
      ) : null}

      <Button title={t('common.save')} onPress={save} disabled={invalid} testID="exercise-settings-save" />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
