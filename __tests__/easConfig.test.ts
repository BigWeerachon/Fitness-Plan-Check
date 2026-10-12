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
};

describe('eas.json (build profiles)', () => {
  it('has the profiles the docs refer to', () => {
    expect(Object.keys(eas.build).sort()).toEqual([
      'base',
      'development',
      'development-simulator',
      'preview',
      'production',
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

  it('pins one Node version in the base profile', () => {
    expect(eas.build.base.node).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
