import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';

/** แผ่นล่าง (bottom sheet) แบบเรียบง่ายด้วย Modal ของระบบ ปิดด้วยการแตะพื้นหลังหรือปุ่ม back ของ Android */
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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} testID={testID}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }]}
          onPress={onClose}
          accessible={false}
        />
        <View style={[styles.sheet, { backgroundColor: p.card, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={[styles.handle, { backgroundColor: p.separator }]} />
          {title ? (
            <AppText variant="title" align="center" style={styles.title} accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
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
  title: { marginTop: spacing.md, marginHorizontal: spacing.xl },
  content: { padding: spacing.xl, gap: spacing.md },
});
