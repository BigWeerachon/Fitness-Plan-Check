import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** ผู้ใช้เปิด "ลดการเคลื่อนไหว" ในระบบหรือไม่ (ปิด animation ที่ไม่จำเป็น SPEC N5) */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
