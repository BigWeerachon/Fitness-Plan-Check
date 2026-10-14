import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CardGroup, HeroTitle, ListRow, Screen, SectionTitle, StackHeader } from '../components';
import { describeSubscription } from '../features/access/subscriptionInfo';
import { useAccess } from '../features/access/useAccess';
import { useManageSubscriptions } from '../features/access/useManageSubscriptions';
import { useRestorePurchases } from '../features/access/useRestorePurchases';
import { AppearanceGroup } from '../features/appearance/AppearancePickers';
import { openLegal } from '../features/legal/openLegal';
import { useEntitlement } from '../stores/entitlement';

/**
 * ศูนย์รวมสิ่งที่เข้าถึงได้เสมอแม้ไม่มีสิทธิ์ (SPEC B3): ภาษา/ธีม/สีหลัก, Restore Purchases,
 * จัดการ/ยกเลิกสมาชิก, ข้อมูลของคุณ (ลบข้อมูลทั้งหมดในเครื่อง), Privacy, Terms, แหล่งอ้างอิง
 * ไม่มีบัญชี/ล็อกอิน (D81)
 */
export default function AccountScreen() {
  const { t } = useTranslation();
  const cached = useEntitlement((s) => s.cached);
  const access = useAccess();
  const openManage = useManageSubscriptions();
  const sub = describeSubscription(cached, t);
  const onRestore = useRestorePurchases();

  return (
    <Screen header={<StackHeader />} testID="account">
      <HeroTitle title={t('account.title')} compact />

      <SectionTitle>{t('account.sections.appearance')}</SectionTitle>
      <AppearanceGroup showLabels={false} />

      <SectionTitle>{t('account.sections.membership')}</SectionTitle>
      <CardGroup>
        <ListRow title={sub.status} value={sub.detail} icon="ribbon-outline" />
        {sub.notice ? (
          <ListRow
            title={sub.notice}
            icon="warning-outline"
            onPress={openManage}
            accessibilityHint={t('account.notice.openStore')}
            testID="account-monthly-notice"
          />
        ) : null}
        {!access.allowed ? (
          <ListRow
            title={t('account.seePlans')}
            icon="sparkles-outline"
            onPress={() => router.replace('/paywall')}
          />
        ) : null}
        {!access.allowed ? (
          <ListRow
            title={t('account.editSetup')}
            value={t('account.editSetupSub')}
            icon="options-outline"
            onPress={() => router.push('/onboarding/profile')}
            testID="account-edit-setup"
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
          onPress={openManage}
          testID="account-manage"
        />
      </CardGroup>

      {/* ข้อมูลอยู่ในเครื่องนี้เท่านั้น — เข้าถึงได้แม้ล็อก (เช่น เครื่องใหม่ก่อนกู้คืนการซื้อ) */}
      <SectionTitle>{t('account.sections.data')}</SectionTitle>
      <CardGroup>
        <ListRow
          title={t('account.deleteData')}
          icon="trash-outline"
          danger
          onPress={() => router.push('/delete-data')}
          testID="account-delete-data"
        />
      </CardGroup>

      <SectionTitle>{t('account.sections.info')}</SectionTitle>
      <CardGroup>
        <ListRow
          title={t('account.privacy')}
          icon="shield-checkmark-outline"
          onPress={() => openLegal('privacy')}
        />
        <ListRow title={t('account.terms')} icon="document-text-outline" onPress={() => openLegal('terms')} />
        <ListRow
          title={t('account.references')}
          icon="library-outline"
          onPress={() => router.push('/references')}
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
