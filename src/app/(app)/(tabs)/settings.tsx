import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import {
  AppText,
  CardGroup,
  Chip,
  Disclaimer,
  HeroTitle,
  LabeledRow,
  ListRow,
  Screen,
  SectionTitle,
  SegmentedControl,
  Sheet,
  Stepper,
  Toggle,
} from '../../../components';
import { profileRepo } from '../../../db/repos/profileRepo';
import type { LengthUnit, WeightUnit } from '../../../db/schema';
import { isSameWeightStep, preferredWeightStepKg, weightStepChoices } from '../../../domain/progression';
import { offersLifetimeUpgrade } from '../../../domain/entitlement/paywall';
import { SignedInAsRow } from '../../../features/access/SignedInAsRow';
import { describeSubscription } from '../../../features/access/subscriptionInfo';
import { useAccess } from '../../../features/access/useAccess';
import { useConfirmSignOut } from '../../../features/access/useConfirmSignOut';
import { useManageSubscriptions } from '../../../features/access/useManageSubscriptions';
import { useRestorePurchases } from '../../../features/access/useRestorePurchases';
import { AppearanceGroup } from '../../../features/appearance/AppearancePickers';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { openLegal } from '../../../features/legal/openLegal';
import { shareExport, type ExportKind } from '../../../features/settings/exportCsv';
import { formatDuration } from '../../../i18n/format';
import { useAuth } from '../../../stores/auth';
import { useEntitlement } from '../../../stores/entitlement';
import { spacing } from '../../../theme/tokens';

/** ช่วงและก้าวของตัวจับเวลาพักเริ่มต้น (วินาที) */
const REST_TIMER_MIN_SEC = 15;
const REST_TIMER_MAX_SEC = 600;
const REST_TIMER_STEP_SEC = 15;
const WEIGHT_UNITS: WeightUnit[] = ['kg', 'lb'];
const LENGTH_UNITS: LengthUnit[] = ['cm', 'ftin'];
const EXPORTS: { kind: ExportKind; key: 'settings.exportWorkouts' | 'settings.exportDaily' }[] = [
  { kind: 'workouts', key: 'settings.exportWorkouts' },
  { kind: 'daily', key: 'settings.exportDaily' },
];

