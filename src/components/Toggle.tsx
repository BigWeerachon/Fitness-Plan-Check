import React from 'react';
import { Platform, Switch } from 'react-native';
import { usePalette } from '../theme/useTheme';

// react-native-web ใช้ activeThumbColor แยกต่างหาก (ค่าเริ่มต้นสีเขียวน้ำทะเล) — ให้ปุ่มกลมเป็นสีขาวเหมือนภาพอ้างอิง
const WEB_THUMB = (Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {}) as object;

/** สวิตช์สีหลักชิดขวา ใช้ Switch ของระบบเพื่อให้ VoiceOver/TalkBack อ่านสถานะถูกต้อง */

export function Toggle({
  value,
  onValueChange,
  label,
  disabled,
  testID,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  testID?: string;
}) {
  const p = usePalette();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: p.switchOff, true: p.accentFill }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={p.switchOff}
      {...WEB_THUMB}
      testID={testID}
    />
  );
}
