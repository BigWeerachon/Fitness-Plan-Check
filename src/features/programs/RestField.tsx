import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Chip, Stepper } from '../../components';
import {
  MAX_REST_STEPPER_SEC,
  MIN_REST_STEPPER_SEC,
  REST_STEPPER_STEP_SEC,
  type RestChoice,
} from '../../domain/exerciseSettings';
import { spacing } from '../../theme/tokens';

/** เวลาพักต่อท่า: ใช้ค่าเริ่มต้น / ปิด / กำหนดเอง (SPEC G2) */
export function RestField({
  choice,
  onChoiceChange,
  customSec,
  onCustomSecChange,
  defaultRestSec,
}: {
  choice: RestChoice;
  onChoiceChange: (choice: RestChoice) => void;
  customSec: number;
  onCustomSecChange: (sec: number) => void;
  defaultRestSec: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <AppText variant="caption" secondary>
        {t('programs.rest')}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip
          label={t('programs.restDefault', { sec: defaultRestSec })}
          selected={choice === 'default'}
          onPress={() => onChoiceChange('default')}
        />
        <Chip
          label={t('programs.restOff')}
          selected={choice === 'off'}
          onPress={() => onChoiceChange('off')}
        />
        <Chip
          label={t('programs.restCustom')}
          selected={choice === 'custom'}
          onPress={() => onChoiceChange('custom')}
        />
      </View>
      {choice === 'custom' ? (
        <Stepper
          label={t('programs.restSeconds')}
          value={customSec}
          onChange={onCustomSecChange}
          min={MIN_REST_STEPPER_SEC}
          max={MAX_REST_STEPPER_SEC}
          step={REST_STEPPER_STEP_SEC}
          format={(v) => t('common.secondsShort', { count: v })}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
