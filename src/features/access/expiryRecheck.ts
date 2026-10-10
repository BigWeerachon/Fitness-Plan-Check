import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../stores/auth';
import { useEntitlement } from '../../stores/entitlement';
import { now } from '../../utils/clock';
import { refreshEntitlement } from './accountFlow';

export interface RecheckInput {
  hasUser: boolean;
  expirationDate: number | null;
  now: number;
  checking: boolean;
  /** วันหมดอายุที่ตรวจไปแล้ว (ตรวจครั้งเดียวต่อวันหมดอายุ ไม่วนซ้ำถ้าหมดจริง) */
  lastCheckedFor: number | null;
}

export function shouldRecheckExpiry(i: RecheckInput): boolean {
  return (
    i.hasUser &&
    !i.checking &&
    i.expirationDate !== null &&
    i.now > i.expirationDate &&
    i.lastCheckedFor !== i.expirationDate
  );
}

/**
 * แคชบอกว่าสิทธิ์ถึงวันหมดอายุขณะเปิดแอปค้างไว้ → ถามสโตร์ใหม่ทันที (สมาชิกที่ต่ออายุแล้วไม่ควรถูกพาไป Paywall)
 * ระหว่างตรวจ AccessGate แสดงสถานะรอ (B8, B9)
 */
export function useEntitlementExpiryRecheck(): void {
  const user = useAuth((s) => s.user);
  const expirationDate = useEntitlement((s) => s.cached?.expirationDate ?? null);
  const checking = useEntitlement((s) => s.checking);
  const lastCheckedFor = useRef<number | null>(null);
  const [tick, setTick] = useState(now);

  useEffect(() => {
    const id = setInterval(() => setTick(now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const input = {
      hasUser: !!user,
      expirationDate,
      now: tick,
      checking,
      lastCheckedFor: lastCheckedFor.current,
    };
    if (!shouldRecheckExpiry(input)) return;
    lastCheckedFor.current = expirationDate;
    void refreshEntitlement();
  }, [user, expirationDate, checking, tick]);
}
