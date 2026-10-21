import React from 'react';
import { usePalette } from '../theme/useTheme';
import { Icon } from './Icon';

/** วงกลมเรดิโอแสดงว่าตัวเลือกถูกเลือกหรือไม่ — ใช้ท้ายแถว/การ์ดที่แตะเพื่อเลือก (ตัวแถวต้องใส่ role/state เอง) */
export function RadioIndicator({ selected }: { selected: boolean }) {
  const p = usePalette();
  return (
    <Icon
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={22}
      color={selected ? p.accent : p.textSecondary}
    />
  );
}
