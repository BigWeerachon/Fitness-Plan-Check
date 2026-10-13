import { useMemo } from 'react';
import { useNow } from '../../hooks/useNow';
import type { CachedEntitlement } from '../../db/repos/entitlementRepo';
import { resolveAccess, type AccessDecision } from '../../domain/entitlement/machine';
import type { AuthUser } from '../../services/auth/types';
import { useAuth, type AuthStatus } from '../../stores/auth';
import { useEntitlement } from '../../stores/entitlement';
import { now } from '../../utils/clock';

/** ตรวจสิทธิ์ซ้ำทุกกี่ ms เพื่อให้หมดอายุตรงเวลา */
const ACCESS_REFRESH_MS = 60_000;

export interface AccessState extends AccessDecision {
  /** รอผลตรวจสิทธิ์ครั้งแรก (ไม่ควรเด้ง Paywall ระหว่างนี้) */
  pending: boolean;
  userId: string | null;
}

interface AccessInputs {
  user: AuthUser | null;
  status: AuthStatus;
  cached: CachedEntitlement | null;
  fresh: boolean;
  online: boolean;
  checking: boolean;
  now: number;
}

function computeAccess(inputs: AccessInputs): AccessState {
  const decision = resolveAccess({
    userId: inputs.user?.id ?? null,
    cached: inputs.cached,
    fresh: inputs.fresh,
    online: inputs.online,
    now: inputs.now,
  });
  // แคชบอกว่าหมดอายุแต่กำลังตรวจออนไลน์อยู่ → รอผลก่อน (กันผู้ที่ต่ออายุแล้วเห็น Paywall วูบ)
  const sessionNotLoadedYet = inputs.status === 'unknown';
  const recheckingExpiredCache = !decision.allowed && inputs.checking && !!inputs.cached;
  const pending = sessionNotLoadedYet || recheckingExpiredCache;
  return { ...decision, pending, userId: inputs.user?.id ?? null };
}

/** ตัดสินสิทธิ์นอก React (เช่น ใน service) — ใช้ตรรกะเดียวกับ useAccess */
export function getAccess(): AccessState {
  const { user, status } = useAuth.getState();
  const entitlement = useEntitlement.getState();
  return computeAccess({ user, status, ...entitlement, now: now() });
}

/**
 * ตัดสินสิทธิ์จากโมดูลเดียว (SPEC B8) — ทุกหน้า/ตัวกั้นใช้ hook นี้ ห้ามเขียนเงื่อนไขสิทธิ์เองที่อื่น
 * ตรวจซ้ำทุกนาทีเพื่อให้สิทธิ์หมดตรงเวลาแม้เปิดแอปค้างไว้
 */
export function useAccess(): AccessState {
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const cached = useEntitlement((s) => s.cached);
  const fresh = useEntitlement((s) => s.fresh);
  const online = useEntitlement((s) => s.online);
  const checking = useEntitlement((s) => s.checking);
  const nowMs = useNow(ACCESS_REFRESH_MS);
  return useMemo(
    () => computeAccess({ user, status, cached, fresh, online, checking, now: nowMs }),
    [user, status, cached, fresh, online, checking, nowMs],
  );
}
