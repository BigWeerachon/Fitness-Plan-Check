import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  CardGroup,
  Disclaimer,
  HeroTitle,
  ListRow,
  NumberPad,
  Screen,
  SectionTitle,
  StackHeader,
  Stepper,
} from '../../components';
import { dailyLogRepo } from '../../db/repos/dailyLogRepo';
import { profileRepo } from '../../db/repos/profileRepo';
import type { Intensity } from '../../db/schema';
import { toLocalDate } from '../../domain/dates';
import {
  ACTIVITY_MULTIPLIERS,
  DEFICIT_PCT,
  PROTEIN_PER_KG_DEFAULT,
  PROTEIN_PER_KG_RANGE,
  SURPLUS_PCT,
  nutritionSummary,
} from '../../domain/nutrition';
import { formFromValues, parseProfileForm, type ProfileForm } from '../../domain/profileInput';
import { useRepoQuery } from '../../features/data/useRepoQuery';
import { ProfileFormView } from '../../features/profile/ProfileFormView';
import { logBodyWeight } from '../../features/stats/bodyWeight';
import { formatNumber } from '../../i18n/format';
import { spacing } from '../../theme/tokens';
import { now } from '../../utils/clock';

const INTENSITIES: Intensity[] = ['light', 'moderate', 'hard'];
const MACRO_KEYS = [
  ['protein', 'proteinG'],
  ['carbs', 'carbsG'],
  ['fat', 'fatG'],
] as const;
const MET_FIELD = { light: 'metLight', moderate: 'metModerate', hard: 'metHard' } as const;
const FAT_PCT = { min: 15, max: 40 } as const;
const MET_RANGE = { min: 1, max: 15 } as const;

