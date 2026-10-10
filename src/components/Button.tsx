import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonKind = 'primary' | 'secondary' | 'plain' | 'danger';

/** ปุ่มแคปซูล สูง ≥ 52 (ปุ่มสำคัญไม่เล็กกว่า 48 SPEC A2) สีตัวอักษรบนสีหลักปรับ contrast อัตโนมัติ */
export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  icon,
  style,
  accessibilityHint,
  testID,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}) {
  const p = usePalette();
  const bg = kind === 'primary' ? p.accentFill : kind === 'secondary' ? p.card : 'transparent';
  const fg =
    kind === 'primary' ? p.onAccent : kind === 'danger' ? p.danger : kind === 'plain' ? p.accent : p.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        kind === 'secondary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: p.separator },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <AppText variant="button" color={fg} align="center">
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** ปุ่มวงกลมสีหลัก เช่น "เริ่ม" บนการ์ด routine ของวันนี้ (SPEC DS/D) */
export function CircleButton({
  label,
  onPress,
  icon = 'play',
  size = 64,
  text,
  testID,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  size?: number;
  /** ข้อความสั้นใต้ไอคอน (เช่น "เริ่ม") */
  text?: string;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: p.accentFill,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Icon name={icon} size={text ? 20 : 26} color={p.onAccent} />
      {text ? (
        <AppText variant="caption" color={p.onAccent} maxFontSizeMultiplier={1.2}>
          {text}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    minWidth: MIN_TOUCH,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  circle: { alignItems: 'center', justifyContent: 'center' },
});
