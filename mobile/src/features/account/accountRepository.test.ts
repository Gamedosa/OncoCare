import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getAccountContact, requestEmailChange, updateDisplayName } from './accountRepository';

const mockSingle = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockGetUser = jest.fn<() => Promise<{ data: { user: unknown }; error: unknown }>>();
const mockUpdateUser = jest.fn<(...args: unknown[]) => Promise<{ data: { user: unknown }; error: unknown }>>();
jest.mock('expo-linking', () => ({ createURL: (path: string) => `oncocare://${path.slice(1)}` }));
jest.mock('@/shared/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (value: unknown) => {
        mockUpdate(value);
        return { eq: (...args: unknown[]) => {
          mockEq(...args);
          return { select: () => ({ single: () => mockSingle() }) };
        } };
      },
    }),
    auth: { getUser: () => mockGetUser(), updateUser: (...args: unknown[]) => mockUpdateUser(...args) },
  },
}));
const ID = '00000000-0000-4000-8000-000000000001';
describe('account profile repository', () => {
  beforeEach(() => { jest.resetAllMocks(); });
  it('updates only the name of the specified profile; role is never client-assigned', async () => {
    mockSingle.mockResolvedValue({ data: { id: ID, role: 'patient', display_name: 'Nome', deletion_requested_at: null }, error: null });
    expect(await updateDisplayName(ID, ' Nome ')).toEqual({ id: ID, role: 'patient', displayName: 'Nome' });
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'Nome' });
    expect(mockEq).toHaveBeenCalledWith('id', ID);
    await expect(updateDisplayName(ID, ' ')).rejects.toThrow();
    await expect(updateDisplayName(ID, 'x'.repeat(121))).rejects.toThrow();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
  it('loads the verified Auth account rather than public profile data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: 'synthetic@example.test', new_email: 'new@example.test' } }, error: null });
    expect(await getAccountContact()).toEqual({ email: 'synthetic@example.test', pendingEmail: 'new@example.test' });
  });
  it('requests an Auth email change with the explicit callback and no profile email update', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: { email: 'synthetic@example.test', new_email: 'new@example.test' } }, error: null });
    await requestEmailChange(' new@example.test ');
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.test' }, { emailRedirectTo: 'oncocare://confirm-email' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it('propagates server errors without claiming a saved profile', async () => {
    const error = new Error('offline');
    mockSingle.mockResolvedValue({ data: null, error });
    await expect(updateDisplayName(ID, 'Nome')).rejects.toBe(error);
    mockUpdateUser.mockResolvedValue({ data: { user: null }, error });
    await expect(requestEmailChange('new@example.test')).rejects.toBe(error);
  });
});
