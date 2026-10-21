import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../stores/settings';
import { buildPalette, type Palette, type ThemeMode, type ThemePreference } from './tokens';

export function resolveMode(pref: ThemePreference, system: string | null | undefined): ThemeMode {
  if (pref === 'system') return system === 'light' ? 'light' : 'dark';
  return pref;
}

/** พาเลตปัจจุบันตามธีม (มืด/สว่าง/ตามระบบ) และสีหลักที่ผู้ใช้เลือก — เปลี่ยนแล้วทุกหน้าอัปเดตสด */
export function usePalette(): Palette {
  const pref = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  const system = useColorScheme();
  const mode = resolveMode(pref, system);
  return useMemo(() => buildPalette(mode, accent), [mode, accent]);
}
