import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { GlowBackground } from './GlowBackground';
import { IconButton } from './IconButton';
import { TAB_BAR_SPACE } from './PillTabBar';

/**
 * โครงหน้าจอมาตรฐาน: พื้นดำ + แสงเรืองสีหลัก + safe area + เลื่อนได้
 * withTabBar = เว้นที่ด้านล่างให้แถบแคปซูลลอย
 */
export function Screen({
  children,
  scroll = true,
  withTabBar,
  header,
  contentStyle,
  keyboardShouldPersistTaps = 'handled',
  refreshControl,
  testID,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  withTabBar?: boolean;
  header?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  refreshControl?: ScrollViewProps['refreshControl'];
  testID?: string;
}) {
  const p = usePalette();
  const bottom = withTabBar ? TAB_BAR_SPACE : spacing.xxl;
  return (
    <View style={[styles.root, { backgroundColor: p.background }]} testID={testID}>
      <GlowBackground />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        {header}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.root, { paddingBottom: withTabBar ? TAB_BAR_SPACE : 0 }, contentStyle]}>
            {children}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

/** หัวของหน้าที่ซ้อนเข้ามา (stack): ปุ่มย้อนกลับ + ชื่อหน้าสีหลัก + ปุ่มด้านขวา */
export function StackHeader({
  title,
  right,
  onBack,
  backIcon = 'chevron-back',
}: {
  title?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  backIcon?: 'chevron-back' | 'close';
}) {
  const { t } = useTranslation();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.header}>
      <IconButton
        icon={backIcon}
        label={backIcon === 'close' ? t('a11y.close') : t('a11y.back')}
        onPress={goBack}
        testID="header-back"
      />
      <View style={styles.headerTitle}>
        {title ? (
          <AppText variant="headline" accent numberOfLines={1} align="center" accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, minHeight: 52 },
  headerTitle: { flex: 1, paddingHorizontal: spacing.sm },
  headerRight: { minWidth: 48, flexDirection: 'row', justifyContent: 'flex-end' },
});
