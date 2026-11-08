import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AccountDeletionError, deleteOwnAccount } from './deletionRepository';

const mockInvoke = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
jest.mock('@/shared/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));
describe('account deletion repository', () => {
  beforeEach(() => { jest.resetAllMocks(); });
  it('sends only the current password and requires a completed response', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null })
      .mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
    await deleteOwnAccount('synthetic-password');
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', { body: { password: 'synthetic-password' } });
    await expect(deleteOwnAccount('synthetic-password')).rejects.toThrow();
  });
  it('maps server errors without returning success or exposing provider data', async () => {
    mockInvoke.mockResolvedValue({
      data: null, error: new FunctionsHttpError({ json: async () => ({ error: 'cleanup_pending' }) }),
    });
    await expect(deleteOwnAccount('synthetic-password')).rejects.toEqual(new AccountDeletionError('cleanup_pending'));
  });
  it('propagates network errors and rejects empty passwords before requesting', async () => {
    await expect(deleteOwnAccount('')).rejects.toThrow('invalid_input');
    expect(mockInvoke).not.toHaveBeenCalled();
    const error = new Error('offline');
    mockInvoke.mockResolvedValue({ data: null, error });
    await expect(deleteOwnAccount('synthetic-password')).rejects.toBe(error);
  });
});