/**
 * โปรไฟล์และเป้าหมาย (SPEC H1–H6): ข้อมูลร่างกาย (สลับหน่วยได้), BMR/TDEE/แคลอรี่เป้าหมาย/สารอาหาร พร้อมที่มาของสูตร,
 * ปรับ % ลด/เพิ่ม โปรตีน ไขมัน และค่า MET, ช่องแคลอรี่ที่กินวันนี้ (ตัวเลขเดียว H4), คำเตือน H5 และลิงก์แหล่งอ้างอิง H6
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const profile = useRepoQuery(() => profileRepo.ensure());
  const today = toLocalDate(now());
  const intake = useRepoQuery(() => dailyLogRepo.get(today)?.kcalIntake ?? null, today);
  const [form, setForm] = useState<ProfileForm>(() => formFromValues(profile));
  const [saved, setSaved] = useState(false);
  const [enteringIntake, setEnteringIntake] = useState(false);
  const { values, errors } = parseProfileForm(form);
  const hasErrors = Object.keys(errors).length > 0;
  // แสดงผลลัพธ์ตามค่าที่กำลังแก้ทันที (ยังไม่บันทึกก็เห็น) ถ้าค่าที่กรอกถูกต้อง
  const preview = hasErrors ? profile : { ...profile, ...values };
  const summary = nutritionSummary(preview);
  const kcal = (n: number) => `${formatNumber(n)} ${t('common.units.kcal')}`;
  const grams = (n: number) => t('nutrition.grams', { value: formatNumber(n) });

  const update = (next: ProfileForm) => {
    setForm(next);
    setSaved(false);
  };

  const save = () => {
    if (hasErrors) return;
    const { weightKg, ...rest } = values;
    profileRepo.update(weightKg === profile.weightKg || weightKg === null ? values : rest);
    // น้ำหนักเปลี่ยน → บันทึกเป็นจุดแนวโน้มของวันนี้ด้วย (I4, DECISIONS D23)
    if (weightKg !== null && weightKg !== profile.weightKg) logBodyWeight(weightKg);
    setSaved(true);
  };

  const goal = summary?.target.goal ?? preview.goal;
  const proteinDefault = goal ? PROTEIN_PER_KG_DEFAULT[goal] : PROTEIN_PER_KG_DEFAULT.maintain;

  return (
    <Screen header={<StackHeader title={t('settings.title')} />} testID="profile">
      <HeroTitle title={t('nutrition.title')} compact />

      <SectionTitle>{t('nutrition.aboutYou')}</SectionTitle>
      <Card>
        <ProfileFormView form={form} errors={errors} onChange={update} />
        <Button
          title={saved ? t('nutrition.saved') : t('common.save')}
          icon={saved ? 'checkmark' : undefined}
          onPress={save}
          disabled={hasErrors || saved}
          style={styles.gapTop}
          testID="profile-save"
        />
      </Card>

      <SectionTitle>{t('nutrition.results')}</SectionTitle>
      {!summary ? (
        <Card>
          <AppText secondary testID="profile-incomplete">
            {t('nutrition.incomplete')}
          </AppText>
        </Card>
      ) : (
        <>
          <CardGroup>
            <ListRow
              title={t('nutrition.bmr')}
              value={`${kcal(summary.bmr)} · ${t('nutrition.bmrHint')}`}
              testID="profile-bmr"
            />
            <ListRow
              title={t('nutrition.tdee')}
              value={`${kcal(summary.tdee)} · ${t('nutrition.tdeeHint', {
                factor: preview.activityLevel ? ACTIVITY_MULTIPLIERS[preview.activityLevel] : '',
              })}`}
              testID="profile-tdee"
            />
            <ListRow
              title={t('nutrition.target')}
              value={`${kcal(summary.target.kcal)} · ${
                summary.target.goal === 'lose'
                  ? t('nutrition.targetLose', { pct: summary.target.adjustPct })
                  : summary.target.goal === 'gain'
                    ? t('nutrition.targetGain', { pct: summary.target.adjustPct })
                    : t('nutrition.targetMaintain')
              }`}
              testID="profile-target"
            />
          </CardGroup>
          {summary.target.minorNoDeficit ? (
            <AppText variant="caption" secondary style={styles.note} testID="profile-minor">
              {t('nutrition.minorNoDeficit')}
            </AppText>
          ) : null}
          {summary.target.floorApplied ? (
            <AppText variant="caption" secondary style={styles.note} testID="profile-floor">
              {t('nutrition.floorApplied', { kcal: formatNumber(summary.target.kcal) })}
            </AppText>
          ) : null}

          <SectionTitle>{t('nutrition.macros')}</SectionTitle>
          <View style={styles.grid}>
            {MACRO_KEYS.map(([key, field]) => (
              <Card key={key} style={styles.stat}>
                <AppText variant="caption" secondary>
                  {t(`nutrition.${key}`)}
                </AppText>
                <AppText variant="headline" testID={`macro-${key}`}>
                  {grams(summary.macros[field])}
                </AppText>
              </Card>
            ))}
          </View>
          {summary.macros.clamped ? (
            <AppText variant="caption" secondary style={styles.note}>
              {t('nutrition.macroClamped')}
            </AppText>
          ) : null}
        </>
      )}

      <SectionTitle>{t('nutrition.adjust')}</SectionTitle>
      <CardGroup>
        {preview.goal === 'lose' && !summary?.target.minorNoDeficit ? (
          <View style={styles.pad}>
            <Stepper
              label={t('nutrition.deficit')}
              value={profile.deficitPct}
              onChange={(v) => profileRepo.update({ deficitPct: v })}
              min={DEFICIT_PCT.min}
              max={DEFICIT_PCT.max}
              format={(v) => t('nutrition.percent', { value: v })}
              testID="profile-deficit"
            />
          </View>
        ) : null}
        {preview.goal === 'gain' ? (
          <View style={styles.pad}>
            <Stepper
              label={t('nutrition.surplus')}
              value={profile.surplusPct}
              onChange={(v) => profileRepo.update({ surplusPct: v })}
              min={SURPLUS_PCT.min}
              max={SURPLUS_PCT.max}
              format={(v) => t('nutrition.percent', { value: v })}
              testID="profile-surplus"
            />
          </View>
        ) : null}
        <View style={styles.pad}>
          <Stepper
            label={t('nutrition.proteinPerKg')}
            value={profile.proteinPerKg ?? proteinDefault}
            onChange={(v) => profileRepo.update({ proteinPerKg: v })}
            min={PROTEIN_PER_KG_RANGE.min}
            max={PROTEIN_PER_KG_RANGE.max}
            step={0.1}
            format={(v) => t('nutrition.gPerKg', { value: formatNumber(v, 1) })}
            testID="profile-protein"
          />
          {profile.proteinPerKg != null ? (
            <Button
              title={t('nutrition.proteinAuto', { value: formatNumber(proteinDefault, 1) })}
              kind="plain"
              onPress={() => profileRepo.update({ proteinPerKg: null })}
              testID="profile-protein-auto"
            />
          ) : null}
        </View>
        <View style={styles.pad}>
          <Stepper
            label={t('nutrition.fatPct')}
            value={profile.fatPct}
            onChange={(v) => profileRepo.update({ fatPct: v })}
            min={FAT_PCT.min}
            max={FAT_PCT.max}
            format={(v) => t('nutrition.percent', { value: v })}
            testID="profile-fat"
          />
        </View>
      </CardGroup>

      <SectionTitle>{t('nutrition.mets')}</SectionTitle>
      <AppText variant="caption" secondary style={styles.note}>
        {t('nutrition.metsHint')}
      </AppText>
      <CardGroup>
        {INTENSITIES.map((i) => (
          <View key={i} style={styles.pad}>
            <Stepper
              label={t(`nutrition.met.${i}`)}
              value={profile[MET_FIELD[i]]}
              onChange={(v) => profileRepo.update({ [MET_FIELD[i]]: v })}
              min={MET_RANGE.min}
              max={MET_RANGE.max}
              step={0.5}
              format={(v) => t('nutrition.metValue', { value: formatNumber(v, 1) })}
              testID={`profile-met-${i}`}
            />
          </View>
        ))}
      </CardGroup>

      <SectionTitle>{t('nutrition.intakeToday')}</SectionTitle>
      <CardGroup>
        <ListRow
          title={t('nutrition.intakeToday')}
          value={intake != null ? kcal(intake) : t('nutrition.notEntered')}
          icon="restaurant-outline"
          onPress={() => setEnteringIntake(true)}
          testID="profile-intake"
        />
        <ListRow
          title={t('nutrition.references')}
          icon="library-outline"
          onPress={() => router.push('/references')}
          testID="profile-references"
        />
      </CardGroup>
      <Disclaimer />

      <NumberPad
        visible={enteringIntake}
        title={t('nutrition.intakeTitle')}
        initial={intake}
        allowDecimal={false}
        suffix={t('common.units.kcal')}
        max={20000}
        onClose={() => setEnteringIntake(false)}
        onSubmit={(value) => {
          dailyLogRepo.upsert(today, { kcalIntake: value });
          setEnteringIntake(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gapTop: { marginTop: spacing.lg },
  note: { marginHorizontal: spacing.xl, marginVertical: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  pad: { padding: spacing.lg },
});
