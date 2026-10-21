import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** ไอคอนเส้นบาง (Ionicons outline) ใช้ทั้งแอป */
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
