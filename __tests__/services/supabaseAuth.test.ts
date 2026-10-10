import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { settingsRepo } from '@/db/repos/settingsRepo';
import { freshEnv } from '../helpers/env';

const mockGetSession = jest.fn<() => Promise<{ data: { session: unknown }; error: unknown }>>();
jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ auth: { getSession: mockGetSession, signOut: async () => ({ error: null }) } }),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: () => undefined, signOut: async () => undefined },
  isErrorWithCode: () => false,
  statusCodes: {},
}));
jest.mock('expo-apple-authentication', () => ({ AppleAuthenticationScope: { EMAIL: 1 } }));
jest.mock('expo-web-browser', () => ({}));

const { SupabaseAuthService } =
  require('@/services/auth/supabaseAuth') as typeof import('@/services/auth/supabaseAuth');

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'a@example.com',
  provider: 'google' as const,
  isPrivateRelay: false,
};
const session = { user: { id: USER.id, email: USER.email, app_metadata: { provider: 'google' } } };

describe('Supabase auth adapter keeps the user signed in offline (B9, B10)', () => {
  beforeEach(() => {
    freshEnv();
    mockGetSession.mockReset();
  });

  it('remembers the user when a session loads', async () => {
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    expect(await new SupabaseAuthService().init()).toEqual(USER);
    expect(settingsRepo.get('auth.lastUser')).toEqual(USER);
  });

  it('expired token + offline refresh → still the last user, not signed out', async () => {
    settingsRepo.set('auth.lastUser', USER);
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    expect(await new SupabaseAuthService().init()).toEqual(USER);
  });

  it('a real sign-out (no session, non-network error) clears the remembered user', async () => {
    settingsRepo.set('auth.lastUser', USER);
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await new SupabaseAuthService().init()).toBeNull();
    expect(settingsRepo.get('auth.lastUser')).toBeUndefined();
  });
});
