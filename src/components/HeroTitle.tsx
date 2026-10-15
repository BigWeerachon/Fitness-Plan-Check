import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BIG_TEXT_MAX_SCALE } from '../theme/typography';
import { spacing } from '../theme/tokens';
import { AppText } from './AppText';

/**
 * ส่วนหัวหน้าจอตามภาพอ้างอิง: ข้อความหลักใหญ่กลางจอสีหลักอ่อน + บรรทัดย่อยสีเทา
 * เช่น "วันนี้: Push Day" / "พฤ. 9 ต.ค. · 6 ท่า · ~55 นาที"
 */
export function HeroTitle({
  title,
  subtitle,
  children,
  compact,
}: {
  title: string;
  subtitle?: string | null;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <AppText
        variant="hero"
        accent
        align="center"
        accessibilityRole="header"
        maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE}
        style={compact ? styles.compactTitle : undefined}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="heroSub" secondary align="center" style={styles.sub}>
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.xxxl + spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  compact: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  compactTitle: { fontSize: 26, lineHeight: 38 },
  sub: { marginTop: spacing.xs },
});
