import { useCallback, useEffect, useState } from 'react';
import type { StorePlans } from '../../services/purchases/types';
import { getServices } from '../../services/registry';
import { useAuth } from '../../stores/auth';
import { useEntitlement } from '../../stores/entitlement';
import { checkTrialEligibility } from './accountFlow';

export interface PaywallData {
  plans: StorePlans | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * โหลดแพ็กเกจและราคาจากสโตร์ แล้วตรวจสิทธิ์ทดลองฟรี "ก่อน" แสดง Paywall (SPEC B6, J2)
 * ตรวจใหม่ทุกครั้งที่บัญชีเปลี่ยน (เช่น หลังล็อกอิน eligibility อาจเปลี่ยน)
 */
export function usePaywallData(): PaywallData {
  const userId = useAuth((s) => s.user?.id ?? null);
  const [plans, setPlans] = useState<StorePlans | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await getServices().purchases.getPlans();
        await checkTrialEligibility(result.monthly);
        if (!alive) return;
        setPlans(result);
        setError(false);
      } catch {
        if (!alive) return;
        useEntitlement.getState().set({ trialEligibility: 'unknown' });
        setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);

  return { plans, loading, error, reload };
}
