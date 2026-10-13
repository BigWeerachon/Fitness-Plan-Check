import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme/tokens';
import { AppText } from './AppText';

/** แถวในการ์ดที่มีป้ายหัวข้อเล็กๆ อยู่เหนือตัวควบคุม (ตัวเลือก/สวิตช์/ปุ่มเลือก) — ไม่ใส่ label = เว้นขอบอย่างเดียว */
export function LabeledRow({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      {label ? (
        <AppText variant="caption" secondary>
          {label}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: spacing.lg, gap: spacing.sm },
});
