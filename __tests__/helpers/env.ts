import { resetDbForTests } from '@/db/client';
import { MockPurchasesService, type MockScenario } from '@/services/purchases/mockPurchases';
import { setServicesForTests, type Services } from '@/services/registry';
import { useEntitlement } from '@/stores/entitlement';

export interface TestServices extends Services {
  purchases: MockPurchasesService;
}

function resetEntitlementStore() {
  useEntitlement.setState({
    cached: null,
    loaded: false,
    fresh: false,
    checking: false,
    online: true,
    trialEligibility: 'unknown',
  });
}

/** เริ่มฐานข้อมูลใหม่ + ร้านค้าจำลองชุดใหม่ + ล้าง store */
export function freshEnv(scenario: MockScenario = 'new'): TestServices {
  resetDbForTests();
  const services: TestServices = {
    purchases: new MockPurchasesService(scenario),
    mode: 'mock',
  };
  setServicesForTests(services);
  resetEntitlementStore();
  return services;
}

/** จำลองการปิดแล้วเปิดแอปใหม่: store ในหน่วยความจำหาย แต่ฐานข้อมูลและบัญชีสโตร์ยังอยู่ */
export function simulateRestart(prev: TestServices): TestServices {
  const services: TestServices = { ...prev };
  setServicesForTests(services);
  resetEntitlementStore();
  return services;
}
