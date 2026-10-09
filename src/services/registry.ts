import { MockAuthService } from './auth/mockAuth';
import type { AuthService } from './auth/types';
import { env, shouldUseMocks } from './config';
import { MockPurchasesService, type MockScenario } from './purchases/mockPurchases';
import type { PurchasesService } from './purchases/types';
import { MemorySyncBackend } from './sync/memoryBackend';
import type { SyncBackend } from './sync/types';

export interface Services {
  auth: AuthService;
  purchases: PurchasesService;
  sync: SyncBackend;
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
      auth: new MockAuthService(),
      purchases: new MockPurchasesService(env.mockScenario as MockScenario),
      sync: new MemorySyncBackend(),
      mode: 'mock',
    };
  } else {
    /* eslint-disable @typescript-eslint/no-require-imports -- โหลด native adapter เฉพาะโหมด live */
    const { SupabaseAuthService } = require('./auth/supabaseAuth') as typeof import('./auth/supabaseAuth');
    const { RevenueCatPurchasesService } =
      require('./purchases/revenueCat') as typeof import('./purchases/revenueCat');
    const { SupabaseSyncBackend } =
      require('./sync/supabaseBackend') as typeof import('./sync/supabaseBackend');
    /* eslint-enable @typescript-eslint/no-require-imports */
    services = {
      auth: new SupabaseAuthService(),
      purchases: new RevenueCatPurchasesService(),
      sync: new SupabaseSyncBackend(),
      mode: 'live',
    };
  }
  return services;
}

/** สำหรับเทสต์: แทนที่ service ทั้งชุด */
export function setServicesForTests(next: Services | null): void {
  services = next;
}
