import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import {
  ActionBar,
  AppText,
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
import { purchasePlan, refreshEntitlement } from '../features/access/accountFlow';
import { usePaywallData } from '../features/access/usePaywallData';
import { getAccess, useAccess } from '../features/access/useAccess';
import { useManageSubscriptions } from '../features/access/useManageSubscriptions';
import { useRestorePurchases } from '../features/access/useRestorePurchases';
import { openLegal } from '../features/legal/openLegal';
import { PlanOption } from '../features/access/PlanOption';
import {
  billedTerms,
  buildPaywallModel,
  nextStepOnSelect,
  purchaseStillNeeded,
  type PlanKind,
  type StorePlan,
} from '../domain/entitlement/paywall';
import type { PurchaseResult } from '../services/purchases/types';
import { getServices } from '../services/registry';
import { useAuth } from '../stores/auth';
import { useEntitlement } from '../stores/entitlement';
import { spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';

const PLAN_KINDS: PlanKind[] = ['monthly', 'lifetime'];

/** รหัสข้อผิดพลาดของสโตร์ที่มีข้อความเฉพาะ — รหัสอื่น (store/unknown) ใช้ errors.purchaseFailed */
const PURCHASE_ERROR_KEY: Partial<
  Record<
    Extract<PurchaseResult, { status: 'error' }>['code'],
    'errors.purchaseOffline' | 'errors.purchaseNotAllowed'
  >
> = {
  network: 'errors.purchaseOffline',
  not_allowed: 'errors.purchaseNotAllowed',
};

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
  const restore = useRestorePurchases();
  const [requestedKind, setRequestedKind] = useState<PlanKind | null>(params.plan ?? null);
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
  const storePlanForKind = (kind: PlanKind): StorePlan | null =>
    kind === 'monthly' ? model.monthly : model.lifetime;
  // แพ็กเกจที่ส่งมากับลิงก์อาจไม่มีในโหมดนี้ (เช่น อัปเกรดมีแค่ซื้อขาด) → ใช้ค่าตั้งต้นของโมเดล
  const selectedKind: PlanKind | null =
    requestedKind && storePlanForKind(requestedKind) ? requestedKind : model.defaultPlan;
  const selectedPlan: StorePlan | null = selectedKind ? storePlanForKind(selectedKind) : null;
  const billed = billedTerms(model, selectedKind);

  if (access.allowed && !access.pending && !model.upgrade) return <Redirect href="/" />;

  const ctaTitle = (): string => {
    if (!selectedPlan) return t('paywall.unavailable');
    if (selectedPlan.kind === 'lifetime')
      return t('paywall.cta.lifetime', { price: selectedPlan.priceString });
    return model.offerTrial
      ? t('paywall.cta.trial', { price: selectedPlan.priceString })
      : t('paywall.cta.monthly', { price: selectedPlan.priceString });
  };

  const onBuy = async () => {
    if (!selectedPlan) return;
    const upgrade = model.upgrade;
    const step = nextStepOnSelect(selectedPlan.kind, {
      authUserId: user?.id ?? null,
      purchasesUserId: getServices().purchases.currentAppUserId(),
    });
    // ยังไม่ล็อกอิน → ไปล็อกอินก่อน แล้วกลับมาที่นี่พร้อมแพ็กเกจที่เลือก (SPEC B4)
    if (step.step === 'needLogin') {
      router.push({ pathname: '/login', params: { plan: selectedPlan.kind } });
      return;
    }
    setBusy(true);
    try {
      if (step.step === 'linkingAccount') {
        await refreshEntitlement();
        // ผูกบัญชีแล้วพบว่ามีสิทธิ์อยู่แล้ว → ไม่เปิดหน้าซื้อซ้ำ (SPEC B11, J3)
        if (!purchaseStillNeeded(getAccess(), selectedPlan.kind, upgrade)) {
          router.replace('/');
          return;
        }
      }
      const result = await purchasePlan(selectedPlan);
      if (result.status === 'success') {
        Alert.alert(t('paywall.success'));
        router.replace('/');
      } else if (result.status === 'error') {
        Alert.alert(t('common.errorTitle'), t(PURCHASE_ERROR_KEY[result.code] ?? 'errors.purchaseFailed'));
      }
    } catch {
      Alert.alert(t('common.errorTitle'), t('errors.purchaseFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    await restore();
    setBusy(false);
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
            const storePlan = storePlanForKind(kind);
            if (!storePlan) return null;
            return (
              <PlanOption
                key={kind}
                kind={kind}
                storePlan={storePlan}
                selected={selectedKind === kind}
                offerTrial={model.offerTrial}
                trialDays={model.trialDays}
                onSelect={() => setRequestedKind(kind)}
              />
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
          disabled={!selectedPlan || loading}
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
        <Button title={t('paywall.terms')} kind="plain" onPress={() => openLegal('terms')} />
        <Button title={t('paywall.privacy')} kind="plain" onPress={() => openLegal('privacy')} />
        <Button title={t('paywall.references')} kind="plain" onPress={() => router.push('/references')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { minHeight: 160 },
  fix: { marginBottom: spacing.xl },
  plans: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  noticeRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  disclosures: { gap: spacing.xs },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.lg },
});
