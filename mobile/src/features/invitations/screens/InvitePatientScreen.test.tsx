import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithQuery } from '@/shared/query/testing';

import * as repository from '../invitationsRepository';
import { InvitationError } from '../schemas';
import { InvitePatientScreen } from './InvitePatientScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useSignedInAuth: () => ({ profile: { id: 'synthetic-psychologist', role: 'psychologist', displayName: 'Psi' } }),
}));
jest.mock('@/features/account/accountRepository', () => ({}));
jest.mock('../invitationsRepository', () => ({
  invitePatient: jest.fn(), listSentInvitations: jest.fn(), revokeInvitation: jest.fn(),
}));
const invite = jest.mocked(repository.invitePatient);
const list = jest.mocked(repository.listSentInvitations);
const revoke = jest.mocked(repository.revokeInvitation);

const pending = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'bia@example.test',
  patientName: 'Bia',
  expiresAt: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
};

async function fill(name: string, email: string) {
  await fireEvent.changeText(screen.getByLabelText('Nome da paciente'), name);
  await fireEvent.changeText(screen.getByLabelText('E-mail da paciente'), email);
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar convite' }));
}

describe('InvitePatientScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    invite.mockResolvedValue(undefined);
    list.mockResolvedValue([]);
    revoke.mockResolvedValue(undefined);
  });

  it('validates before sending', async () => {
    await renderWithQuery(<InvitePatientScreen />);
    await fill(' ', 'nao-e-email');
    expect(await screen.findByText('Informe o nome da paciente.')).toBeTruthy();
    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(invite).not.toHaveBeenCalled();
  });

  it('sends a normalized invite and shows a neutral confirmation', async () => {
    await renderWithQuery(<InvitePatientScreen />);
    await fill(' Ana ', ' Ana@Example.test ');
    expect(invite.mock.calls[0]?.[0]).toEqual({ name: 'Ana', email: 'ana@example.test' });
    expect(await screen.findByText(/O vínculo só começa quando ela aceitar/)).toBeTruthy();
  });

  it('explains known failures', async () => {
    invite.mockRejectedValue(new InvitationError('already_linked'));
    await renderWithQuery(<InvitePatientScreen />);
    await fill('Ana', 'ana@example.test');
    expect(await screen.findByText('Esta paciente já está vinculada a você.')).toBeTruthy();
  });

  it('lists pending invitations and allows resending', async () => {
    list.mockResolvedValue([pending]);
    await renderWithQuery(<InvitePatientScreen />);
    expect(await screen.findByText('bia@example.test')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reenviar' }));
    expect(invite.mock.calls[0]?.[0]).toEqual({ name: 'Bia', email: 'bia@example.test' });
    expect(await screen.findByText('Convite reenviado.')).toBeTruthy();
  });

  it('marks expired invitations', async () => {
    list.mockResolvedValue([{ ...pending, expiresAt: new Date(Date.now() - 1000) }]);
    await renderWithQuery(<InvitePatientScreen />);
    expect(await screen.findByText('Convite expirado')).toBeTruthy();
  });

  it('revokes only after confirmation', async () => {
    list.mockResolvedValue([pending]);
    await renderWithQuery(<InvitePatientScreen />);
    await screen.findByText('bia@example.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar convite' }));
    expect(revoke).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button', { name: 'Cancelar convite' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() => expect(revoke.mock.calls[0]?.[0]).toBe(pending.id));
  });
});
