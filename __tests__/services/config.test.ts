import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { decideMocks, env, missingKeys } from '@/services/config';

const ORIGINAL_TRYOUT = process.env.EXPO_PUBLIC_TRYOUT_BUILD;
const ORIGINAL_DEV = (globalThis as { __DEV__?: boolean }).__DEV__;

afterEach(() => {
  if (ORIGINAL_TRYOUT === undefined) delete process.env.EXPO_PUBLIC_TRYOUT_BUILD;
  else process.env.EXPO_PUBLIC_TRYOUT_BUILD = ORIGINAL_TRYOUT;
  (globalThis as { __DEV__?: boolean }).__DEV__ = ORIGINAL_DEV;
});

/** โหลด config ใหม่ด้วย env ที่ตั้งต่อเทสต์ (EXPO_PUBLIC_* ถูกอ่านตอนโหลดโมดูล) */
function loadConfig(vars: { tryout?: string; dev: boolean }): typeof import('@/services/config') {
  if (vars.tryout === undefined) delete process.env.EXPO_PUBLIC_TRYOUT_BUILD;
  else process.env.EXPO_PUBLIC_TRYOUT_BUILD = vars.tryout;
  (globalThis as { __DEV__?: boolean }).__DEV__ = vars.dev;
  let loaded: typeof import('@/services/config') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ต้องโหลดใหม่ภายใน isolateModules
    loaded = require('@/services/config') as typeof import('@/services/config');
  });
  return loaded!;
}

describe('mock adapters are never used in a release build (B2)', () => {
  it('release native build ignores the flag and missing keys', () => {
    expect(decideMocks({ flag: true, dev: false, web: false, missing: 0, tryout: false })).toBe(false);
    expect(decideMocks({ flag: true, dev: false, web: false, missing: 3, tryout: false })).toBe(false);
    expect(decideMocks({ flag: false, dev: false, web: false, missing: 3, tryout: false })).toBe(false);
  });

  it('dev builds use mocks when asked or when keys are missing', () => {
    expect(decideMocks({ flag: true, dev: true, web: false, missing: 0, tryout: false })).toBe(true);
    expect(decideMocks({ flag: false, dev: true, web: false, missing: 2, tryout: false })).toBe(true);
    expect(decideMocks({ flag: false, dev: true, web: false, missing: 0, tryout: false })).toBe(false);
  });

  it('the web preview may use mocks', () => {
    expect(decideMocks({ flag: true, dev: false, web: true, missing: 0, tryout: false })).toBe(true);
  });
});

describe('tryout build is the one fenced exception to B2 (D85)', () => {
  it('a release bundle with the tryout flag uses the simulated store, with or without keys and flag', () => {
    for (const flag of [true, false]) {
      for (const missing of [0, 2]) {
        expect(decideMocks({ flag, dev: false, web: false, missing, tryout: true })).toBe(true);
      }
    }
  });

  it('without the tryout flag the release rule is unchanged', () => {
    expect(decideMocks({ flag: true, dev: false, web: false, missing: 3, tryout: false })).toBe(false);
  });

  it('EXPO_PUBLIC_TRYOUT_BUILD=1 turns it on in a release bundle (shouldUseMocks)', () => {
    const cfg = loadConfig({ tryout: '1', dev: false });
    expect(cfg.env.tryoutBuild).toBe(true);
    expect(cfg.shouldUseMocks()).toBe(true);
  });

  it('a release bundle without the variable still never uses mocks (shouldUseMocks)', () => {
    const cfg = loadConfig({ dev: false });
    expect(cfg.env.tryoutBuild).toBe(false);
    expect(cfg.shouldUseMocks()).toBe(false);
  });

  it('only the exact value "1" counts (0, true, empty are off)', () => {
    for (const value of ['0', 'true', '', ' 1']) {
      const cfg = loadConfig({ tryout: value, dev: false });
      expect(cfg.env.tryoutBuild).toBe(false);
      expect(cfg.shouldUseMocks()).toBe(false);
    }
  });

  it('dev behaviour is unchanged by the variable being absent', () => {
    const cfg = loadConfig({ dev: true });
    expect(cfg.env.tryoutBuild).toBe(false);
    // ไม่มีคีย์ RevenueCat ในเทสต์ → dev ใช้ mock ตามเดิม
    expect(cfg.shouldUseMocks()).toBe(cfg.missingKeys().length > 0 || cfg.env.useMocksFlag);
  });
});

describe('config keys (no backend or sign-in D81)', () => {
  it('only RevenueCat keys are required — no Supabase or Google sign-in config', () => {
    expect(Object.keys(env).sort()).toEqual(
      [
        'mockScenario',
        'privacyUrl',
        'rcAndroidKey',
        'rcIosKey',
        'termsUrl',
        'tryoutBuild',
        'useMocksFlag',
      ].sort(),
    );
    for (const key of missingKeys()) expect(key).toMatch(/^EXPO_PUBLIC_RC_/);
  });
});
