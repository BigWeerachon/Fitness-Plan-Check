import { Stack } from 'expo-router';
import React from 'react';
import { AccessGate } from '../../features/access/AccessGate';
import { usePalette } from '../../theme/useTheme';

/** ทุกหน้าในกลุ่มนี้ถูกล็อกเมื่อไม่มีสิทธิ์ (SPEC B3) */
export default function AppLayout() {
  const p = usePalette();
  return (
    <AccessGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.background } }} />
    </AccessGate>
  );
}
