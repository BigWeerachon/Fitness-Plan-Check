import { describe, expect, it } from '@jest/globals';
import type { Profile } from '@/db/schema';
import { buildProfilePatch } from '@/features/onboarding/migrate';

const existingProfile = (overrides: Partial<Profile>): Profile => ({ ...overrides }) as Profile;

describe('buildProfilePatch', () => {
  const draft = {
    sex: 'male' as const,
    age: 30,
    heightCm: 180,
    weightKg: 75,
    weightUnit: 'lb' as const,
    lengthUnit: 'ftin' as const,
  };

  it('fills body data and units for an account with no profile yet', () => {
    expect(buildProfilePatch(draft, undefined)).toEqual(draft);
  });

  it('only fills empty body fields and never touches the units of an existing profile', () => {
    const patch = buildProfilePatch(draft, existingProfile({ age: 41, heightCm: null, weightKg: null }));
    expect(patch).toEqual({ sex: 'male', heightCm: 180, weightKg: 75 });
  });

  it('keeps only the units when the body step was skipped', () => {
    expect(buildProfilePatch({ ...draft, profileSkipped: true }, undefined)).toEqual({
      weightUnit: 'lb',
      lengthUnit: 'ftin',
    });
  });

  it('ignores null and undefined draft values', () => {
    expect(buildProfilePatch({ sex: null, age: undefined }, undefined)).toEqual({});
  });
});
