import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, HeroTitle, Icon, Screen, StackHeader } from '../components';
import { deleteAccount, manageSubscriptionsUrl } from '../features/access/accountFlow';
import { useAuth } from '../stores/auth';
import { spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';

/**
 * ลบบัญชีและข้อมูลทั้งหมด (SPEC B12): แจ้งก่อนว่าไม่ยกเลิกการสมัครในสโตร์ + ปุ่มลัดไปหน้ายกเลิก
 * ยืนยัน 2 ขั้น (ติ๊กยอมรับ + กล่องยืนยัน) และเพิกถอนโทเค็น Apple ฝั่งเซิร์ฟเวอร์
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const user = useAuth((s) => s.user);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      Alert.alert(t('account.delete.done'));
      router.replace('/paywall');
    } catch {
      Alert.alert(t('common.errorTitle'), t('account.delete.failed'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    Alert.alert(t('account.delete.confirmTitle'), t('account.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.delete.confirm'), style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <Screen header={<StackHeader backIcon="close" />} testID="delete-account">
      <HeroTitle title={t('account.delete.heading')} compact />
      {!user ? (
        <View style={styles.gap}>
          <AppText secondary align="center">
            {t('account.delete.needSignIn')}
          </AppText>
          <Button title={t('account.signIn')} onPress={() => router.push('/login')} />
        </View>
      ) : (
        <View style={styles.gap}>
          <Card>
            <AppText>{t('account.delete.body')}</AppText>
          </Card>
          <Card>
            <View style={styles.row}>
              <Icon name="warning-outline" size={20} color={p.warning} />
              <AppText style={styles.flex} testID="delete-subscription-warning">
                {t('account.delete.subscriptionWarning')}
              </AppText>
            </View>
            <Button
              title={t('account.delete.manage')}
              kind="plain"
              icon="open-outline"
              onPress={async () => Linking.openURL(await manageSubscriptionsUrl())}
            />
          </Card>
          {user.provider === 'apple' ? (
            <AppText variant="caption" secondary align="center">
              {t('account.delete.appleReauth')}
            </AppText>
          ) : null}
          <Pressable
            onPress={() => setUnderstood((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: understood }}
            accessibilityLabel={t('account.delete.confirmCheck')}
            testID="delete-understood"
            style={styles.check}
          >
            <Icon
              name={understood ? 'checkbox' : 'square-outline'}
              size={24}
              color={understood ? p.danger : p.textSecondary}
            />
            <AppText style={styles.flex}>{t('account.delete.confirmCheck')}</AppText>
          </Pressable>
          <Button
            title={busy ? t('account.delete.working') : t('account.delete.confirm')}
            kind="danger"
            onPress={confirm}
            disabled={!understood}
            loading={busy}
            testID="delete-confirm"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  check: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', minHeight: 48 },
});
