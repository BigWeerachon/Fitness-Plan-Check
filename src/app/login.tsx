import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, HeroTitle, Screen, StackHeader } from '../components';
import { restorePurchases, signIn } from '../features/access/accountFlow';
import { getAccess } from '../features/access/useAccess';
import { useSettings } from '../stores/settings';
import { AppleButton, GoogleButton } from '../features/auth/SignInButtons';
import type { AuthProvider } from '../services/auth/types';
import { getServices } from '../services/registry';
import { spacing } from '../theme/tokens';

/**
 * ล็อกอินด้วย Google / Apple เท่านั้น (SPEC B10) ปุ่มทั้งสองขนาดและความเด่นเท่ากัน
 * มาจาก Paywall (?plan=…) → สำเร็จแล้วกลับ Paywall พร้อมแพ็กเกจที่เลือกไว้ (B4)
 * ?then=restore → กู้คืนการซื้อต่อทันทีหลังล็อกอิน
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ plan?: string; then?: string; from?: string }>();
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(true);

  useEffect(() => {
    let alive = true;
    getServices()
      .auth.isAppleAvailable()
      .then((ok) => alive && setAppleAvailable(ok))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const goNext = () => {
    // บัญชีมีสิทธิ์อยู่แล้ว (เช่น ติดตั้งใหม่ B11) → เข้าแอปเลย ไม่ต้องซื้อซ้ำ และข้ามขั้นตั้งค่าเริ่มต้น (SPEC C)
    if (getAccess().allowed) {
      if (!useSettings.getState().onboardingDone) useSettings.getState().set('onboardingDone', true);
      router.replace('/');
    } else if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/paywall', params: params.plan ? { plan: params.plan } : {} });
  };

  const onSignIn = async (provider: AuthProvider) => {
    setBusy(provider);
    const outcome = await signIn(provider);
    if (outcome === 'success' && params.then === 'restore') {
      const r = await restorePurchases();
      if (r === 'restored') Alert.alert(t('paywall.restored'));
      else if (r === 'none') Alert.alert(t('paywall.nothingToRestore'));
      else if (r === 'error') Alert.alert(t('common.errorTitle'), t('errors.restoreFailed'));
    }
    setBusy(null);
    if (outcome === 'success') goNext();
    else if (outcome === 'error') Alert.alert(t('common.errorTitle'), t('auth.failed'));
  };

  return (
    <Screen header={<StackHeader backIcon="close" />} testID="login">
      <HeroTitle title={t('auth.heading')} subtitle={t('auth.body')} compact />
      <View style={styles.buttons}>
        <GoogleButton label={t('auth.google')} onPress={() => onSignIn('google')} busy={busy === 'google'} />
        {appleAvailable ? (
          <AppleButton label={t('auth.apple')} onPress={() => onSignIn('apple')} busy={busy === 'apple'} />
        ) : null}
      </View>
      <AppText variant="caption" secondary align="center" style={styles.terms}>
        {t('auth.terms')}
      </AppText>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { gap: spacing.md, marginTop: spacing.lg },
  terms: { marginTop: spacing.xl },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
});
