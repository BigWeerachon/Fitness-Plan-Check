import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { CardGroup, HeroTitle, ListRow, Screen, SectionTitle, StackHeader } from '../components';
import { manageSubscriptionsUrl, restorePurchases, signOut } from '../features/access/accountFlow';
import { describeSubscription } from '../features/access/subscriptionInfo';
import { useAccess } from '../features/access/useAccess';
import { AccentPicker, LanguagePicker, ThemePicker } from '../features/appearance/AppearancePickers';
import { useAuth } from '../stores/auth';
import { useEntitlement } from '../stores/entitlement';
import { spacing } from '../theme/tokens';

/**
 * ศูนย์รวมสิ่งที่เข้าถึงได้เสมอแม้ไม่มีสิทธิ์ (SPEC B3): ภาษา/ธีม/สีหลัก, ล็อกอิน/ล็อกเอาต์,
 * Restore Purchases, จัดการ/ยกเลิกสมาชิก, Privacy, Terms, แหล่งอ้างอิง, ลบบัญชีและข้อมูล
 */
export default function AccountScreen() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const cached = useEntitlement((s) => s.cached);
  const access = useAccess();
  const sub = describeSubscription(user ? cached : null, t);

  const onRestore = async () => {
    const r = await restorePurchases();
    if (r === 'needLogin') router.push({ pathname: '/login', params: { then: 'restore' } });
    else if (r === 'restored') Alert.alert(t('paywall.restored'));
    else if (r === 'none') Alert.alert(t('paywall.nothingToRestore'));
    else Alert.alert(t('common.errorTitle'), t('errors.restoreFailed'));
  };

  const onSignOut = () => {
    Alert.alert(t('account.signOut'), t('account.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.signOut'),
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/paywall'));
        },
      },
    ]);
  };

  return (
    <Screen header={<StackHeader />} testID="account">
      <HeroTitle title={t('account.title')} compact />

      <SectionTitle>{t('account.sections.appearance')}</SectionTitle>
      <CardGroup>
        <View style={styles.pad}>
          <LanguagePicker />
        </View>
        <View style={styles.pad}>
          <ThemePicker />
        </View>
        <View style={styles.pad}>
          <AccentPicker />
        </View>
      </CardGroup>

      <SectionTitle>{t('account.sections.account')}</SectionTitle>
      <CardGroup>
        {user ? (
          <ListRow
            title={t('account.signedInAs')}
            value={user.isPrivateRelay ? `${user.email ?? ''} · ${t('auth.privateRelay')}` : user.email}
            icon={user.provider === 'apple' ? 'logo-apple' : 'logo-google'}
          />
        ) : (
          <ListRow
            title={t('account.signIn')}
            value={t('account.notSignedIn')}
            icon="person-circle-outline"
            onPress={() => router.push('/login')}
          />
        )}
        {user ? <ListRow title={t('account.signOut')} icon="log-out-outline" onPress={onSignOut} /> : null}
      </CardGroup>

      <SectionTitle>{t('account.sections.membership')}</SectionTitle>
      <CardGroup>
        <ListRow title={sub.status} value={sub.detail} icon="ribbon-outline" />
        {!access.allowed ? (
          <ListRow
            title={t('account.seePlans')}
            icon="sparkles-outline"
            onPress={() => router.replace('/paywall')}
          />
        ) : null}
        <ListRow
          title={t('account.restore')}
          icon="refresh-outline"
          onPress={onRestore}
          testID="account-restore"
        />
        <ListRow
          title={t('account.manage')}
          icon="card-outline"
          onPress={async () => Linking.openURL(await manageSubscriptionsUrl())}
        />
      </CardGroup>

      <SectionTitle>{t('account.sections.info')}</SectionTitle>
      <CardGroup>
        <ListRow
          title={t('account.privacy')}
          icon="shield-checkmark-outline"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
        />
        <ListRow
          title={t('account.terms')}
          icon="document-text-outline"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
        />
        <ListRow
          title={t('account.references')}
          icon="library-outline"
          onPress={() => router.push('/references')}
        />
        <ListRow
          title={t('account.deleteAccount')}
          icon="trash-outline"
          danger
          onPress={() => router.push('/delete-account')}
        />
        <ListRow
          title={t('account.version')}
          value={Constants.expoConfig?.version ?? '1.0.0'}
          icon="information-circle-outline"
        />
      </CardGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg },
});
