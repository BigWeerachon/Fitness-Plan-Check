import { describe, expect, it } from '@jest/globals';
import { decideMocks, env, missingKeys } from '@/services/config';

describe('mock adapters are never used in a release build (B2)', () => {
  it('release native build ignores the flag and missing keys', () => {
    expect(decideMocks({ flag: true, dev: false, web: false, missing: 0 })).toBe(false);
    expect(decideMocks({ flag: true, dev: false, web: false, missing: 3 })).toBe(false);
    expect(decideMocks({ flag: false, dev: false, web: false, missing: 3 })).toBe(false);
  });

  it('dev builds use mocks when asked or when keys are missing', () => {
    expect(decideMocks({ flag: true, dev: true, web: false, missing: 0 })).toBe(true);
    expect(decideMocks({ flag: false, dev: true, web: false, missing: 2 })).toBe(true);
    expect(decideMocks({ flag: false, dev: true, web: false, missing: 0 })).toBe(false);
  });

  it('the web preview may use mocks', () => {
    expect(decideMocks({ flag: true, dev: false, web: true, missing: 0 })).toBe(true);
  });
});

describe('config keys (no backend or sign-in D81)', () => {
  it('only RevenueCat keys are required — no Supabase or Google sign-in config', () => {
    expect(Object.keys(env).sort()).toEqual(
      ['mockScenario', 'privacyUrl', 'rcAndroidKey', 'rcIosKey', 'termsUrl', 'useMocksFlag'].sort(),
    );
    for (const key of missingKeys()) expect(key).toMatch(/^EXPO_PUBLIC_RC_/);
  });
});
