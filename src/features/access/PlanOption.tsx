import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, RadioIndicator } from '../../components';
import type { PlanKind, StorePlan } from '../../domain/entitlement/paywall';
import { radius, spacing } from '../../theme/tokens';
import { usePalette } from '../../theme/useTheme';

/** คีย์ข้อความ i18n ของการ์ดแพ็กเกจแต่ละชนิด */
const PLAN_COPY = {
  monthly: {
    title: 'paywall.plans.monthly',
    price: 'paywall.plans.perMonth',
    priceLabel: 'paywall.plans.perMonthLabel',
    note: 'paywall.plans.monthlyNote',
  },
  lifetime: {
    title: 'paywall.plans.lifetime',
    price: 'paywall.plans.oneTime',
    priceLabel: 'paywall.plans.oneTimeLabel',
    note: 'paywall.plans.lifetimeNote',
  },
} as const satisfies Record<PlanKind, { title: string; price: string; priceLabel: string; note: string }>;

/** การ์ดเลือกแพ็กเกจบน Paywall (radio) — ป้ายทดลองฟรีแสดงเฉพาะรายเดือนเมื่อโมเดลเสนอทดลอง */
export function PlanOption({
  kind,
  storePlan,
  selected,
  offerTrial,
  trialDays,
  onSelect,
}: {
  kind: PlanKind;
  storePlan: StorePlan;
  selected: boolean;
  offerTrial: boolean;
  trialDays: number | null;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const p = usePalette();
  const copy = PLAN_COPY[kind];
  const title = t(copy.title);
  const price = t(copy.price, { price: storePlan.priceString });
  const note = t(copy.note);
  const trial = kind === 'monthly' && offerTrial ? t('paywall.plans.trialBadge', { count: trialDays }) : null;
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, price, trial, note].filter(Boolean).join(', ')}
      testID={`plan-${kind}`}
      style={[
        styles.plan,
        { backgroundColor: selected ? p.accentSoft : p.card, borderColor: selected ? p.accent : p.separator },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="headline">{title}</AppText>
        <RadioIndicator selected={selected} />
      </View>
      {/* ราคาเต็มจากสโตร์ห้ามถูกตัดทอน (B5) — ราคาและรอบการชำระแยกบรรทัด ตัดคำได้ */}
      <AppText variant="title" color={selected ? p.accent : p.text}>
        {storePlan.priceString}
      </AppText>
      <AppText variant="callout" color={selected ? p.accent : p.text}>
        {t(copy.priceLabel)}
      </AppText>
      {trial ? <Badge label={trial} /> : null}
      <AppText variant="caption" secondary>
        {note}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plan: {
    flex: 1,
    borderRadius: radius.card - 8,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 150,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
