import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, HeroTitle, Icon, Screen, StackHeader } from '../components';
import { useManageSubscriptions } from '../features/access/useManageSubscriptions';
import { deleteAllLocalData } from '../features/data/deleteAllData';
import { MIN_TOUCH, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { confirmDestructive } from '../utils/confirmDestructive';

/**
 * ลบข้อมูลทั้งหมดในเครื่องนี้ (แทน "ลบบัญชี" D81, SPEC B12): แจ้งก่อนว่าไม่ยกเลิกการสมัครในสโตร์ + ปุ่มลัดไปหน้ายกเลิก
 * ยืนยัน 2 ขั้น (ติ๊กยอมรับ + กล่องยืนยัน) — เข้าถึงได้เสมอแม้ไม่มีสิทธิ์ (B3)
 */
export default function DeleteDataScreen() {
  const { t } = useTranslation();
  const p = usePalette();
  const openManage = useManageSubscriptions();
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await deleteAllLocalData();
      Alert.alert(t('account.delete.done'));
      // เริ่มใหม่ตั้งแต่ตั้งค่าเริ่มต้น (AccessGate พาไปขั้นที่เหมาะสมเอง)
      router.replace('/');
    } catch {
      Alert.alert(t('common.errorTitle'), t('account.delete.failed'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    confirmDestructive(t, {
      title: t('account.delete.confirmTitle'),
      message: t('account.delete.confirmBody'),
      confirmLabel: t('account.delete.confirm'),
      onConfirm: () => void run(),
    });
  };

  return (
    <Screen header={<StackHeader backIcon="close" />} testID="delete-data">
      <HeroTitle title={t('account.delete.heading')} compact />
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
            onPress={() => void openManage()}
            testID="delete-manage"
          />
        </Card>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  check: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', minHeight: MIN_TOUCH },
});
