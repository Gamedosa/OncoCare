import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { requestPasswordReset, signOut, updatePassword, verifyEmailChangeLink, verifyInviteLink, verifyRecoveryLink } from './authRepository';

const mockReset = jest.fn<(...args: unknown[]) => Promise<{ error: Error | null }>>();
const mockVerify = jest.fn<(...args: unknown[]) => Promise<{ data: { session: unknown }; error: Error | null }>>();
const mockUpdate = jest.fn<(...args: unknown[]) => Promise<{ error: Error | null }>>();
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<{ error: Error | null }>>();
jest.mock('expo-linking', () => ({ createURL: (path: string) => `oncocare://${path.slice(1)}` }));
jest.mock('@/shared/supabase/client', () => ({
  supabase: { auth: {
    resetPasswordForEmail: (...args: unknown[]) => mockReset(...args),
    verifyOtp: (...args: unknown[]) => mockVerify(...args),
    updateUser: (...args: unknown[]) => mockUpdate(...args),
    signOut: (...args: unknown[]) => mockSignOut(...args),
  } },
}));

describe('password recovery repository', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('includes the app callback when requesting instructions', async () => {
    mockReset.mockResolvedValue({ error: null });
    await requestPasswordReset('ana@example.com');
    expect(mockReset).toHaveBeenCalledWith('ana@example.com', { redirectTo: 'oncocare://reset-password' });
  });

  it('verifies tokens specifically as recovery and requires a returned session', async () => {
    mockVerify.mockResolvedValue({ data: { session: {} }, error: null });
    await verifyRecoveryLink('synthetic');
    expect(mockVerify).toHaveBeenCalledWith({ token_hash: 'synthetic', type: 'recovery' });
    mockVerify.mockResolvedValue({ data: { session: null }, error: null });
    await expect(verifyRecoveryLink('synthetic')).rejects.toThrow('Recovery session missing');
  });

  it('verifies invite links specifically as invite and requires a returned session', async () => {
    mockVerify.mockResolvedValue({ data: { session: {} }, error: null });
    await verifyInviteLink('synthetic');
    expect(mockVerify).toHaveBeenCalledWith({ token_hash: 'synthetic', type: 'invite' });
    mockVerify.mockResolvedValue({ data: { session: null }, error: null });
    await expect(verifyInviteLink('synthetic')).rejects.toThrow('Invite session missing');
  });

  it('propagates expired-token errors', async () => {
    const error = new Error('expired');
    mockVerify.mockResolvedValue({ data: { session: null }, error });
    await expect(verifyRecoveryLink('synthetic')).rejects.toBe(error);
  });

  it('verifies email-change tokens without requiring a session on the first confirmation', async () => {
    mockVerify.mockResolvedValue({ data: { session: null }, error: null });
    await verifyEmailChangeLink('synthetic');
    expect(mockVerify).toHaveBeenCalledWith({ token_hash: 'synthetic', type: 'email_change' });
  });

  it('updates the password through Auth and signs out globally', async () => {
    mockUpdate.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    await updatePassword('synthetic-password');
    await signOut();
    expect(mockUpdate).toHaveBeenCalledWith({ password: 'synthetic-password' });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('propagates update and sign-out errors instead of claiming success', async () => {
    const error = new Error('offline');
    mockUpdate.mockResolvedValue({ error });
    mockSignOut.mockResolvedValue({ error });
    await expect(updatePassword('synthetic-password')).rejects.toBe(error);
    await expect(signOut()).rejects.toBe(error);
  });
});
