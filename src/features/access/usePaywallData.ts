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

interface Loaded {
  key: string;
  plans: StorePlans | null;
  error: boolean;
}

/**
 * โหลดแพ็กเกจและราคาจากสโตร์ แล้วตรวจสิทธิ์ทดลองฟรี "ก่อน" แสดง Paywall (SPEC B6, J2)
 * บัญชีเปลี่ยน (เช่น หลังล็อกอิน) → ผลเดิมใช้ไม่ได้ แสดงสถานะกำลังโหลดจนกว่าจะตรวจของบัญชีใหม่เสร็จ
 */
export function usePaywallData(): PaywallData {
  const userId = useAuth((s) => s.user?.id ?? null);
  const [attempt, setAttempt] = useState(0);
  const key = `${userId ?? 'anonymous'}|${attempt}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let alive = true;
    // สิทธิ์ทดลองของบัญชีก่อนหน้าใช้กับบัญชีนี้ไม่ได้ — ไม่โฆษณาทดลองจนกว่าจะรู้ผลจริง (B6)
    useEntitlement.getState().set({ trialEligibility: 'unknown' });
    (async () => {
      try {
        const plans = await getServices().purchases.getPlans();
        await checkTrialEligibility(plans.monthly);
        if (alive) setLoaded({ key, plans, error: false });
      } catch {
        if (!alive) return;
        useEntitlement.getState().set({ trialEligibility: 'unknown' });
        setLoaded({ key, plans: null, error: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const loading = loaded?.key !== key;
  return { plans: loading ? null : loaded.plans, loading, error: !loading && loaded.error, reload };
}
