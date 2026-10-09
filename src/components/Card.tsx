import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/**
 * การ์ดเทาเข้มมุมโค้งมาก (~28) ที่รวมหลายแถวไว้ในกรอบเดียว คั่นด้วยเส้นบาง (SPEC DS, ภาพอ้างอิง)
 */
export function CardGroup({
  children,
  style,
  inset = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** เส้นคั่นเยื้องจากขอบซ้ายขวาเหมือนภาพอ้างอิง */
  inset?: boolean;
}) {
  const p = usePalette();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { backgroundColor: p.card }, style]}>
      {rows.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <View
              style={[styles.separator, inset && styles.separatorInset, { backgroundColor: p.separator }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

/** การ์ดเดี่ยว (ใช้กับเนื้อหาที่ไม่ใช่รายการ เช่น กราฟ) */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[styles.group, styles.cardPad, { backgroundColor: p.card }, style]}>{children}</View>;
}

/** แถวมาตรฐานของรายการตั้งค่า/ลิงก์ */
export function ListRow({
  title,
  value,
  onPress,
  icon,
  right,
  danger,
  disabled,
  accessibilityHint,
  testID,
}: {
  title: string;
  value?: string | null;
  onPress?: () => void;
  icon?: IconName;
  right?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  const p = usePalette();
  const content = (
    <View style={[styles.row, disabled && { opacity: 0.45 }]}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Icon name={icon} size={20} color={danger ? p.danger : p.accent} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <AppText color={danger ? p.danger : undefined}>{title}</AppText>
        {value ? (
          <AppText variant="caption" secondary>
            {value}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={p.textSecondary} /> : null)}
    </View>
  );
  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => ({ backgroundColor: pressed ? p.cardPressed : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}

/**
 * แถวใหญ่สไตล์ภาพอ้างอิง: ข้อความใหญ่ตัวบางสีขาวชิดซ้าย + เนื้อหาใต้ข้อความ (เช่น แถวจุดวัน) + ตัวควบคุมชิดขวา
 */
export function BigRow({
  title,
  below,
  right,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  dimmed,
  testID,
}: {
  title: string;
  below?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  dimmed?: boolean;
  testID?: string;
}) {
  const p = usePalette();
  const body = (
    <View style={styles.bigRow}>
      <View style={styles.rowText}>
        <AppText
          variant="rowTitle"
          numberOfLines={2}
          maxFontSizeMultiplier={1.4}
          color={dimmed ? p.textSecondary : p.text}
        >
          {title}
        </AppText>
        {below ? <View style={styles.below}>{below}</View> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => ({ backgroundColor: pressed ? p.cardPressed : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionTitle, style]}>
      <AppText variant="caption" secondary accessibilityRole="header">
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.card, overflow: 'hidden' },
  cardPad: { padding: spacing.lg + 4 },
  separator: { height: StyleSheet.hairlineWidth },
  separatorInset: { marginHorizontal: spacing.xl + 4 },
  row: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { width: 28, marginRight: spacing.md, alignItems: 'center' },
  rowText: { flex: 1 },
  bigRow: {
    minHeight: MIN_TOUCH + 56,
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  below: { marginTop: spacing.xs },
  right: { marginLeft: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, marginHorizontal: spacing.xl },
});
