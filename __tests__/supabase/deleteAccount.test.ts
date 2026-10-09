import { describe, expect, it, jest } from '@jest/globals';
import { webcrypto } from 'crypto';
import {
  appleClientSecret,
  bearerToken,
  handleDeleteAccount,
  revokeAppleToken,
  type DeleteDeps,
} from '../../supabase/functions/delete-account/logic';

const USER = '11111111-1111-4111-8111-111111111111';
const subtle = webcrypto.subtle as unknown as SubtleCrypto;

function deps(provider: string | null, overrides: Partial<DeleteDeps> = {}) {
  const calls: string[] = [];
  const d: DeleteDeps = {
    getUser: async (token) => (token === 'good' ? { id: USER, provider } : null),
    revokeApple: async (code) => {
      calls.push(`revoke:${code}`);
    },
    deleteRevenueCatCustomer: async (id) => {
      calls.push(`rc:${id}`);
    },
    deleteUser: async (id) => {
      calls.push(`delete:${id}`);
    },
    ...overrides,
  };
  return { d, calls };
}

describe('delete-account function (SPEC B12, N1)', () => {
  it('requires a valid user token', async () => {
    const { d, calls } = deps('google');
    expect((await handleDeleteAccount({ authorization: null, body: {} }, d)).status).toBe(401);
    expect((await handleDeleteAccount({ authorization: 'Bearer bad', body: {} }, d)).status).toBe(401);
    expect(calls).toEqual([]);
    expect(bearerToken('Bearer  ')).toBeNull();
  });

  it('revokes Apple tokens, removes the RevenueCat customer, then deletes the user (cascade)', async () => {
    const { d, calls } = deps('apple');
    const r = await handleDeleteAccount(
      { authorization: 'Bearer good', body: { appleAuthorizationCode: 'code123' } },
      d,
    );
    expect(r).toEqual({ status: 200, body: { deleted: true, appleRevoked: true, revenueCatDeleted: true } });
    expect(calls).toEqual(['revoke:code123', `rc:${USER}`, `delete:${USER}`]);
  });

  it('still deletes the data when Apple revocation fails, and reports it', async () => {
    const log = jest.fn();
    const { d, calls } = deps('apple', {
      revokeApple: async () => {
        throw new Error('apple down');
      },
      log,
    });
    const r = await handleDeleteAccount(
      { authorization: 'Bearer good', body: { appleAuthorizationCode: 'c' } },
      d,
    );
    expect(r.body).toMatchObject({ deleted: true, appleRevoked: false });
    expect(calls).toContain(`delete:${USER}`);
    expect(log).toHaveBeenCalled();
  });

  it('Google accounts skip Apple revocation; a failed delete returns 500 so the app can retry', async () => {
    const { d, calls } = deps('google', {
      deleteUser: async () => {
        throw new Error('db');
      },
    });
    const r = await handleDeleteAccount(
      { authorization: 'Bearer good', body: { appleAuthorizationCode: 'c' } },
      d,
    );
    expect(r.status).toBe(500);
    expect(calls).toEqual([`rc:${USER}`]);
  });
});

describe('Sign in with Apple client secret + revoke', () => {
  it('signs a verifiable ES256 JWT with the expected claims', async () => {
    const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const pkcs8 = Buffer.from(await subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
    const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`;
    const jwt = await appleClientSecret({
      teamId: 'TEAM123456',
      keyId: 'KEY1234567',
      clientId: 'com.example.fitnese',
      privateKeyPem: pem,
      nowSec: 1_800_000_000,
      subtle,
    });
    const [h, p, s] = jwt.split('.');
    const decode = (x: string) => JSON.parse(Buffer.from(x, 'base64url').toString('utf8'));
    expect(decode(h)).toEqual({ alg: 'ES256', kid: 'KEY1234567', typ: 'JWT' });
    expect(decode(p)).toEqual({
      iss: 'TEAM123456',
      iat: 1_800_000_000,
      exp: 1_800_000_300,
      aud: 'https://appleid.apple.com',
      sub: 'com.example.fitnese',
    });
    const ok = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      Buffer.from(s, 'base64url'),
      new TextEncoder().encode(`${h}.${p}`),
    );
    expect(ok).toBe(true);
  });

  it('exchanges the authorization code and revokes the refresh token', async () => {
    const requests: { url: string; body: string }[] = [];
    const fetch = async (url: string, init: { body: string }) => {
      requests.push({ url, body: init.body });
      return {
        ok: true,
        status: 200,
        json: async () => (url.endsWith('/token') ? { refresh_token: 'rt_1', access_token: 'at_1' } : {}),
      };
    };
    await revokeAppleToken({
      code: 'code123',
      clientId: 'com.example.fitnese',
      clientSecret: 'secret',
      fetch,
    });
    expect(requests.map((r) => r.url)).toEqual([
      'https://appleid.apple.com/auth/token',
      'https://appleid.apple.com/auth/revoke',
    ]);
    expect(new URLSearchParams(requests[0].body).get('grant_type')).toBe('authorization_code');
    expect(Object.fromEntries(new URLSearchParams(requests[1].body))).toEqual({
      client_id: 'com.example.fitnese',
      client_secret: 'secret',
      token: 'rt_1',
      token_type_hint: 'refresh_token',
    });
    const failing = async () => ({ ok: false, status: 400, json: async () => ({}) });
    await expect(
      revokeAppleToken({ code: 'x', clientId: 'c', clientSecret: 's', fetch: failing }),
    ).rejects.toThrow('apple token exchange failed (400)');
  });
});
