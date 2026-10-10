import { describe, expect, it } from '@jest/globals';
import { decideMocks } from '@/services/config';

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
