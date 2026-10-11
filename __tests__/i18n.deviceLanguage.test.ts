import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { getLocales } from 'expo-localization';
import { deviceLanguage, setLanguage } from '@/i18n';
import { useSettings } from '@/stores/settings';
import { freshEnv } from './helpers/env';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
  getCalendars: () => [{ uses24hourClock: true }],
}));

const mockGetLocales = getLocales as unknown as jest.Mock<() => { languageCode: string | null }[]>;

describe('deviceLanguage (SPEC C step 1: default language follows the device)', () => {
  afterEach(() => {
    mockGetLocales.mockImplementation(() => [{ languageCode: 'en' }]);
    setLanguage('en');
  });

  it('is Thai when the device language is Thai', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'th' }]);
    expect(deviceLanguage()).toBe('th');
  });

  it('is English for any other or unknown device language', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'ja' }]);
    expect(deviceLanguage()).toBe('en');
    mockGetLocales.mockReturnValue([{ languageCode: null }]);
    expect(deviceLanguage()).toBe('en');
    mockGetLocales.mockReturnValue([]);
    expect(deviceLanguage()).toBe('en');
  });

  it('first-launch settings default to the device language', () => {
    freshEnv();
    mockGetLocales.mockReturnValue([{ languageCode: 'th' }]);
    useSettings.getState().load();
    expect(useSettings.getState().language).toBe('th');
  });
});
