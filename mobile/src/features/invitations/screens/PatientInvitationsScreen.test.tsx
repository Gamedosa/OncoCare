import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as accountRepository from '@/features/account/accountRepository';
import { renderWithQuery } from '@/shared/query/testing';

import * as repository from '../invitationsRepository';
import { InvitationError } from '../schemas';
import { PatientInvitationsScreen } from './PatientInvitationsScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useSignedInAuth: () => ({ profile: { id: 'synthetic-patient', role: 'patient', displayName: 'Ana' } }),
}));
jest.mock('@/features/account/accountRepository', () => ({ getLinkedPsychologist: jest.fn() }));
jest.mock('../invitationsRepository', () => ({
  listMyInvitations: jest.fn(), acceptInvitation: jest.fn(), declineInvitation: jest.fn(),
}));
const linked = jest.mocked(accountRepository.getLinkedPsychologist);
const list = jest.mocked(repository.listMyInvitations);
const accept = jest.mocked(repository.acceptInvitation);
const decline = jest.mocked(repository.declineInvitation);

const invitation = {
  id: '00000000-0000-4000-8000-000000000001',
  psychologistName: 'Dra. Clara',
  expiresAt: new Date(Date.now() + 86_400_000),
};

async function pressLast(name: string) {
  const buttons = screen.getAllByRole('button', { name });
  await fireEvent.press(buttons[buttons.length - 1]!);
}

describe('PatientInvitationsScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    linked.mockResolvedValue(null);
    list.mockResolvedValue([invitation]);
    accept.mockResolvedValue(undefined);
    decline.mockResolvedValue(undefined);
  });

  it('explains read-only access and accepts only after confirmation', async () => {
    await renderWithQuery(<PatientInvitationsScreen />);
    expect(await screen.findByText('Dra. Clara')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar' }));
    expect(accept).not.toHaveBeenCalled();
    expect(screen.getByText('Dra. Clara poderá ler e ouvir seus relatos, sem editá-los.')).toBeTruthy();
    await pressLast('Aceitar');
    await waitFor(() => expect(accept.mock.calls[0]?.[0]).toBe(invitation.id));
    expect(await screen.findByText('Convite aceito. O acompanhamento começou.')).toBeTruthy();
  });

  it('warns that accepting replaces the current psychologist', async () => {
    linked.mockResolvedValue({ id: 'synthetic-old', displayName: 'Dr. Paulo' });
    await renderWithQuery(<PatientInvitationsScreen />);
    expect(await screen.findByText(/substitui o acompanhamento atual com Dr. Paulo/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar' }));
    expect(screen.getByText(/Dr. Paulo deixará de ter acesso aos seus relatos/)).toBeTruthy();
  });

  it('declines without affecting the diary', async () => {
    await renderWithQuery(<PatientInvitationsScreen />);
    await screen.findByText('Dra. Clara');
    await fireEvent.press(screen.getByRole('button', { name: 'Recusar' }));
    await pressLast('Recusar');
    await waitFor(() => expect(decline.mock.calls[0]?.[0]).toBe(invitation.id));
    expect(await screen.findByText('Convite recusado.')).toBeTruthy();
  });

  it('shows a clear message when the invitation is no longer available', async () => {
    accept.mockRejectedValue(new InvitationError('invitation_unavailable'));
    await renderWithQuery(<PatientInvitationsScreen />);
    await screen.findByText('Dra. Clara');
    await fireEvent.press(screen.getByRole('button', { name: 'Aceitar' }));
    await pressLast('Aceitar');
    expect(await screen.findByText('Este convite não está mais disponível.')).toBeTruthy();
  });

  it('shows an empty state without pending invitations', async () => {
    list.mockResolvedValue([]);
    await renderWithQuery(<PatientInvitationsScreen />);
    expect(await screen.findByText('Nenhum convite pendente.')).toBeTruthy();
  });
});
