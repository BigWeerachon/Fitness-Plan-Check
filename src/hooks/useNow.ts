import { useEffect, useState } from 'react';
import { now } from '../utils/clock';

/** เวลาปัจจุบัน (ms) ที่อัปเดตทุก intervalMs — ปิดการนับได้ด้วย enabled=false (ค่าที่ได้ค้างไว้ที่ค่าล่าสุด) */
export function useNow(intervalMs: number, enabled = true): number {
  const [nowMs, setNowMs] = useState(now);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNowMs(now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return nowMs;
}
