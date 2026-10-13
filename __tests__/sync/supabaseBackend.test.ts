import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SupabaseSyncBackend } from '@/services/sync/supabaseBackend';
import { SyncAccessDeniedError, SyncNetworkError } from '@/services/sync/types';

type RpcResult = { data: unknown; error: { code?: string; message?: string; status?: number } | null };
const mockRpc = jest.fn<(fn: string, args: Record<string, unknown>) => Promise<RpcResult>>();

const mockFrom = jest.fn<(table: string) => unknown>();

jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ rpc: mockRpc, from: mockFrom }),
}));

const USER = '11111111-1111-4111-8111-111111111111';

describe('SupabaseSyncBackend.hasSyncAccess (SPEC J6, B11)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('asks the same has_sync_access function that RLS uses', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await new SupabaseSyncBackend().hasSyncAccess(USER)).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('has_sync_access', { uid: USER });
  });

  it('treats false or an empty answer as "not confirmed yet"', async () => {
    mockRpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await new SupabaseSyncBackend().hasSyncAccess(USER)).toBe(false);
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await new SupabaseSyncBackend().hasSyncAccess(USER)).toBe(false);
  });

  it('maps auth and network failures to the sync error types', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { status: 401, message: 'JWT expired' } });
    await expect(new SupabaseSyncBackend().hasSyncAccess(USER)).rejects.toBeInstanceOf(SyncAccessDeniedError);
    mockRpc.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(new SupabaseSyncBackend().hasSyncAccess(USER)).rejects.toBeInstanceOf(SyncNetworkError);
  });
});

describe('SupabaseSyncBackend.pull cursor filter', () => {
  const TS = '2026-10-09T09:00:00.123456+00:00';

  function fakeQuery(result: { data: unknown; error: unknown }) {
    const calls: [string, unknown[]][] = [];
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'order', 'limit', 'or', 'gte']) {
      query[method] = (...args: unknown[]) => {
        calls.push([method, args]);
        return query;
      };
    }
    query.then = (resolve: (r: unknown) => unknown) => resolve(result);
    mockFrom.mockReturnValueOnce(query);
    return calls;
  }

  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('uses gte on the timestamp for a rewound cursor without an id', async () => {
    const calls = fakeQuery({ data: [], error: null });
    const result = await new SupabaseSyncBackend().pull('program', USER, `${TS}|`, 10);
    expect(calls).toContainEqual(['gte', ['server_updated_at', TS]]);
    expect(calls.some(([m]) => m === 'or')).toBe(false);
    expect(result).toEqual({ rows: [], cursor: `${TS}|` });
  });

  it('continues after (timestamp, id) with an or filter and returns the next cursor', async () => {
    const calls = fakeQuery({ data: [{ id: 'row-2', server_updated_at: TS }], error: null });
    const result = await new SupabaseSyncBackend().pull('program', USER, `${TS}|row-1`, 10);
    expect(calls).toContainEqual([
      'or',
      [`server_updated_at.gt."${TS}",and(server_updated_at.eq."${TS}",id.gt."row-1")`],
    ]);
    expect(calls.some(([m]) => m === 'gte')).toBe(false);
    expect(result.cursor).toBe(`${TS}|row-2`);
  });

  it('maps a server error to an Error and a fetch failure to SyncNetworkError', async () => {
    fakeQuery({ data: null, error: { code: '23505', message: 'duplicate' } });
    await expect(new SupabaseSyncBackend().pull('program', USER, null, 10)).rejects.toThrow('duplicate');
    mockFrom.mockImplementationOnce(() => {
      throw new TypeError('Network request failed');
    });
    await expect(new SupabaseSyncBackend().pull('program', USER, null, 10)).rejects.toBeInstanceOf(
      SyncNetworkError,
    );
  });
});
