import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { AppText, CardGroup, HeroTitle, ListRow, Screen, SectionTitle, StackHeader } from '../components';
import { describeSubscription } from '../features/access/subscriptionInfo';
import { TryoutBanner } from '../features/access/TryoutBanner';
import { useAccess } from '../features/access/useAccess';
import { useManageSubscriptions } from '../features/access/useManageSubscriptions';
import { useRestorePurchases } from '../features/access/useRestorePurchases';
import { AppearanceGroup } from '../features/appearance/AppearancePickers';
import { useBackup } from '../features/backup/useBackup';
import { openLegal } from '../features/legal/openLegal';
import { useEntitlement } from '../stores/entitlement';
import { spacing } from '../theme/tokens';

/**
 * ศูนย์รวมสิ่งที่เข้าถึงได้เสมอแม้ไม่มีสิทธิ์ (SPEC B3): ภาษา/ธีม/สีหลัก, Restore Purchases,
 * จัดการ/ยกเลิกสมาชิก, ข้อมูลของคุณ (สำรอง/กู้คืนจากไฟล์ D82, ลบข้อมูลทั้งหมดในเครื่อง), Privacy, Terms, แหล่งอ้างอิง
 * ไม่มีบัญชี/ล็อกอิน (D81)
 */
export default function AccountScreen() {
  const { t } = useTranslation();
  const cached = useEntitlement((s) => s.cached);
  const access = useAccess();
  const openManage = useManageSubscriptions();
  const sub = describeSubscription(cached, t);
  const onRestore = useRestorePurchases();
  // กู้คืนแล้วกลับหน้าแรก → AccessGate พาไปหน้าที่เหมาะสม (ยังไม่มีสิทธิ์ = Paywall ให้กู้คืนการซื้อต่อ)
  const backup = useBackup({ onRestored: () => router.replace('/') });

  return (
    <Screen header={<StackHeader />} testID="account">
      <TryoutBanner />
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
          title={t('backup.backUp')}
          value={backup.lastBackupLabel}
          icon="save-outline"
          onPress={() => void backup.backUp()}
          disabled={backup.busy}
          testID="account-backup"
        />
        <ListRow
          title={t('backup.restore')}
          value={t('backup.restoreSub')}
          icon="folder-open-outline"
          onPress={() => void backup.restore()}
          disabled={backup.busy}
          testID="account-restore-file"
        />
        <ListRow
          title={t('account.deleteData')}
          icon="trash-outline"
          danger
          onPress={() => router.push('/delete-data')}
          testID="account-delete-data"
        />
      </CardGroup>
      <AppText variant="caption" secondary style={styles.hint} testID="account-backup-hint">
        {t('backup.hint')}
      </AppText>

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

const styles = StyleSheet.create({
  hint: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
