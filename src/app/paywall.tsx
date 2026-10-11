import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import {
  ActionBar,
  AppText,
  Badge,
  Button,
  Card,
  CardGroup,
  ErrorState,
  HeroTitle,
  Icon,
  IconButton,
  ListRow,
  LoadingState,
  Screen,
  StackHeader,
} from '../components';
import { purchasePlan, refreshEntitlement, restorePurchases } from '../features/access/accountFlow';
import { usePaywallData } from '../features/access/usePaywallData';
import { getAccess, useAccess } from '../features/access/useAccess';
import { useManageSubscriptions } from '../features/access/useManageSubscriptions';
import {
  billedTerms,
  buildPaywallModel,
  nextStepOnSelect,
  purchaseStillNeeded,
  type PlanKind,
  type StorePlan,
} from '../domain/entitlement/paywall';
import { getServices } from '../services/registry';
import { useAuth } from '../stores/auth';
import { useEntitlement } from '../stores/entitlement';
import { radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';

const PLAN_KINDS: PlanKind[] = ['monthly', 'lifetime'];

/**
 * Paywall (SPEC B4–B6, J2, J4, J5) — ไม่มี dark pattern: ราคาจากสโตร์, เงื่อนไขต่ออายุ/ยกเลิกครบ,
 * ปุ่มกู้คืนการซื้อ, ลิงก์ Terms/Privacy และไม่โฆษณาทดลองฟรีกับผู้ที่ไม่มีสิทธิ์
 * ผู้ใช้ที่ไม่มีสิทธิ์ถูกพามาที่นี่จาก AccessGate จึงไม่มีปุ่ม "ข้าม" เข้าแอป (ล็อกทุกฟีเจอร์ B3)
 * ?upgrade=lifetime (จากการตั้งค่า) → ผู้ที่มีรายเดือน/ทดลองอยู่ซื้อขาดได้ พร้อมแจ้งว่ารายเดือนไม่ถูกยกเลิกให้
 */
export default function PaywallScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const params = useLocalSearchParams<{ plan?: PlanKind; upgrade?: string }>();
  const access = useAccess();
  const user = useAuth((s) => s.user);
  const eligibility = useEntitlement((s) => s.trialEligibility);
  const billingIssue = useEntitlement((s) => s.cached?.billingIssueAt != null);
  const { plans, loading, error, reload } = usePaywallData();
  const openManage = useManageSubscriptions();
  const [selected, setSelected] = useState<PlanKind | null>(params.plan ?? null);
  const [busy, setBusy] = useState(false);
  const store = Platform.OS === 'ios' ? t('paywall.store.ios') : t('paywall.store.android');

  const model = useMemo(
    () =>
      buildPaywallModel({
        state: access.state,
        monthly: plans?.monthly ?? null,
        lifetime: plans?.lifetime ?? null,
        trialEligibility: eligibility,
        billingIssue,
        upgrade: params.upgrade === 'lifetime',
      }),
    [access.state, plans, eligibility, billingIssue, params.upgrade],
  );
  const planOf = (kind: PlanKind): StorePlan | null => (kind === 'monthly' ? model.monthly : model.lifetime);
  // แพ็กเกจที่ส่งมากับลิงก์อาจไม่มีในโหมดนี้ (เช่น อัปเกรดมีแค่ซื้อขาด) → ใช้ค่าตั้งต้นของโมเดล
  const plan: PlanKind | null = selected && planOf(selected) ? selected : model.defaultPlan;
  const chosen: StorePlan | null = plan ? planOf(plan) : null;
  const billed = billedTerms(model, plan);

  if (access.allowed && !access.pending && !model.upgrade) return <Redirect href="/" />;

  const ctaTitle = (): string => {
    if (!chosen) return t('paywall.unavailable');
    if (chosen.kind === 'lifetime') return t('paywall.cta.lifetime', { price: chosen.priceString });
    return model.offerTrial
      ? t('paywall.cta.trial', { price: chosen.priceString })
      : t('paywall.cta.monthly', { price: chosen.priceString });
  };

  const onBuy = async () => {
    if (!chosen) return;
    const upgrade = model.upgrade;
    const step = nextStepOnSelect(chosen.kind, {
      authUserId: user?.id ?? null,
      purchasesUserId: getServices().purchases.currentAppUserId(),
    });
    // ยังไม่ล็อกอิน → ไปล็อกอินก่อน แล้วกลับมาที่นี่พร้อมแพ็กเกจที่เลือก (SPEC B4)
    if (step.step === 'needLogin') {
      router.push({ pathname: '/login', params: { plan: chosen.kind } });
      return;
    }
    setBusy(true);
    try {
      if (step.step === 'linkingAccount') {
        await refreshEntitlement();
        // ผูกบัญชีแล้วพบว่ามีสิทธิ์อยู่แล้ว → ไม่เปิดหน้าซื้อซ้ำ (SPEC B11, J3)
        if (!purchaseStillNeeded(getAccess(), chosen.kind, upgrade)) {
          router.replace('/');
          return;
        }
      }
      const result = await purchasePlan(chosen);
      if (result.status === 'success') {
        Alert.alert(t('paywall.success'));
        router.replace('/');
      } else if (result.status === 'error') {
        Alert.alert(
          t('common.errorTitle'),
          result.code === 'network'
            ? t('errors.purchaseOffline')
            : result.code === 'not_allowed'
              ? t('errors.purchaseNotAllowed')
              : t('errors.purchaseFailed'),
        );
      }
    } catch {
      Alert.alert(t('common.errorTitle'), t('errors.purchaseFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    const outcome = await restorePurchases();
    setBusy(false);
    if (outcome === 'needLogin') router.push({ pathname: '/login', params: { then: 'restore' } });
    else if (outcome === 'restored') Alert.alert(t('paywall.restored'));
    else if (outcome === 'none') Alert.alert(t('paywall.nothingToRestore'));
    else Alert.alert(t('common.errorTitle'), t('errors.restoreFailed'));
  };

  const features: { icon: React.ComponentProps<typeof Icon>['name']; text: string }[] = [
    { icon: 'today-outline', text: t('paywall.features.today') },
    { icon: 'calendar-outline', text: t('paywall.features.programs') },
    { icon: 'trending-up-outline', text: t('paywall.features.overload') },
    { icon: 'pie-chart-outline', text: t('paywall.features.stats') },
    { icon: 'cloud-done-outline', text: t('paywall.features.sync') },
  ];

  const fixPayment = model.primaryAction === 'fixPayment';
  const billedText = billed
    ? t(billed.key, { price: billed.price, count: billed.key === 'paywall.billed.trial' ? billed.count : 0 })
    : null;

  return (
    <Screen
      testID="paywall"
      header={
        model.upgrade ? (
          <StackHeader backIcon="close" />
        ) : (
          <ActionBar>
            <IconButton
              icon="settings-outline"
              label={t('paywall.account')}
              onPress={() => router.push('/account')}
            />
          </ActionBar>
        )
      }
    >
      <HeroTitle
        title={t(`paywall.headline.${model.headline}`)}
        subtitle={t(`paywall.sub.${model.headline}`, { store })}
        compact
      />

      {/* สิทธิ์หมดเพราะตัดเงินไม่ผ่าน → ทางแก้หลักคืออัปเดตวิธีชำระเงินในสโตร์ ไม่ใช่สมัครใหม่ (SPEC J5) */}
      {fixPayment ? (
        <View style={styles.fix}>
          <Button
            title={t('paywall.cta.fixPayment')}
            icon="card-outline"
            onPress={() => void openManage()}
            testID="paywall-fix-payment"
          />
        </View>
      ) : null}

      <CardGroup>
        {features.map((f) => (
          <ListRow key={f.text} title={f.text} icon={f.icon} />
        ))}
      </CardGroup>

      {loading ? (
        <View style={styles.block}>
          <LoadingState label={t('paywall.loadingPlans')} />
        </View>
      ) : error || model.unavailable ? (
        <ErrorState message={t('paywall.unavailable')} onRetry={reload} />
      ) : (
        <View style={styles.plans} accessibilityRole="radiogroup">
          {PLAN_KINDS.map((kind) => {
            const sp = planOf(kind);
            if (!sp) return null;
            const on = plan === kind;
            const title = kind === 'monthly' ? t('paywall.plans.monthly') : t('paywall.plans.lifetime');
            const price =
              kind === 'monthly'
                ? t('paywall.plans.perMonth', { price: sp.priceString })
                : t('paywall.plans.oneTime', { price: sp.priceString });
            const note =
              kind === 'monthly' ? t('paywall.plans.monthlyNote') : t('paywall.plans.lifetimeNote');
            const trial =
              kind === 'monthly' && model.offerTrial
                ? t('paywall.plans.trialBadge', { count: model.trialDays })
                : null;
            return (
              <Pressable
                key={kind}
                onPress={() => setSelected(kind)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={[title, price, trial, note].filter(Boolean).join(', ')}
                testID={`plan-${kind}`}
                style={[
                  styles.plan,
                  { backgroundColor: on ? p.accentSoft : p.card, borderColor: on ? p.accent : p.separator },
                ]}
              >
                <View style={styles.planHeader}>
                  <AppText variant="headline">{title}</AppText>
                  <Icon
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={on ? p.accent : p.textSecondary}
                  />
                </View>
                {/* ราคาเต็มจากสโตร์ห้ามถูกตัดทอน (B5) — ราคาและรอบการชำระแยกบรรทัด ตัดคำได้ */}
                <AppText variant="title" color={on ? p.accent : p.text}>
                  {sp.priceString}
                </AppText>
                <AppText variant="callout" color={on ? p.accent : p.text}>
                  {kind === 'monthly' ? t('paywall.plans.perMonthLabel') : t('paywall.plans.oneTimeLabel')}
                </AppText>
                {trial ? <Badge label={trial} /> : null}
                <AppText variant="caption" secondary>
                  {note}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.actions}>
        {/* ซื้อขาดไม่ยกเลิกรายเดือน/ทดลองที่มีอยู่ — ต้องแจ้งก่อนซื้อพร้อมทางลัดไปยกเลิก (SPEC J5) */}
        {model.upgrade ? (
          <Card>
            <View style={styles.noticeRow}>
              <Icon name="warning-outline" size={20} color={p.warning} />
              <AppText style={styles.flex} testID="paywall-upgrade-notice">
                {t('paywall.upgrade.notice', { store })}
              </AppText>
            </View>
            <Button
              title={t('paywall.upgrade.manage')}
              kind="plain"
              icon="open-outline"
              onPress={() => void openManage()}
              testID="paywall-upgrade-manage"
            />
          </Card>
        ) : null}

        {/* ยอดที่ถูกเรียกเก็บจริงติดปุ่มซื้อ เด่นไม่น้อยกว่าคำว่า "ฟรี" (App Review 3.1.2, SPEC B5) */}
        {billedText && !loading && !error ? (
          <AppText variant="headline" align="center" testID="paywall-billed">
            {billedText}
          </AppText>
        ) : null}
        <Button
          title={ctaTitle()}
          kind={fixPayment ? 'secondary' : 'primary'}
          onPress={onBuy}
          disabled={!chosen || loading}
          loading={busy}
          testID="paywall-cta"
        />
        <AppText variant="caption" secondary align="center">
          {user ? t('paywall.cta.signedInAs', { email: user.email ?? '' }) : t('paywall.cta.signInFirst')}
        </AppText>

        {/* ข้อความเปิดเผยข้อมูลที่สโตร์กำหนด (SPEC B5) */}
        <View style={styles.disclosures} testID="paywall-disclosures">
          {model.disclosures.map((key) => (
            <AppText key={key} variant="caption" secondary align="center">
              {t(key, { count: model.trialDays ?? 0, price: model.monthly?.priceString ?? '', store })}
            </AppText>
          ))}
        </View>

        <Button
          title={t('paywall.restore')}
          kind="secondary"
          onPress={onRestore}
          disabled={busy}
          testID="paywall-restore"
        />
        {model.upgrade ? null : (
          <Button
            title={t('paywall.manageSubscription')}
            kind="plain"
            onPress={() => void openManage()}
            testID="paywall-manage"
          />
        )}
      </View>

      <View style={styles.links}>
        <Button
          title={t('paywall.terms')}
          kind="plain"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
        />
        <Button
          title={t('paywall.privacy')}
          kind="plain"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
        />
        <Button title={t('paywall.references')} kind="plain" onPress={() => router.push('/references')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { minHeight: 160 },
  fix: { marginBottom: spacing.xl },
  plans: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  plan: {
    flex: 1,
    borderRadius: radius.card - 8,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 150,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  noticeRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  disclosures: { gap: spacing.xs },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.lg },
});
