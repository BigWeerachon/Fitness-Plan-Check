import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** ปุ่ม − ค่า + สำหรับตัวเลขเล็กๆ (จำนวนเซ็ต ช่วงครั้ง) รองรับ VoiceOver/TalkBack แบบ adjustable */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format,
  testID,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  testID?: string;
}) {
  const p = usePalette();
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));
  const text = format ? format(value) : String(value);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? inc() : dec())}
      testID={testID}
    >
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        onPress={dec}
        disabled={value <= min}
        style={[styles.btn, { backgroundColor: p.inputBg }]}
        testID={testID ? `${testID}-dec` : undefined}
      >
        <Icon name="remove" size={20} color={value <= min ? p.textSecondary : p.accent} />
      </Pressable>
      <AppText variant="tabular" style={styles.value}>
        {text}
      </AppText>
      <Pressable
        onPress={inc}
        disabled={value >= max}
        style={[styles.btn, { backgroundColor: p.inputBg }]}
        testID={testID ? `${testID}-inc` : undefined}
      >
        <Icon name="add" size={20} color={value >= max ? p.textSecondary : p.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH },
  label: { flex: 1 },
  btn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 56, textAlign: 'center' },
});
