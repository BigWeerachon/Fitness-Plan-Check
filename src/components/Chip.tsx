import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';

export function Chip({
  label,
  selected,
  onPress,
  role = 'radio',
  accessibilityLabel,
  style,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: 'radio' | 'checkbox';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? p.accentSoft : p.card,
          borderColor: selected ? p.accent : p.separator,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <AppText variant="callout" color={selected ? p.accent : p.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** ตัวสลับแบบแคปซูล (เช่น วัน/สัปดาห์/เดือน/ปี ในหน้าสถิติ) */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View
      style={[styles.segment, { backgroundColor: p.card, borderColor: p.separator }, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            testID={`segment-${o.value}`}
            style={[styles.segmentItem, selected && { backgroundColor: p.accentSoft }]}
          >
            <AppText variant="callout" color={selected ? p.accent : p.textSecondary} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({
  label,
  tone = 'accent',
}: {
  label: string;
  tone?: 'accent' | 'neutral' | 'warning';
}) {
  const p = usePalette();
  const color = tone === 'accent' ? p.accent : tone === 'warning' ? p.warning : p.textSecondary;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    flex: 1,
    minHeight: MIN_TOUCH - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
});
