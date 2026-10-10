import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, HeroTitle, Screen, StackHeader } from '../../components';
import { LEGAL, type LegalKey } from '../../legal/content';
import { env } from '../../services/config';
import { spacing } from '../../theme/tokens';

/** Privacy Policy / Terms (SPEC N4) — เข้าถึงได้เสมอ (B3) */
export default function LegalScreen() {
  const { t, i18n } = useTranslation();
  const { doc } = useLocalSearchParams<{ doc: LegalKey }>();
  const key: LegalKey = doc === 'terms' ? 'terms' : 'privacy';
  const content = LEGAL[key][i18n.language === 'th' ? 'th' : 'en'];
  const webUrl = key === 'terms' ? env.termsUrl : env.privacyUrl;
  return (
    <Screen header={<StackHeader />}>
      <HeroTitle title={content.title} subtitle={content.updated} compact />
      <AppText variant="caption" secondary align="center" style={styles.notice}>
        {t('legal.templateNotice')}
      </AppText>
      <View style={styles.sections}>
        {content.sections.map((s) => (
          <Card key={s.heading}>
            <AppText variant="headline" accessibilityRole="header">
              {s.heading}
            </AppText>
            <AppText style={styles.body}>{s.body}</AppText>
          </Card>
        ))}
      </View>
      {webUrl ? (
        <Button title={t('legal.openWeb')} kind="plain" onPress={() => Linking.openURL(webUrl)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: spacing.md },
  sections: { gap: spacing.md },
  body: { marginTop: spacing.xs },
});
