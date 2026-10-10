import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePalette } from '../theme/useTheme';

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const p = usePalette();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, { backgroundColor: p.switchOff }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: p.accentFill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
