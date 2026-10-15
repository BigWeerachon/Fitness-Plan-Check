import { env, shouldUseMocks } from './config';
import { MockPurchasesService, type MockScenario } from './purchases/mockPurchases';
import type { PurchasesService } from './purchases/types';

/** service ภายนอกเดียวของแอปคือการซื้อผ่านสโตร์ (ไม่มีล็อกอิน/คลาวด์ D81) */
export interface Services {
  purchases: PurchasesService;
  mode: 'mock' | 'live';
}

let services: Services | null = null;

/**
 * จุดเดียวที่เลือกว่าใช้ adapter จริงหรือ mock
 * adapter จริงโหลดแบบ lazy (require) เพื่อไม่ให้ native module ถูกโหลดในโหมด mock/เทสต์
 */
export function getServices(): Services {
  if (services) return services;
  if (shouldUseMocks()) {
    services = {
      purchases: new MockPurchasesService(env.mockScenario as MockScenario),
      mode: 'mock',
    };
  } else {
    /* eslint-disable @typescript-eslint/no-require-imports -- โหลด native adapter เฉพาะโหมด live */
    const { RevenueCatPurchasesService } =
      require('./purchases/revenueCat') as typeof import('./purchases/revenueCat');
    /* eslint-enable @typescript-eslint/no-require-imports */
    services = {
      purchases: new RevenueCatPurchasesService(),
      mode: 'live',
    };
  }
  return services;
}

/** สำหรับเทสต์: แทนที่ service ทั้งชุด */
export function setServicesForTests(next: Services | null): void {
  services = next;
}
