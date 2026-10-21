import { useEffect, useRef } from 'react';
import { useNow } from '../../hooks/useNow';
import { useEntitlement } from '../../stores/entitlement';
import { refreshEntitlement } from './accountFlow';

/** ตรวจว่าแคชถึงวันหมดอายุหรือยังทุกกี่ ms */
const EXPIRY_RECHECK_INTERVAL_MS = 30_000;

export interface RecheckInput {
  expirationDate: number | null;
  now: number;
  checking: boolean;
  /** วันหมดอายุที่ตรวจไปแล้ว (ตรวจครั้งเดียวต่อวันหมดอายุ ไม่วนซ้ำถ้าหมดจริง) */
  lastCheckedFor: number | null;
}

export function shouldRecheckExpiry(i: RecheckInput): boolean {
  return (
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
  const expirationDate = useEntitlement((s) => s.cached?.expirationDate ?? null);
  const checking = useEntitlement((s) => s.checking);
  const lastCheckedFor = useRef<number | null>(null);
  const nowMs = useNow(EXPIRY_RECHECK_INTERVAL_MS);

  useEffect(() => {
    const input = {
      expirationDate,
      now: nowMs,
      checking,
      lastCheckedFor: lastCheckedFor.current,
    };
    if (!shouldRecheckExpiry(input)) return;
    lastCheckedFor.current = expirationDate;
    void refreshEntitlement();
  }, [expirationDate, checking, nowMs]);
}
