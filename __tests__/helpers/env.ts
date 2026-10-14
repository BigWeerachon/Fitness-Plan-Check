import { resetDbForTests } from '@/db/client';
import { MockAuthService } from '@/services/auth/mockAuth';
import { MockPurchasesService, type MockScenario } from '@/services/purchases/mockPurchases';
import { setServicesForTests, type Services } from '@/services/registry';
import { useAuth } from '@/stores/auth';
import { useEntitlement } from '@/stores/entitlement';

export interface TestServices extends Services {
  auth: MockAuthService;
  purchases: MockPurchasesService;
}

/** เริ่มฐานข้อมูลใหม่ + service จำลองชุดใหม่ + ล้าง store */
export function freshEnv(scenario: MockScenario = 'new'): TestServices {
  resetDbForTests();
  const services: TestServices = {
    auth: new MockAuthService(),
    purchases: new MockPurchasesService(scenario),
    mode: 'mock',
  };
  setServicesForTests(services);
  useAuth.setState({ status: 'unknown', user: null });
  useEntitlement.setState({
    cached: null,
    fresh: false,
    checking: false,
    online: true,
    trialEligibility: 'unknown',
  });
  return services;
}

/** จำลองการปิดแล้วเปิดแอปใหม่: store ในหน่วยความจำหาย แต่ฐานข้อมูลและบัญชีสโตร์ยังอยู่ */
export function simulateRestart(prev: TestServices): TestServices {
  const purchases = prev.purchases;
  // RevenueCat SDK เริ่มใหม่เป็นผู้ใช้นิรนาม จนกว่าจะ logIn อีกครั้ง
  void purchases.logOut();
  const services: TestServices = { ...prev, auth: new MockAuthService(), purchases };
  setServicesForTests(services);
  useAuth.setState({ status: 'unknown', user: null });
  useEntitlement.setState({
    cached: null,
    fresh: false,
    checking: false,
    online: true,
    trialEligibility: 'unknown',
  });
  return services;
}
