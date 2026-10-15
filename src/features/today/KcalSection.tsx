import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, NumberPad } from '../../components';
import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { MAX_DAILY_KCAL } from '../../domain/nutrition';
import { formatNumber } from '../../i18n/format';
import { radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';
import type { TodayModel } from './loadToday';

type KcalEntry = 'burned' | 'eaten';

/** การ์ดแคลอรี่ที่เผาผลาญ/กินวันนี้ แตะเพื่อกรอกเอง (แป้นตัวเลขอยู่ในคอมโพเนนต์นี้) */
export function KcalSection({ model }: { model: TodayModel }) {
  const { t } = useTranslation();
  const p = usePalette();
  const [entry, setEntry] = useState<KcalEntry | null>(null);
  const manualBurnedKcal = model.expenditure.isManual ? model.expenditure.kcal : null;
  const entryInitial = entry === 'eaten' ? model.intakeKcal : manualBurnedKcal;

  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={[styles.card, { backgroundColor: p.card }]}
          onPress={() => setEntry('burned')}
          accessibilityRole="button"
          accessibilityLabel={`${t('today.kcalBurned')}: ${formatNumber(model.expenditure.kcal)} ${t('common.units.kcal')}`}
          accessibilityHint={t('today.tapToEnter')}
          testID="today-kcal-burned"
        >
          <AppText variant="caption" secondary>
            {t('today.kcalBurned')}
          </AppText>
          <AppText variant="mediumNumber" accent>
            {formatNumber(model.expenditure.kcal)}
          </AppText>
          <AppText variant="caption" secondary>
            {model.expenditure.isManual ? t('today.kcalManual') : t('today.kcalComputed')}
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.card, { backgroundColor: p.card }]}
          onPress={() => setEntry('eaten')}
          accessibilityRole="button"
          accessibilityLabel={`${t('today.kcalEaten')}: ${
            model.intakeKcal != null
              ? `${formatNumber(model.intakeKcal)} ${t('common.units.kcal')}`
              : t('nutrition.notEntered')
          }`}
          accessibilityHint={t('today.tapToEnter')}
          testID="today-kcal-eaten"
        >
          <AppText variant="caption" secondary>
            {t('today.kcalEaten')}
          </AppText>
          <AppText variant="mediumNumber">
            {model.intakeKcal != null ? formatNumber(model.intakeKcal) : '–'}
          </AppText>
          <AppText variant="caption" secondary>
            {model.targetKcal != null
              ? t('today.kcalTarget', { kcal: formatNumber(model.targetKcal) })
              : t('today.tapToEnter')}
          </AppText>
        </Pressable>
      </View>

      <NumberPad
        visible={entry !== null}
        title={entry === 'eaten' ? t('today.enterEaten') : t('today.enterBurned')}
        initial={entryInitial}
        allowDecimal={false}
        suffix={t('common.units.kcal')}
        max={MAX_DAILY_KCAL}
        onClose={() => setEntry(null)}
        onSubmit={(value) => {
          if (entry === 'eaten') dailyLogRepo.upsert(model.date, { kcalIntake: value });
          else dailyLogRepo.upsert(model.date, { kcalExpenditureOverride: value });
          setEntry(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  card: { flex: 1, borderRadius: radius.card, padding: spacing.lg, minHeight: 110, gap: 2 },
});
