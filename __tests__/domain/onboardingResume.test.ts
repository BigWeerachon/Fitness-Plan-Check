import { describe, expect, it } from '@jest/globals';
import { hasBodyData, nextOnboardingStep, shouldMigrateDraft } from '@/domain/onboardingResume';

describe('hasBodyData', () => {
  it('is false for no profile or only units/nulls', () => {
    expect(hasBodyData(undefined)).toBe(false);
    expect(hasBodyData(null)).toBe(false);
    expect(hasBodyData({ sex: null, age: null, heightCm: null, weightKg: null })).toBe(false);
  });
  it('is true when any body field is set', () => {
    expect(hasBodyData({ age: 30 })).toBe(true);
    expect(hasBodyData({ goal: 'gain' })).toBe(true);
  });
});

describe('nextOnboardingStep (skip only the steps already done)', () => {
  it('goes to the profile step when there is no body data', () => {
    expect(nextOnboardingStep({ hasBodyData: false, hasProgram: true })).toBe('profile');
    expect(nextOnboardingStep({ hasBodyData: false, hasProgram: false })).toBe('profile');
  });
  it('goes to the program step when only the program is missing', () => {
    expect(nextOnboardingStep({ hasBodyData: true, hasProgram: false })).toBe('program');
  });
  it('is done when both exist', () => {
    expect(nextOnboardingStep({ hasBodyData: true, hasProgram: true })).toBe('done');
  });
});

describe('shouldMigrateDraft', () => {
  const base = { hasDraft: true, migrated: false, onboardingDone: false, hasQuickStart: false };
  it('does not migrate a partial draft mid-onboarding', () => {
    expect(shouldMigrateDraft(base)).toBe(false);
  });
  it('migrates once onboarding is done or a quick start was chosen', () => {
    expect(shouldMigrateDraft({ ...base, onboardingDone: true })).toBe(true);
    expect(shouldMigrateDraft({ ...base, hasQuickStart: true })).toBe(true);
  });
  it('never migrates twice or without a draft', () => {
    expect(shouldMigrateDraft({ ...base, onboardingDone: true, migrated: true })).toBe(false);
    expect(shouldMigrateDraft({ ...base, onboardingDone: true, hasDraft: false })).toBe(false);
  });
});
