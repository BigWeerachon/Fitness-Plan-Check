import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SupabaseSyncBackend } from '@/services/sync/supabaseBackend';
import { SyncAccessDeniedError, SyncNetworkError } from '@/services/sync/types';

type RpcResult = { data: unknown; error: { code?: string; message?: string; status?: number } | null };
const mockRpc = jest.fn<(fn: string, args: Record<string, unknown>) => Promise<RpcResult>>();

jest.mock('@/services/supabase', () => ({
  getSupabase: () => ({ rpc: mockRpc }),
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
