import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Profile {
  extends?: string;
  developmentClient?: boolean;
  distribution?: string;
  environment?: string;
  autoIncrement?: boolean;
  android?: { buildType?: string };
  ios?: { simulator?: boolean };
  env?: Record<string, string>;
  node?: string;
}
const eas = JSON.parse(readFileSync(join(__dirname, '..', 'eas.json'), 'utf8')) as {
  cli: { appVersionSource: string };
  build: Record<string, Profile>;
  submit?: Record<string, unknown>;
};

describe('eas.json (build profiles)', () => {
  it('has the profiles the docs refer to', () => {
    expect(Object.keys(eas.build).sort()).toEqual([
      'base',
      'development',
      'development-simulator',
      'preview',
      'production',
      'tryout',
    ]);
  });

  it('development is an installable dev client (APK on Android, simulator variant for iOS)', () => {
    expect(eas.build.development).toMatchObject({
      developmentClient: true,
      distribution: 'internal',
      environment: 'development',
      android: { buildType: 'apk' },
    });
    expect(eas.build['development-simulator'].ios?.simulator).toBe(true);
  });

  it('preview is an internal APK and production is a store bundle with remote auto-increment', () => {
    expect(eas.build.preview).toMatchObject({
      distribution: 'internal',
      environment: 'preview',
      android: { buildType: 'apk' },
    });
    expect(eas.build.production).toMatchObject({
      environment: 'production',
      autoIncrement: true,
      android: { buildType: 'app-bundle' },
    });
    expect(eas.cli.appVersionSource).toBe('remote');
  });

  it('never turns the mock store on for preview or production builds (B2)', () => {
    for (const name of ['preview', 'production']) {
      expect(eas.build[name].env?.EXPO_PUBLIC_USE_MOCKS).not.toBe('1');
    }
  });

  it('tryout is an internal APK that turns on the simulated store (D85)', () => {
    expect(eas.build.tryout).toMatchObject({
      extends: 'base',
      distribution: 'internal',
      environment: 'preview',
      android: { buildType: 'apk' },
      env: { EXPO_PUBLIC_TRYOUT_BUILD: '1' },
    });
    expect(eas.build.tryout.developmentClient).toBeFalsy();
    expect(eas.build.tryout.autoIncrement).toBeFalsy();
  });

  it('no other profile (base included) sets the tryout flag, so no store build can carry it (D85, B2)', () => {
    for (const [name, profile] of Object.entries(eas.build)) {
      if (name === 'tryout') continue;
      expect(profile.env?.EXPO_PUBLIC_TRYOUT_BUILD).toBeUndefined();
    }
    // โปรไฟล์ที่สืบทอดมาจาก tryout ก็ต้องไม่มี (ไม่มีโปรไฟล์ไหน extends tryout)
    expect(Object.values(eas.build).filter((p) => p.extends === 'tryout')).toEqual([]);
  });

  it('there is no submit profile for tryout', () => {
    expect(Object.keys(eas.submit ?? {})).not.toContain('tryout');
  });

  it('pins one Node version in the base profile', () => {
    expect(eas.build.base.node).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
