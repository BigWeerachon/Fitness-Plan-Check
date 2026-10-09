import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Disclaimer, HeroTitle, Screen, StackHeader } from '../components';
import { REFERENCES } from '../legal/content';
import { spacing } from '../theme/tokens';

/** แหล่งอ้างอิงของสูตรคำนวณ พร้อมลิงก์ (SPEC H6 — บังคับ สโตร์ตรวจ, N1 Guideline 1.4.1) */
export default function ReferencesScreen() {
  const { t } = useTranslation();
  return (
    <Screen header={<StackHeader />} testID="references">
      <HeroTitle title={t('legal.referencesTitle')} subtitle={t('legal.referencesIntro')} compact />
      <View style={styles.list}>
        {REFERENCES.map((r) => (
          <Card key={r.id}>
            <AppText variant="caption" accent>
              {t(`legal.usedFor.${r.usedFor}`)}
            </AppText>
            <AppText style={styles.citation}>{r.citation}</AppText>
            <Button
              title={t('legal.openLink')}
              kind="plain"
              icon="open-outline"
              onPress={() => Linking.openURL(r.url)}
            />
          </Card>
        ))}
      </View>
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  citation: { marginTop: spacing.xs },
});
