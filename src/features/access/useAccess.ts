import { useMemo } from 'react';
import { useNow } from '../../hooks/useNow';
import type { CachedEntitlement } from '../../db/repos/entitlementRepo';
import { getOwner } from '../../db/owner';
import { resolveAccess, type AccessDecision } from '../../domain/entitlement/machine';
import { useEntitlement } from '../../stores/entitlement';
import { now } from '../../utils/clock';

/** ตรวจสิทธิ์ซ้ำทุกกี่ ms เพื่อให้หมดอายุตรงเวลา */
const ACCESS_REFRESH_MS = 60_000;

export interface AccessState extends AccessDecision {
  /** รอผลตรวจสิทธิ์ครั้งแรก (ไม่ควรเด้ง Paywall ระหว่างนี้) */
  pending: boolean;
}

interface AccessInputs {
  loaded: boolean;
  cached: CachedEntitlement | null;
  fresh: boolean;
  online: boolean;
  checking: boolean;
  now: number;
}

function computeAccess(inputs: AccessInputs): AccessState {
  // สิทธิ์ผูกกับเครื่อง (ผู้ใช้ RevenueCat นิรนาม D81) จึงใช้เจ้าของข้อมูลในเครื่องเป็นผู้ถือสิทธิ์
  const decision = resolveAccess({
    userId: getOwner(),
    cached: inputs.cached,
    fresh: inputs.fresh,
    online: inputs.online,
    now: inputs.now,
  });
  // แคชบอกว่าหมดอายุแต่กำลังตรวจออนไลน์อยู่ → รอผลก่อน (กันผู้ที่ต่ออายุแล้วเห็น Paywall วูบ)
  const recheckingExpiredCache = !decision.allowed && inputs.checking && !!inputs.cached;
  const pending = !inputs.loaded || recheckingExpiredCache;
  return { ...decision, pending };
}

/** ตัดสินสิทธิ์นอก React (เช่น ใน service) — ใช้ตรรกะเดียวกับ useAccess */
export function getAccess(): AccessState {
  const entitlement = useEntitlement.getState();
  return computeAccess({ ...entitlement, now: now() });
}

/**
 * ตัดสินสิทธิ์จากโมดูลเดียว (SPEC B8) — ทุกหน้า/ตัวกั้นใช้ hook นี้ ห้ามเขียนเงื่อนไขสิทธิ์เองที่อื่น
 * ตรวจซ้ำทุกนาทีเพื่อให้สิทธิ์หมดตรงเวลาแม้เปิดแอปค้างไว้
 */
export function useAccess(): AccessState {
  const loaded = useEntitlement((s) => s.loaded);
  const cached = useEntitlement((s) => s.cached);
  const fresh = useEntitlement((s) => s.fresh);
  const online = useEntitlement((s) => s.online);
  const checking = useEntitlement((s) => s.checking);
  const nowMs = useNow(ACCESS_REFRESH_MS);
  return useMemo(
    () => computeAccess({ loaded, cached, fresh, online, checking, now: nowMs }),
    [loaded, cached, fresh, online, checking, nowMs],
  );
}
