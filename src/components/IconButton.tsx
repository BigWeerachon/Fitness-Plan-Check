import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

/** ปุ่มไอคอนเส้นบางสีหลักอ่อน (เช่น "+" และจุดสามจุดมุมขวาเหนือรายการ) พื้นที่แตะ ≥ 48 */
export function IconButton({
  icon,
  label,
  onPress,
  size = 26,
  color,
  disabled,
  style,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [styles.btn, { opacity: disabled ? 0.35 : pressed ? 0.55 : 1 }, style]}
    >
      <Icon name={icon} size={size} color={color ?? p.accent} />
    </Pressable>
  );
}

/** แถวปุ่ม "+" และ "⋯" ชิดขวาเหนือการ์ดรายการ ตามภาพอ้างอิง */
export function ActionBar({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.bar, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
});
