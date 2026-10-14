import { describe, expect, it } from '@jest/globals';
import type { ConfigContext } from 'expo/config';
import createConfig from '../app.config';

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

  it('declares the collected data types, linked to the user, never for tracking', () => {
    const types = manifest.NSPrivacyCollectedDataTypes.map((d) => d.NSPrivacyCollectedDataType);
    expect(types).toEqual(
      expect.arrayContaining([
        'NSPrivacyCollectedDataTypeUserID',
        'NSPrivacyCollectedDataTypeFitness',
        'NSPrivacyCollectedDataTypeHealth',
        'NSPrivacyCollectedDataTypePurchaseHistory',
      ]),
    );
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
