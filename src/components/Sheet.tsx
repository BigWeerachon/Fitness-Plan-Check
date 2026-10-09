import React from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

/**
 * แผ่นล่าง (bottom sheet) แบบเรียบง่ายด้วย Modal ของระบบ
 * ปิดได้ด้วย: แตะพื้นหลัง, ปุ่มปิด (ผู้ใช้โปรแกรมอ่านหน้าจอ), ท่าทาง escape ของ VoiceOver, ปุ่ม back ของ Android
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  const p = usePalette();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} testID={testID}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }]}
          onPress={onClose}
          accessible={false}
        />
        <View
          style={[styles.sheet, { backgroundColor: p.card, paddingBottom: insets.bottom + spacing.lg }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={[styles.handle, { backgroundColor: p.separator }]} />
          <View style={styles.header}>
            <View style={styles.side} />
            <AppText variant="title" align="center" style={styles.title} accessibilityRole="header">
              {title ?? ''}
            </AppText>
            <View style={styles.side}>
              <IconButton
                icon="close"
                size={22}
                label={t('a11y.close')}
                onPress={onClose}
                testID="sheet-close"
              />
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: '88%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  side: { width: 48, alignItems: 'center' },
  title: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md },
});
