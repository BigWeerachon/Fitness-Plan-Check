import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import {
  AppText,
  CardGroup,
  Chip,
  Disclaimer,
  HeroTitle,
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
import { WEIGHT_STEP_OPTIONS, preferredWeightStepKg, weightStepOptionsKg } from '../../../domain/progression';
import { manageSubscriptionsUrl, restorePurchases, signOut } from '../../../features/access/accountFlow';
import { describeSubscription } from '../../../features/access/subscriptionInfo';
import { AccentPicker, LanguagePicker, ThemePicker } from '../../../features/appearance/AppearancePickers';
import { useRepoQuery } from '../../../features/data/useRepoQuery';
import { shareExport, type ExportKind } from '../../../features/settings/exportCsv';
import { syncNow } from '../../../features/sync/engine';
import { formatDuration, formatRelativeDay, formatTime } from '../../../i18n/format';
import { useAuth } from '../../../stores/auth';
import { useEntitlement } from '../../../stores/entitlement';
import { useSync } from '../../../stores/sync';
import { spacing } from '../../../theme/tokens';
import { now } from '../../../utils/clock';

const WEIGHT_UNITS: WeightUnit[] = ['kg', 'lb'];
const LENGTH_UNITS: LengthUnit[] = ['cm', 'ftin'];
const EXPORTS: { kind: ExportKind; key: 'settings.exportWorkouts' | 'settings.exportDaily' }[] = [
  { kind: 'workouts', key: 'settings.exportWorkouts' },
  { kind: 'daily', key: 'settings.exportDaily' },
];

/**
 * ตั้งค่า (SPEC K): ภาษา ธีม สีหลัก หน่วย ตัวจับเวลาพัก วันเริ่มต้นสัปดาห์ โปรไฟล์ สถานะสมาชิก/วันสิ้นสุดทดลอง/วันต่ออายุ
 * จัดการสมาชิก Restore ส่งออก CSV สถานะซิงก์ ล็อกเอาต์ ลบบัญชี Privacy Terms แหล่งอ้างอิง เวอร์ชัน + คำเตือน H5
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useRepoQuery(() => profileRepo.ensure());
  const user = useAuth((s) => s.user);
  const cached = useEntitlement((s) => s.cached);
  const sync = useSync();
  const [exporting, setExporting] = useState(false);
  const sub = describeSubscription(user ? cached : null, t);
  const unit = profile.weightUnit;
  const stepKg = preferredWeightStepKg(unit, profile.weightStepKg);

  const setWeightUnit = (u: WeightUnit) => {
    if (u === unit) return;
    // ก้าวน้ำหนักเดิมอาจไม่ใช่ตัวเลือกของหน่วยใหม่ → ใช้ค่าเริ่มต้นของหน่วยนั้น
    profileRepo.update({ weightUnit: u, weightStepKg: preferredWeightStepKg(u, profile.weightStepKg) });
  };

  const onRestore = async () => {
    const r = await restorePurchases();
    if (r === 'needLogin') router.push({ pathname: '/login', params: { then: 'restore' } });
    else if (r === 'restored') Alert.alert(t('paywall.restored'));
    else if (r === 'none') Alert.alert(t('paywall.nothingToRestore'));
    else Alert.alert(t('common.errorTitle'), t('errors.restoreFailed'));
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

  const onSignOut = () =>
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

  const syncDetail = [
    sync.lastSyncedAt
      ? t('sync.lastSynced', {
          when: `${formatRelativeDay(new Date(sync.lastSyncedAt), new Date(now()))} ${formatTime(new Date(sync.lastSyncedAt))}`,
        })
      : t('sync.never'),
    sync.pending > 0 ? t('sync.pending', { count: sync.pending }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen withTabBar testID="settings">
      <HeroTitle title={t('settings.title')} />

      <SectionTitle>{t('settings.sections.appearance')}</SectionTitle>
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

      <SectionTitle>{t('settings.sections.workout')}</SectionTitle>
      <CardGroup>
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('settings.weightUnit')}
          </AppText>
          <SegmentedControl
            label={t('settings.weightUnit')}
            value={unit}
            onChange={setWeightUnit}
            options={WEIGHT_UNITS.map((u) => ({ value: u, label: t(`common.units.${u}`) }))}
          />
        </View>
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('settings.lengthUnit')}
          </AppText>
          <SegmentedControl
            label={t('settings.lengthUnit')}
            value={profile.lengthUnit}
            onChange={(u) => profileRepo.update({ lengthUnit: u })}
            options={LENGTH_UNITS.map((u) => ({ value: u, label: t(`common.units.${u}`) }))}
          />
        </View>
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
          <View style={styles.pad}>
            <Stepper
              label={t('settings.restDefault')}
              value={profile.restTimerSec}
              onChange={(v) => profileRepo.update({ restTimerSec: v })}
              min={15}
              max={600}
              step={15}
              format={formatDuration}
              testID="settings-rest"
            />
          </View>
        ) : null}
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('settings.weekStart')}
          </AppText>
          <SegmentedControl
            label={t('settings.weekStart')}
            value={String(profile.weekStart) as '0' | '1'}
            onChange={(v) => profileRepo.update({ weekStart: Number(v) })}
            options={[
              { value: '1', label: t('week.monday') },
              { value: '0', label: t('week.sunday') },
            ]}
          />
        </View>
        <View style={styles.pad}>
          <AppText variant="caption" secondary>
            {t('settings.weightStep')}
          </AppText>
          <View
            style={styles.chips}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.weightStep')}
          >
            {weightStepOptionsKg(unit).map((kg, i) => (
              <Chip
                key={kg}
                label={`${WEIGHT_STEP_OPTIONS[unit][i]} ${t(`common.units.${unit}`)}`}
                selected={Math.abs(kg - stepKg) < 0.01}
                onPress={() => profileRepo.update({ weightStepKg: kg })}
                testID={`settings-step-${i}`}
              />
            ))}
          </View>
          <AppText variant="caption" secondary>
            {t('settings.weightStepHint')}
          </AppText>
        </View>
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
        <ListRow
          title={t('account.manage')}
          icon="card-outline"
          onPress={async () => Linking.openURL(await manageSubscriptionsUrl())}
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
        <ListRow
          title={t(`sync.status.${sync.status}`)}
          value={syncDetail}
          icon={
            sync.status === 'error' || sync.status === 'offline'
              ? 'cloud-offline-outline'
              : 'cloud-done-outline'
          }
          testID="settings-sync"
        />
        {sync.status !== 'disabled' ? (
          <ListRow
            title={t('sync.syncNow')}
            icon="sync-outline"
            onPress={() => void syncNow()}
            disabled={sync.status === 'syncing'}
            testID="settings-sync-now"
          />
        ) : null}
      </CardGroup>

      <SectionTitle>{t('settings.sections.account')}</SectionTitle>
      <CardGroup>
        {user ? (
          <ListRow
            title={t('account.signedInAs')}
            value={user.isPrivateRelay ? `${user.email ?? ''} · ${t('auth.privateRelay')}` : user.email}
            icon={user.provider === 'apple' ? 'logo-apple' : 'logo-google'}
          />
        ) : null}
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
  pad: { padding: spacing.lg, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
