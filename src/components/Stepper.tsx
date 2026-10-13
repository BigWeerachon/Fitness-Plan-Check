import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '../theme/tokens';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/**
 * ปุ่ม −/+ ด้านในซ่อนจากโปรแกรมอ่านหน้าจอ: แถวหลักมี action เพิ่ม/ลดอยู่แล้ว
 * (ไม่งั้น TalkBack โฟกัสปุ่มไอคอนที่ไม่มีชื่อได้)
 */
const HIDDEN_FROM_READERS = {
  importantForAccessibility: 'no-hide-descendants',
  accessibilityElementsHidden: true,
} as const;

/** ปัดเศษทศนิยม 2 ตำแหน่งกันค่าคลาดเคลื่อนของ float เมื่อ step เป็นทศนิยม */
const roundToHundredths = (v: number) => Math.round(v * 100) / 100;

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
  const decrease = () => onChange(Math.max(min, roundToHundredths(value - step)));
  const increase = () => onChange(Math.min(max, roundToHundredths(value + step)));
  const atMin = value <= min;
  const atMax = value >= max;
  const text = format ? format(value) : String(value);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const { actionName } = e.nativeEvent;
        if (actionName === 'increment') increase();
        else if (actionName === 'decrement') decrease();
      }}
      testID={testID}
    >
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        onPress={decrease}
        disabled={atMin}
        {...HIDDEN_FROM_READERS}
        style={[styles.btn, { backgroundColor: p.inputBg }]}
        testID={testID ? `${testID}-dec` : undefined}
      >
        <Icon name="remove" size={20} color={atMin ? p.textSecondary : p.accent} />
      </Pressable>
      <AppText variant="tabular" style={styles.value}>
        {text}
      </AppText>
      <Pressable
        onPress={increase}
        disabled={atMax}
        {...HIDDEN_FROM_READERS}
        style={[styles.btn, { backgroundColor: p.inputBg }]}
        testID={testID ? `${testID}-inc` : undefined}
      >
        <Icon name="add" size={20} color={atMax ? p.textSecondary : p.accent} />
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
