import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert, Linking } from 'react-native';
import { REFERENCES } from '@/legal/content';
import en from '@/i18n/locales/en/nutrition';
import th from '@/i18n/locales/th/nutrition';
import { entitledApp, flush } from '../helpers/app';

jest.setTimeout(60_000);
afterEach(() => {
  jest.restoreAllMocks();
});

describe('health disclaimer (SPEC H5, N1, N2)', () => {
  it('says the app is not a medical device, in both languages', () => {
    expect(en.disclaimer).toContain(
      'Fitnese is not a medical device and does not diagnose or treat any condition.',
    );
    expect(th.disclaimer).toContain('แอปนี้ไม่ใช่อุปกรณ์การแพทย์ และไม่ได้วินิจฉัยหรือรักษาโรค');
  });

  it('links to the sources page from the profile and does not link to itself on that page', async () => {
    await entitledApp();
    renderRouter('./src/app', { initialUrl: '/profile' });
    expect(await screen.findByTestId('health-disclaimer')).toHaveTextContent(
      /not a medical device and does not diagnose or treat any condition/,
    );
    const link = screen.getByTestId('disclaimer-sources');
    expect(link.props.accessibilityRole).toBe('link');
    expect(link.props.accessibilityLabel).toBe('Sources');
    fireEvent.press(link);
    expect(await screen.findByTestId('references')).toBeTruthy();
    expect(screen.getByTestId('health-disclaimer')).toBeTruthy();
    expect(screen.queryByTestId('disclaimer-sources')).toBeNull();
  });
});

describe('references page links (SPEC H6)', () => {
  it('opens the source URL', async () => {
    await entitledApp();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderRouter('./src/app', { initialUrl: '/references' });
    fireEvent.press(await screen.findByTestId(`reference-${REFERENCES[0].id}`));
    await flush();
    expect(openURL).toHaveBeenCalledWith(REFERENCES[0].url);
  });

  it('tells the user when a link cannot be opened instead of leaving a rejected promise', async () => {
    await entitledApp();
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    renderRouter('./src/app', { initialUrl: '/references' });
    fireEvent.press(await screen.findByTestId(`reference-${REFERENCES[0].id}`));
    await flush();
    expect(alert).toHaveBeenCalledWith(
      'Something went wrong',
      'Couldn’t open this link. Please try again later.',
    );
  });
});
