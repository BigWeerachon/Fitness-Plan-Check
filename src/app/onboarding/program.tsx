import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CardGroup, Icon, ListRow } from '../../components';
import { PROGRAM_TEMPLATES, trainingDaysPerWeek } from '../../data/templates';
import { currentLanguage } from '../../i18n';
import { getAccess } from '../../features/access/useAccess';
import { draftRepo, type QuickStart } from '../../features/onboarding/draft';
import { migrateDraftToAccount } from '../../features/onboarding/migrate';
import { OnboardingFrame } from '../../features/onboarding/OnboardingFrame';
import { useSettings } from '../../stores/settings';
import { usePalette } from '../../theme/useTheme';

/**
 * ขั้น 3: เริ่มโปรแกรมอย่างเร็ว — (ก) เทมเพลต (จัดวันให้อัตโนมัติ) (ข) สร้างเอง (ค) ข้าม แล้วไป Paywall (SPEC C, B4)
 */
export default function OnboardingProgram() {
  const { t } = useTranslation();
  const p = usePalette();
  const lang = currentLanguage();
  const [choice, setChoice] = useState<QuickStart | null>(() => draftRepo.get()?.data.quickStart ?? null);

  const finish = (quickStart: QuickStart) => {
    draftRepo.save({ quickStart });
    useSettings.getState().set('onboardingDone', true);
    // มีสิทธิ์อยู่แล้ว (ล็อกอินบัญชีที่สมัครไว้) → ย้ายข้อมูลเข้าบัญชีทันที
    const access = getAccess();
    if (access.allowed && access.userId) migrateDraftToAccount(access.userId);
    router.replace('/');
  };

  const radio = (selected: boolean) => (
    <Icon
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={22}
      color={selected ? p.accent : p.textSecondary}
    />
  );
  const isTemplate = (key: string) => choice?.kind === 'template' && choice.key === key;

  return (
    <OnboardingFrame
      step={3}
      title={t('onboarding.step3Title')}
      subtitle={t('onboarding.step3Sub')}
      onNext={choice ? () => finish(choice) : undefined}
      nextLabel={t('onboarding.finish')}
      onSkip={() => finish({ kind: 'skip' })}
      skipLabel={t('onboarding.skipProgram')}
      showBack
    >
      <CardGroup>
        {PROGRAM_TEMPLATES.map((tpl) => (
          <ListRow
            key={tpl.key}
            title={tpl.name[lang]}
            value={`${t('onboarding.daysPerWeek', { count: trainingDaysPerWeek(tpl) })} · ${tpl.description[lang]}`}
            onPress={() => setChoice({ kind: 'template', key: tpl.key })}
            right={radio(isTemplate(tpl.key))}
            testID={`template-${tpl.key}`}
          />
        ))}
      </CardGroup>
      <CardGroup>
        <ListRow
          title={t('onboarding.custom')}
          value={t('onboarding.customSub')}
          icon="create-outline"
          onPress={() => setChoice({ kind: 'custom' })}
          right={radio(choice?.kind === 'custom')}
          testID="template-custom"
        />
      </CardGroup>
    </OnboardingFrame>
  );
}
