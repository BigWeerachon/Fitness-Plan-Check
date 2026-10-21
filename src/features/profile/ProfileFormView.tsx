import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  CardGroup,
  Chip,
  ListRow,
  RadioIndicator,
  SegmentedControl,
  TextField,
} from '../../components';
import type { ActivityLevel, Goal, LengthUnit, Sex, WeightUnit } from '../../db/schema';
import { ACTIVITY_LEVELS, ADULT_AGE, GOALS } from '../../domain/nutrition';
import { switchFormUnits, type ProfileErrors, type ProfileForm } from '../../domain/profileInput';
import { spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

const SEXES: Sex[] = ['male', 'female'];
const WEIGHT_UNITS: WeightUnit[] = ['kg', 'lb'];
const LENGTH_UNITS: LengthUnit[] = ['cm', 'ftin'];

/** ฟอร์มข้อมูลส่วนตัว (SPEC C ขั้น 2, H1) ใช้ทั้งขั้นตั้งค่าเริ่มต้นและหน้าโปรไฟล์ — สลับ kg/lb, cm/ft-in ได้ */
export function ProfileFormView({
  form,
  errors,
  onChange,
}: {
  form: ProfileForm;
  errors: ProfileErrors;
  onChange: (next: ProfileForm) => void;
}) {
  const { t } = useTranslation();
  const p = usePalette();
  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    onChange({ ...form, [key]: value });
  const fieldError = (field: keyof ProfileErrors) => {
    const range = errors[field];
    return range ? t('errors.outOfRange', { min: range.min, max: range.max }) : null;
  };
  const age = Number(form.age);
  // Number('') = 0 จึงต้องกันช่องว่างก่อน
  const isUnderAdultAge = form.age !== '' && Number.isFinite(age) && age < ADULT_AGE;

  return (
    <View style={styles.wrap}>
      <View style={styles.block}>
        <AppText variant="caption" secondary>
          {t('onboarding.units')}
        </AppText>
        <SegmentedControl
          label={t('onboarding.weight')}
          value={form.weightUnit}
          onChange={(v) => onChange(switchFormUnits(form, { weightUnit: v }))}
          options={WEIGHT_UNITS.map((u) => ({ value: u, label: t(`common.units.${u}`) }))}
        />
        <SegmentedControl
          label={t('onboarding.height')}
          value={form.lengthUnit}
          onChange={(v) => onChange(switchFormUnits(form, { lengthUnit: v }))}
          options={LENGTH_UNITS.map((u) => ({ value: u, label: t(`common.units.${u}`) }))}
        />
      </View>

      <View style={styles.block}>
        <AppText variant="caption" secondary>
          {t('onboarding.sex')}
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('onboarding.sex')}>
          {SEXES.map((s) => (
            <Chip
              key={s}
              label={t(`onboarding.sexes.${s}`)}
              selected={form.sex === s}
              onPress={() => set('sex', form.sex === s ? null : s)}
              testID={`sex-${s}`}
            />
          ))}
        </View>
      </View>

      <TextField
        label={t('onboarding.age')}
        value={form.age}
        onChangeText={(v) => set('age', v)}
        keyboardType="number-pad"
        error={fieldError('age')}
        testID="field-age"
      />
      {isUnderAdultAge ? (
        <AppText variant="caption" color={p.warning}>
          {t('onboarding.under18')}
        </AppText>
      ) : null}

      {form.lengthUnit === 'cm' ? (
        <TextField
          label={t('onboarding.height')}
          value={form.heightCm}
          onChangeText={(v) => set('heightCm', v)}
          keyboardType="decimal-pad"
          suffix={t('common.units.cm')}
          error={fieldError('height')}
          testID="field-height"
        />
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label={t('onboarding.height')}
              value={form.heightFt}
              onChangeText={(v) => set('heightFt', v)}
              keyboardType="number-pad"
              suffix={t('onboarding.feet')}
              error={fieldError('height')}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label={t('onboarding.inches')}
              value={form.heightIn}
              onChangeText={(v) => set('heightIn', v)}
              keyboardType="decimal-pad"
              suffix={t('onboarding.inches')}
            />
          </View>
        </View>
      )}

      <TextField
        label={t('onboarding.weight')}
        value={form.weight}
        onChangeText={(v) => set('weight', v)}
        keyboardType="decimal-pad"
        suffix={t(`common.units.${form.weightUnit}`)}
        error={fieldError('weight')}
        testID="field-weight"
      />

      <View style={styles.block}>
        <AppText variant="caption" secondary>
          {t('onboarding.activity')}
        </AppText>
        <CardGroup>
          {ACTIVITY_LEVELS.map((level: ActivityLevel) => (
            <ListRow
              key={level}
              title={t(`onboarding.activities.${level}`)}
              onPress={() => set('activityLevel', level)}
              right={<RadioIndicator selected={form.activityLevel === level} />}
              testID={`activity-${level}`}
            />
          ))}
        </CardGroup>
      </View>

      <View style={styles.block}>
        <AppText variant="caption" secondary>
          {t('onboarding.goal')}
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t('onboarding.goal')}>
          {GOALS.map((g: Goal) => (
            <Chip
              key={g}
              label={t(`onboarding.goals.${g}`)}
              selected={form.goal === g}
              onPress={() => set('goal', g)}
              testID={`goal-${g}`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
