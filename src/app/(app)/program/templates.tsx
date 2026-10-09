import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, HeroTitle, Screen, StackHeader } from '../../../components';
import { PROGRAM_TEMPLATES, trainingDaysPerWeek } from '../../../data/templates';
import { exerciseInfo } from '../../../features/exercises/resolve';
import { instantiateTemplate } from '../../../features/programs/instantiate';
import { currentLanguage } from '../../../i18n';
import { weekdayMedium } from '../../../i18n/format';
import { exerciseName } from '../../../data/exerciseLibrary';
import { spacing } from '../../../theme/tokens';

/** เทมเพลตโปรแกรม (SPEC F4) — เลือกแล้วสร้างกรุ๊ป + routine + ตารางสัปดาห์ แก้ไขได้ทั้งหมด */
export default function TemplatesScreen() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  return (
    <Screen header={<StackHeader title={t('programs.templatesTitle')} />} testID="templates">
      <HeroTitle title={t('programs.templatesTitle')} subtitle={t('onboarding.step3Sub')} compact />
      <View style={styles.list}>
        {PROGRAM_TEMPLATES.map((tpl) => (
          <Card key={tpl.key}>
            <AppText variant="title">{tpl.name[lang]}</AppText>
            <AppText secondary>{tpl.description[lang]}</AppText>
            <AppText variant="caption" accent style={styles.days}>
              {t('programs.templateDays', { count: trainingDaysPerWeek(tpl) })}
            </AppText>
            {tpl.routines.map((r) => (
              <View key={r.key} style={styles.routine}>
                <AppText variant="headline">
                  {r.name[lang]} · {r.days.map((d) => weekdayMedium(d)).join(' ')}
                </AppText>
                <AppText variant="caption" secondary>
                  {r.exercises.map((e) => exerciseName(exerciseInfo(e.exerciseId)!, lang)).join(', ')}
                </AppText>
              </View>
            ))}
            <Button
              title={t('programs.useTemplate')}
              onPress={() => {
                const program = instantiateTemplate(tpl.key, lang);
                if (!program) return;
                Alert.alert(t('programs.templateUsed'));
                router.replace({ pathname: '/program/[id]', params: { id: program.id } });
              }}
              testID={`use-template-${tpl.key}`}
              style={styles.button}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  days: { marginTop: spacing.xs },
  routine: { marginTop: spacing.sm },
  button: { marginTop: spacing.md },
});
