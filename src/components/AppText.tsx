import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { BODY_MAX_SCALE, typography, type TypographyVariant } from '../theme/typography';
import { usePalette } from '../theme/useTheme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  secondary?: boolean;
  accent?: boolean;
  align?: TextStyle['textAlign'];
}

/** ข้อความทุกตัวในแอปผ่านคอมโพเนนต์นี้ เพื่อใช้ฟอนต์/สี/การขยายฟอนต์ตาม design tokens */
export function AppText({ variant = 'body', color, secondary, accent, align, style, ...rest }: AppTextProps) {
  const p = usePalette();
  const c = color ?? (accent ? p.accent : secondary ? p.textSecondary : p.text);
  return (
    <Text
      maxFontSizeMultiplier={BODY_MAX_SCALE}
      {...rest}
      style={[typography[variant] as TextStyle, { color: c }, align ? { textAlign: align } : null, style]}
    />
  );
}
