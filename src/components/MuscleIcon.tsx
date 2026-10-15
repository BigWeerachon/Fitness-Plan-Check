import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';
import { BODY_OUTLINE, MUSCLE_ICON, MUSCLE_ICON_SIZE, type MuscleShape } from '../data/muscleIcons';
import type { MuscleGroup } from '../db/schema';
import { usePalette } from '../theme/useTheme';

function Shape({ s, ...paint }: { s: MuscleShape; fill?: string; stroke?: string; strokeWidth?: number }) {
  return s.kind === 'circle' ? (
    <Circle cx={s.cx} cy={s.cy} r={s.r} {...paint} />
  ) : (
    <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...paint} />
  );
}

/** ไอคอนกลุ่มกล้ามเนื้อแบบตกแต่ง (ชื่อกล้ามเนื้อมีเป็นข้อความอยู่แล้ว จึงซ่อนจาก screen reader) */
export function MuscleIcon({ muscle, size = 24 }: { muscle: MuscleGroup; size?: number }) {
  const p = usePalette();
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${MUSCLE_ICON_SIZE} ${MUSCLE_ICON_SIZE}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`muscle-icon-${muscle}`}
    >
      {BODY_OUTLINE.map((s, i) => (
        <Shape key={i} s={s} fill="none" stroke={p.textSecondary} strokeWidth={1.2} />
      ))}
      {MUSCLE_ICON[muscle].map((s, i) => (
        <Shape key={i} s={s} fill={p.accent} />
      ))}
    </Svg>
  );
}
