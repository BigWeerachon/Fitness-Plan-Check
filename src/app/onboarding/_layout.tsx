import { Stack } from 'expo-router';
import React from 'react';
import { usePalette } from '../../theme/useTheme';

/** ตั้งค่าเริ่มต้น 3 ขั้นก่อนถึง Paywall (SPEC C) — เข้าถึงได้เสมอ (B3) */
export default function OnboardingLayout() {
  const p = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.background } }} />;
}
