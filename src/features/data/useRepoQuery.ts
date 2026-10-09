import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDataVersion } from '../../stores/dataVersion';

/**
 * อ่านข้อมูลจาก repository (SQLite แบบ synchronous) แล้วคำนวณใหม่เมื่อ
 * ข้อมูลเปลี่ยน (เขียนในเครื่อง/ซิงก์), key เปลี่ยน หรือกลับมาที่หน้านี้
 * (อ่าน SQLite ในเครื่องเร็วพอที่จะคำนวณใหม่ทุก render ที่เกิดจากสามเหตุนี้)
 */
export function useRepoQuery<T>(fn: () => T, key: string = ''): T {
  const version = useDataVersion((s) => s.version);
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((x) => x + 1);
    }, []),
  );
  const [cache, setCache] = useState<{ stamp: string; value: T } | null>(null);
  const stamp = `${version}|${key}|${focusTick}`;
  if (!cache || cache.stamp !== stamp) {
    const value = fn();
    setCache({ stamp, value });
    return value;
  }
  return cache.value;
}