/**
 * ตั้งค่า (SPEC K): ภาษา ธีม สีหลัก หน่วย ตัวจับเวลาพัก วันเริ่มต้นสัปดาห์ โปรไฟล์ สถานะสมาชิก/วันสิ้นสุดทดลอง/วันต่ออายุ
 * จัดการสมาชิก Restore ส่งออก CSV ล็อกเอาต์ ลบบัญชี Privacy Terms แหล่งอ้างอิง เวอร์ชัน + คำเตือน H5
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useRepoQuery(() => profileRepo.ensure());
  const user = useAuth((s) => s.user);
  const cached = useEntitlement((s) => s.cached);
  const access = useAccess();
  const openManage = useManageSubscriptions();
  const onRestore = useRestorePurchases();
  const onSignOut = useConfirmSignOut();
  const [exporting, setExporting] = useState(false);
  const sub = describeSubscription(user ? cached : null, t);
  const unit = profile.weightUnit;
  const stepKg = preferredWeightStepKg(unit, profile.weightStepKg);

  const setWeightUnit = (u: WeightUnit) => {
    if (u === unit) return;
    // ก้าวน้ำหนักเดิมอาจไม่ใช่ตัวเลือกของหน่วยใหม่ → ใช้ค่าเริ่มต้นของหน่วยนั้น
    profileRepo.update({ weightUnit: u, weightStepKg: preferredWeightStepKg(u, profile.weightStepKg) });
  };

  const onExport = async (kind: ExportKind) => {
    setExporting(false);
    try {
      const r = await shareExport(kind, t('settings.exportTitle'));
      if (r === 'unavailable') Alert.alert(t('settings.exportUnavailable'));
    } catch {
      Alert.alert(t('common.errorTitle'), t('settings.exportFailed'));
    }
  };

  return (
    <Screen withTabBar testID="settings">
      <HeroTitle title={t('settings.title')} />

      <SectionTitle>{t('settings.sections.appearance')}</SectionTitle>
      <AppearanceGroup showLabels />

      <SectionTitle>{t('settings.sections.workout')}</SectionTitle>
      <CardGroup>
        <LabeledRow label={t('settings.weightUnit')}>
          <SegmentedControl
            label={t('settings.weightUnit')}
            value={unit}
            onChange={setWeightUnit}
            options={WEIGHT_UNITS.map((u) => ({ value: u, label: t(`common.units.${u}`) }))}
          />
        </LabeledRow>
        <LabeledRow label={t('settings.lengthUnit')}>
          <SegmentedControl
            label={t('settings.lengthUnit')}
            value={profile.lengthUnit}
            onChange={(u) => profileRepo.update({ lengthUnit: u })}
            options={LENGTH_UNITS.map((u) => ({ value: u, label: t(`common.units.${u}`) }))}
          />
        </LabeledRow>
        <ListRow
          title={t('settings.restTimer')}
          right={
            <Toggle
              value={profile.restTimerEnabled}
              onValueChange={(v) => profileRepo.update({ restTimerEnabled: v })}
              label={t('settings.restTimerA11y')}
              testID="settings-rest-toggle"
            />
          }
        />
        {profile.restTimerEnabled ? (
          <LabeledRow>
            <Stepper
              label={t('settings.restDefault')}
              value={profile.restTimerSec}
              onChange={(v) => profileRepo.update({ restTimerSec: v })}
              min={REST_TIMER_MIN_SEC}
              max={REST_TIMER_MAX_SEC}
              step={REST_TIMER_STEP_SEC}
              format={formatDuration}
              testID="settings-rest"
            />
          </LabeledRow>
        ) : null}
        <LabeledRow label={t('settings.weekStart')}>
          <SegmentedControl
            label={t('settings.weekStart')}
            value={String(profile.weekStart) as '0' | '1'}
            onChange={(v) => profileRepo.update({ weekStart: Number(v) })}
            options={[
              { value: '1', label: t('week.monday') },
              { value: '0', label: t('week.sunday') },
            ]}
          />
        </LabeledRow>
        <LabeledRow label={t('settings.weightStep')}>
          <View
            style={styles.chips}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.weightStep')}
          >
            {weightStepChoices(unit).map((choice, i) => (
              <Chip
                key={choice.kg}
                label={`${choice.display} ${t(`common.units.${unit}`)}`}
                selected={isSameWeightStep(choice.kg, stepKg)}
                onPress={() => profileRepo.update({ weightStepKg: choice.kg })}
                testID={`settings-step-${i}`}
              />
            ))}
          </View>
          <AppText variant="caption" secondary>
            {t('settings.weightStepHint')}
          </AppText>
        </LabeledRow>
      </CardGroup>

      <SectionTitle>{t('settings.sections.profile')}</SectionTitle>
      <CardGroup>
        <ListRow
          title={t('settings.profile')}
          value={t('settings.profileSub')}
          icon="person-outline"
          onPress={() => router.push('/profile')}
          testID="settings-profile"
        />
      </CardGroup>

      <SectionTitle>{t('settings.sections.membership')}</SectionTitle>
      <CardGroup>
        <ListRow title={sub.status} value={sub.detail} icon="ribbon-outline" testID="settings-membership" />
        {/* รายเดือน/ทดลอง → ซื้อขาดได้จากที่นี่ (SPEC J5) Paywall ปกติพาผู้มีสิทธิ์กลับหน้าแรกเสมอ */}
        {offersLifetimeUpgrade(access.state) ? (
          <ListRow
            title={t('account.getLifetime')}
            icon="infinite-outline"
            onPress={() => router.push({ pathname: '/paywall', params: { upgrade: 'lifetime' } })}
            testID="settings-lifetime"
          />
        ) : null}
        {sub.notice ? (
          <ListRow
            title={sub.notice}
            icon="warning-outline"
            onPress={openManage}
            accessibilityHint={t('account.notice.openStore')}
            testID="settings-monthly-notice"
          />
        ) : null}
        <ListRow
          title={t('account.manage')}
          icon="card-outline"
          onPress={openManage}
          testID="settings-manage"
        />
        <ListRow
          title={t('account.restore')}
          icon="refresh-outline"
          onPress={onRestore}
          testID="settings-restore"
        />
      </CardGroup>

      <SectionTitle>{t('settings.sections.data')}</SectionTitle>
      <CardGroup>
        <ListRow
          title={t('settings.exportCsv')}
          value={t('settings.exportSub')}
          icon="download-outline"
          onPress={() => setExporting(true)}
          testID="settings-export"
        />
      </CardGroup>

      <SectionTitle>{t('settings.sections.account')}</SectionTitle>
      <CardGroup>
        {user ? <SignedInAsRow user={user} /> : null}
        <ListRow
          title={t('account.signOut')}
          icon="log-out-outline"
          onPress={onSignOut}
          testID="settings-signout"
        />
        <ListRow
          title={t('account.deleteAccount')}
          icon="trash-outline"
          danger
          onPress={() => router.push('/delete-account')}
          testID="settings-delete"
        />
      </CardGroup>

      <SectionTitle>{t('settings.sections.about')}</SectionTitle>
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
          testID="settings-references"
        />
        <ListRow
          title={t('account.version')}
          value={Constants.expoConfig?.version ?? '1.0.0'}
          icon="information-circle-outline"
        />
      </CardGroup>
      <Disclaimer />

      <Sheet visible={exporting} onClose={() => setExporting(false)} title={t('settings.exportCsv')}>
        <CardGroup>
          {EXPORTS.map((e) => (
            <ListRow
              key={e.kind}
              title={t(e.key)}
              icon="document-outline"
              onPress={() => void onExport(e.kind)}
              testID={`export-${e.kind}`}
            />
          ))}
        </CardGroup>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
