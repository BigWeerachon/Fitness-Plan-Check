import { useEffect, useMemo, useState } from 'react';
import type { CachedEntitlement } from '../../db/repos/entitlementRepo';
import { resolveAccess, type AccessDecision } from '../../domain/entitlement/machine';
import type { AuthUser } from '../../services/auth/types';
import { useAuth, type AuthStatus } from '../../stores/auth';
import { useEntitlement } from '../../stores/entitlement';
import { now } from '../../utils/clock';

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

function computeAccess(i: AccessInputs): AccessState {
  const decision = resolveAccess({
    userId: i.user?.id ?? null,
    cached: i.cached,
    fresh: i.fresh,
    online: i.online,
    now: i.now,
  });
  // แคชบอกว่าหมดอายุแต่กำลังตรวจออนไลน์อยู่ → รอผลก่อน (กันผู้ที่ต่ออายุแล้วเห็น Paywall วูบ)
  const pending = i.status === 'unknown' || (!decision.allowed && i.checking && !!i.cached);
  return { ...decision, pending, userId: i.user?.id ?? null };
}

/** ตัดสินสิทธิ์นอก React (เช่น ใน service) — ใช้ตรรกะเดียวกับ useAccess */
export function getAccess(): AccessState {
  const { user, status } = useAuth.getState();
  const e = useEntitlement.getState();
  return computeAccess({ user, status, ...e, now: now() });
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
  const [nowTs, setNowTs] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setNowTs(now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(
    () => computeAccess({ user, status, cached, fresh, online, checking, now: nowTs }),
    [user, status, cached, fresh, online, checking, nowTs],
  );
}
