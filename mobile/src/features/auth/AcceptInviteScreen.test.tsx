import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithQuery } from '@/shared/query/testing';

import { AcceptInviteScreen } from './AcceptInviteScreen';
import * as repository from './authRepository';

let mockAuth: { status: string; profile?: { role: string } };
let mockParams: { token_hash?: string; type?: string };
const mockReplace = jest.fn();
const mockSetParams = jest.fn();
const mockRouter = { replace: mockReplace, setParams: mockSetParams };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('./AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('./authRepository', () => ({ verifyInviteLink: jest.fn(), updatePassword: jest.fn() }));
const verify = jest.mocked(repository.verifyInviteLink);
const update = jest.mocked(repository.updatePassword);

async function openForm() {
  await renderWithQuery(<AcceptInviteScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Validar convite' }));
  await screen.findByLabelText('Senha');
}

describe('AcceptInviteScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockAuth = { status: 'signedOut' };
    mockParams = { token_hash: 'synthetic-token', type: 'invite' };
    verify.mockImplementation(async () => { mockAuth = { status: 'signedIn', profile: { role: 'patient' } }; });
    update.mockResolvedValue(undefined);
  });

  it('waits for an explicit tap and removes the token from the URL', async () => {
    await renderWithQuery(<AcceptInviteScreen />);
    expect(verify).not.toHaveBeenCalled();
    expect(mockSetParams).toHaveBeenCalledWith({ token_hash: undefined, type: undefined });
    await fireEvent.press(screen.getByRole('button', { name: 'Validar convite' }));
    expect(await screen.findByLabelText('Senha')).toBeTruthy();
    expect(verify).toHaveBeenCalledWith('synthetic-token');
  });

  it('rejects links from other auth flows', async () => {
    mockParams = { token_hash: 'synthetic-token', type: 'recovery' };
    await renderWithQuery(<AcceptInviteScreen />);
    expect(screen.queryByRole('button', { name: 'Validar convite' })).toBeNull();
    expect(screen.getByText(/Link de convite inválido/)).toBeTruthy();
  });

  it('warns that an existing session will be replaced', async () => {
    mockAuth = { status: 'signedIn', profile: { role: 'psychologist' } };
    await renderWithQuery(<AcceptInviteScreen />);
    expect(screen.getByText(/sessão atual neste dispositivo será substituída/)).toBeTruthy();
  });

  it('shows a neutral error for expired invites', async () => {
    verify.mockRejectedValue(new Error('expired'));
    await renderWithQuery(<AcceptInviteScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Validar convite' }));
    expect(await screen.findByText(/Convite inválido, expirado ou já utilizado/)).toBeTruthy();
    expect(screen.queryByLabelText('Senha')).toBeNull();
  });

  it('validates the password before calling Auth', async () => {
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'abcdef');
    await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'abcdeg');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar senha' }));
    expect(await screen.findByText('As senhas não coincidem.')).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('creates the password and leads the patient to the invitation', async () => {
    await openForm();
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'synthetic-password');
    await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'synthetic-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar senha' }));
    expect(update.mock.calls[0]?.[0]).toBe('synthetic-password');
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver convite' }));
    expect(mockReplace).toHaveBeenCalledWith('/patient/invitations');
  });
});
