import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { ConfigContext } from 'expo/config';
import createConfig from '../app.config';

const VARS = ['EXPO_PUBLIC_TRYOUT_BUILD', 'APP_BUNDLE_ID', 'APP_SLUG'] as const;
const saved = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of VARS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** app.config อ่าน env ตอนโหลดโมดูล → โหลดใหม่ต่อเทสต์ด้วย env ที่กำหนด */
function configWith(vars: Partial<Record<(typeof VARS)[number], string>>) {
  for (const k of VARS) delete process.env[k];
  Object.assign(process.env, vars);
  let make: typeof createConfig | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ต้องโหลดใหม่ภายใน isolateModules
    make = (require('../app.config') as { default: typeof createConfig }).default;
  });
  return make!({ config: {} } as ConfigContext);
}

describe('app.config tryout build (D85)', () => {
  it('normal config: real name, slug and ids, no suffix', () => {
    const c = configWith({ APP_BUNDLE_ID: 'com.acme.fitnese' });
    expect(c.name).toBe('Fitnese');
    expect(c.slug).toBe('fitnese');
    expect(c.android?.package).toBe('com.acme.fitnese');
    expect(c.ios?.bundleIdentifier).toBe('com.acme.fitnese');
  });

  it('tryout config: test name and a separate .tryout package / bundle id on both platforms', () => {
    const c = configWith({ APP_BUNDLE_ID: 'com.acme.fitnese', EXPO_PUBLIC_TRYOUT_BUILD: '1' });
    expect(c.name).toBe('Fitnese (Test)');
    expect(c.android?.package).toBe('com.acme.fitnese.tryout');
    expect(c.ios?.bundleIdentifier).toBe('com.acme.fitnese.tryout');
    expect(c.slug).toBe('fitnese');
  });

  it('tryout suffix applies to the default id too', () => {
    const c = configWith({ EXPO_PUBLIC_TRYOUT_BUILD: '1' });
    expect(c.android?.package).toBe('com.example.fitnese.tryout');
  });

  it('any other value of the flag leaves the config untouched', () => {
    for (const value of ['0', 'true', '']) {
      const c = configWith({ APP_BUNDLE_ID: 'com.acme.fitnese', EXPO_PUBLIC_TRYOUT_BUILD: value });
      expect(c.name).toBe('Fitnese');
      expect(c.android?.package).toBe('com.acme.fitnese');
      expect(c.ios?.bundleIdentifier).toBe('com.acme.fitnese');
    }
  });

  it('slug can be overridden only through APP_SLUG (default fitnese)', () => {
    expect(configWith({}).slug).toBe('fitnese');
    expect(configWith({ APP_SLUG: 'fitness-plan-check' }).slug).toBe('fitness-plan-check');
    expect(configWith({ APP_SLUG: 'x', EXPO_PUBLIC_TRYOUT_BUILD: '1' }).slug).toBe('x');
  });
});

describe('app.config privacy manifest (SPEC N1, B13)', () => {
  const config = createConfig({ config: {} } as ConfigContext);
  const manifest = config.ios?.privacyManifests as {
    NSPrivacyTracking: boolean;
    NSPrivacyTrackingDomains: string[];
    NSPrivacyCollectedDataTypes: {
      NSPrivacyCollectedDataType: string;
      NSPrivacyCollectedDataTypeLinked: boolean;
      NSPrivacyCollectedDataTypeTracking: boolean;
      NSPrivacyCollectedDataTypePurposes: string[];
    }[];
  };

  it('declares only what leaves the device (D81, D83): RevenueCat anonymous ID + purchase history', () => {
    const types = manifest.NSPrivacyCollectedDataTypes.map((d) => d.NSPrivacyCollectedDataType);
    expect([...types].sort()).toEqual([
      'NSPrivacyCollectedDataTypePurchaseHistory',
      'NSPrivacyCollectedDataTypeUserID',
    ]);
    // ข้อมูลการฝึก/สุขภาพ/โปรไฟล์อยู่ในเครื่องเท่านั้น จึงต้องไม่ถูกประกาศว่าเก็บ
    for (const local of [
      'NSPrivacyCollectedDataTypeHealth',
      'NSPrivacyCollectedDataTypeFitness',
      'NSPrivacyCollectedDataTypeOtherDataTypes',
    ]) {
      expect(types).not.toContain(local);
    }
    expect(new Set(types).size).toBe(types.length);
    for (const d of manifest.NSPrivacyCollectedDataTypes) {
      expect(d.NSPrivacyCollectedDataTypeLinked).toBe(true);
      expect(d.NSPrivacyCollectedDataTypeTracking).toBe(false);
      expect(d.NSPrivacyCollectedDataTypePurposes).toEqual([
        'NSPrivacyCollectedDataTypePurposeAppFunctionality',
      ]);
    }
    expect(manifest.NSPrivacyTracking).toBe(false);
    expect(manifest.NSPrivacyTrackingDomains).toEqual([]);
  });

  it('no sign-in (D81): no email collected, no Google/Apple sign-in plugins or entitlement', () => {
    const types = manifest.NSPrivacyCollectedDataTypes.map((d) => d.NSPrivacyCollectedDataType);
    expect(types).not.toContain('NSPrivacyCollectedDataTypeEmailAddress');
    expect(config.ios?.usesAppleSignIn).toBeFalsy();
    const pluginNames = (config.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));
    expect(pluginNames).toEqual(expect.arrayContaining(['expo-router', 'expo-sqlite']));
    for (const removed of [
      'expo-apple-authentication',
      '@react-native-google-signin/google-signin',
      'expo-secure-store',
    ]) {
      expect(pluginNames).not.toContain(removed);
    }
  });
});
