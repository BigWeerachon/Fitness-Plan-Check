import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Sheet, Stepper, TextField } from '../../components';
import type { WeightUnit } from '../../db/schema';
import { displayWeight, weightToKg } from '../../domain/units';
import { spacing } from '../../theme/tokens';

/**
 * แตะเป้าระหว่างฝึกเพื่อปรับ แล้วเลือก "ใช้เฉพาะวันนี้" หรือ "ใช้ต่อไป" (SPEC G2) — ไม่บังคับทำตามคำแนะนำ
 */
export function TargetSheet({
  visible,
  title,
  weightKg,
  reps,
  unit,
  canForward,
  onClose,
  onApply,
}: {
  visible: boolean;
  title: string;
  weightKg: number | null;
  reps: number;
  unit: WeightUnit;
  canForward: boolean;
  onClose: () => void;
  onApply: (target: { weightKg: number | null; reps: number }, scope: 'today' | 'forward') => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('session.adjustTitle')} testID="target-sheet">
      {visible ? (
        <Body
          title={title}
          weightKg={weightKg}
          reps={reps}
          unit={unit}
          canForward={canForward}
          onApply={onApply}
        />
      ) : null}
    </Sheet>
  );
}

function Body({
  title,
  weightKg,
  reps,
  unit,
  canForward,
  onApply,
}: {
  title: string;
  weightKg: number | null;
  reps: number;
  unit: WeightUnit;
  canForward: boolean;
  onApply: (target: { weightKg: number | null; reps: number }, scope: 'today' | 'forward') => void;
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(weightKg != null ? String(displayWeight(weightKg, unit)) : '');
  const [r, setR] = useState(reps);
  const parsed = weight.trim() === '' ? null : Number(weight.replace(',', '.'));
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0);
  const target = () => ({ weightKg: parsed === null ? null : weightToKg(parsed, unit), reps: r });
  return (
    <View style={styles.gap}>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      <TextField
        label={t('session.enterWeight', { unit: t(`common.units.${unit}`) })}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        error={valid ? null : t('errors.invalidNumber')}
        testID="target-weight"
      />
      <Stepper
        label={t('session.enterReps')}
        value={r}
        onChange={setR}
        min={1}
        max={100}
        testID="target-reps"
      />
      <AppText variant="caption" secondary align="center">
        {t('session.adjustHint')}
      </AppText>
      <Button
        title={t('session.todayOnly')}
        kind="secondary"
        disabled={!valid}
        onPress={() => onApply(target(), 'today')}
        testID="target-today"
      />
      {canForward ? (
        <Button
          title={t('session.fromNowOn')}
          disabled={!valid}
          onPress={() => onApply(target(), 'forward')}
          testID="target-forward"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
});
