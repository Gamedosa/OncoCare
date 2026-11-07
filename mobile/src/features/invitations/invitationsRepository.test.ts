import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { acceptInvitation, invitePatient, listMyInvitations, listSentInvitations } from './invitationsRepository';
import { InvitationError } from './schemas';

const mockInvoke = jest.fn<(...args: unknown[]) => Promise<{ error: unknown }>>();
const mockRpc = jest.fn<(...args: unknown[]) => Promise<{ data?: unknown; error: unknown }>>();
const mockOrder = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('expo-linking', () => ({ createURL: (path: string) => `oncocare://${path.slice(1)}` }));
jest.mock('@supabase/supabase-js', () => {
  class MockFunctionsHttpError extends Error {
    context: unknown;

    constructor(context: unknown) {
      super('Edge Function returned a non-2xx status code');
      this.context = context;
    }
  }
  return { FunctionsHttpError: MockFunctionsHttpError };
});
jest.mock('@/shared/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const { FunctionsHttpError } = jest.requireMock<{ FunctionsHttpError: new (context: unknown) => Error }>(
  '@supabase/supabase-js',
);

describe('invitationsRepository', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls the Edge Function with the accept-invite callback', async () => {
    mockInvoke.mockResolvedValue({ error: null });
    await invitePatient({ name: 'Ana', email: 'ana@example.test' });
    expect(mockInvoke).toHaveBeenCalledWith('invite-patient', {
      body: { name: 'Ana', email: 'ana@example.test', redirectTo: 'oncocare://accept-invite' },
    });
  });

  it('turns HTTP error bodies into known invitation codes only', async () => {
    mockInvoke.mockResolvedValue({ error: new FunctionsHttpError(new Response(JSON.stringify({ error: 'already_linked' }))) });
    await expect(invitePatient({ name: 'Ana', email: 'ana@example.test' })).rejects.toMatchObject({ code: 'already_linked' });
    mockInvoke.mockResolvedValue({ error: new FunctionsHttpError(new Response('<html>')) });
    await expect(invitePatient({ name: 'Ana', email: 'ana@example.test' })).rejects.toMatchObject({ code: 'internal' });
    mockInvoke.mockResolvedValue({ error: new FunctionsHttpError(new Response(JSON.stringify({ error: 'drop table' }))) });
    await expect(invitePatient({ name: 'Ana', email: 'ana@example.test' })).rejects.toMatchObject({ code: 'internal' });
  });

  it('propagates network failures unchanged', async () => {
    const error = Object.assign(new Error('Failed to send a request'), { name: 'FunctionsFetchError' });
    mockInvoke.mockResolvedValue({ error });
    await expect(invitePatient({ name: 'Ana', email: 'ana@example.test' })).rejects.toBe(error);
  });

  it('lists only pending invitations sent by the psychologist', async () => {
    const query = { eq: mockEq, order: mockOrder };
    mockFrom.mockReturnValue({ select: () => query });
    mockEq.mockReturnValue(query);
    mockOrder.mockResolvedValue({
      data: [{
        id: '00000000-0000-4000-8000-000000000001', email: 'ana@example.test', patient_name: 'Ana',
        expires_at: '2026-11-14T10:00:00.123456+00:00', created_at: '2026-11-07T10:00:00+00:00',
      }],
      error: null,
    });
    const [invitation] = await listSentInvitations('psi');
    expect(mockFrom).toHaveBeenCalledWith('patient_invitations');
    expect(mockEq).toHaveBeenCalledWith('psychologist_id', 'psi');
    expect(mockEq).toHaveBeenCalledWith('status', 'pending');
    expect(invitation?.expiresAt.toISOString()).toBe('2026-11-14T10:00:00.123Z');
  });

  it('maps unavailable invitations and keeps the psychologist name optional', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'invitation_unavailable', code: 'P0002' } });
    await expect(acceptInvitation('id')).rejects.toBeInstanceOf(InvitationError);
    expect(mockRpc).toHaveBeenCalledWith('accept_patient_invitation', { p_invitation_id: 'id' });

    mockRpc.mockResolvedValue({
      data: [{ id: '00000000-0000-4000-8000-000000000001', psychologist_name: ' ', expires_at: '2026-11-14T10:00:00Z',
        created_at: '2026-11-07T10:00:00Z' }],
      error: null,
    });
    const [received] = await listMyInvitations();
    expect(received?.psychologistName).toBeNull();
  });
});
