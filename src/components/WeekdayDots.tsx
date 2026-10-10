import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { weekOrder, weekdayLong, weekdayShort } from '../i18n/format';
import { usePalette } from '../theme/useTheme';
import { AppText } from './AppText';

/**
 * แถวตัวอักษรย่อวันในสัปดาห์ (อา จ อ พ พฤ ศ ส) ใต้ข้อความของแถว (SPEC DS)
 * วันที่เกี่ยวข้องเป็นสีหลักตัวหนาและมีจุดเล็กเหนือตัวอักษร วันอื่นเป็นสีเทา
 * ถ้าส่ง onToggleDay มา แต่ละวันจะกดเปิด/ปิดได้ (หน้าตารางประจำสัปดาห์ SPEC E)
 */
export function WeekdayDots({
  active,
  weekStart = 1,
  dimmed,
  onToggleDay,
  label,
  highlightDay,
}: {
  active: number[];
  weekStart?: number;
  dimmed?: boolean;
  onToggleDay?: (day: number) => void;
  /** ชื่อของแถว ใช้ประกอบคำอ่านของ screen reader */
  label?: string;
  /** วันนี้ (ขีดเส้นใต้เบาๆ) */
  highlightDay?: number;
}) {
  const p = usePalette();
  const { t } = useTranslation();
  const order = weekOrder(weekStart);
  const summary = order
    .map((d) => t(active.includes(d) ? 'a11y.weekdayOn' : 'a11y.weekdayOff', { day: weekdayLong(d) }))
    .join(', ');

  const cells = order.map((d) => {
    const on = active.includes(d);
    const color = on ? (dimmed ? p.textSecondary : p.accent) : p.textSecondary;
    const cell = (
      <View style={styles.cell}>
        <View style={[styles.dot, { backgroundColor: on ? color : 'transparent' }]} />
        <AppText
          variant={on ? 'dayLetterOn' : 'dayLetter'}
          color={color}
          style={[!on && styles.off, highlightDay === d && { textDecorationLine: 'underline' }]}
          maxFontSizeMultiplier={1.3}
        >
          {weekdayShort(d)}
        </AppText>
      </View>
    );
    if (!onToggleDay) return <React.Fragment key={d}>{cell}</React.Fragment>;
    return (
      <Pressable
        key={d}
        onPress={() => onToggleDay(d)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={label ? `${label}, ${weekdayLong(d)}` : weekdayLong(d)}
        hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
        style={styles.touch}
        testID={`weekday-${d}`}
      >
        {cell}
      </Pressable>
    );
  });

  if (onToggleDay) return <View style={styles.row}>{cells}</View>;
  return (
    <View style={styles.row} accessible accessibilityLabel={label ? `${label}. ${summary}` : summary}>
      {cells}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  cell: { alignItems: 'center', minWidth: 18 },
  touch: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'flex-end' },
  dot: { width: 4, height: 4, borderRadius: 2, marginBottom: 2 },
  off: { opacity: 0.6 },
});
