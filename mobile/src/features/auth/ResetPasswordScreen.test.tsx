import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { renderWithQuery } from '@/shared/query/testing';

import * as repository from './authRepository';
import { ResetPasswordScreen } from './ResetPasswordScreen';

let mockStatus = 'signedOut';
let mockParams: { token_hash?: string; type?: string };
const mockReplace = jest.fn();
const mockSetParams = jest.fn();
const mockRouter = { replace: mockReplace, setParams: mockSetParams };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('./AuthProvider', () => ({ useAuth: () => ({ status: mockStatus }) }));
jest.mock('./authRepository', () => ({
  verifyRecoveryLink: jest.fn(), updatePassword: jest.fn(),
  signOut: jest.fn(),
}));
const verify = jest.mocked(repository.verifyRecoveryLink);
const update = jest.mocked(repository.updatePassword);
const signOut = jest.mocked(repository.signOut);

async function openForm() {
  await renderWithQuery(<ResetPasswordScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Validar link de recuperação' }));
  await screen.findByLabelText('Nova senha');
}

async function enterPasswords(password: string, confirmation = password) {
  await fireEvent.changeText(screen.getByLabelText('Nova senha'), password);
  await fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), confirmation);
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockStatus = 'signedOut';
    mockParams = { token_hash: 'synthetic-token', type: 'recovery' };
    verify.mockImplementation(async () => { mockStatus = 'passwordRecovery'; });
    update.mockResolvedValue(undefined);
    signOut.mockImplementation(async () => { mockStatus = 'signedOut'; });
  });

  it('does not consume the link automatically and removes sensitive route params', async () => {
    await renderWithQuery(<ResetPasswordScreen />);
    expect(verify).not.toHaveBeenCalled();
    expect(mockSetParams).toHaveBeenCalledWith({ token_hash: undefined, type: undefined });
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Validar link de recuperação' }));
    expect(await screen.findByLabelText('Nova senha')).toBeTruthy();
    expect(verify).toHaveBeenCalledWith('synthetic-token');
  });

  it('does not trust an ordinary login session or a missing token', async () => {
    mockParams = {};
    mockStatus = 'signedIn';
    await renderWithQuery(<ResetPasswordScreen />);
    expect(screen.getByText(/Link de recuperação inválido/)).toBeTruthy();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('shows a neutral expired/used link error', async () => {
    verify.mockRejectedValue(new Error('synthetic server detail'));
    await renderWithQuery(<ResetPasswordScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Validar link de recuperação' }));
    expect(await screen.findByText('Link inválido, expirado ou já utilizado. Solicite novas instruções de recuperação.')).toBeTruthy();
    expect(screen.queryByText('synthetic server detail')).toBeNull();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });

  it('validates length and confirmation before updating the password', async () => {
    await openForm();
    await enterPasswords('short');
    expect(await screen.findByText('Use pelo menos 6 caracteres.')).toBeTruthy();
    await enterPasswords('synthetic-password', 'different');
    expect(await screen.findByText('As senhas não coincidem.')).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('updates, clears the password fields and requires a fresh login after global sign-out', async () => {
    await openForm();
    await enterPasswords('synthetic-password');
    expect(await screen.findByText('Senha redefinida. Entre novamente com sua nova senha.')).toBeTruthy();
    expect(update.mock.calls[0]?.[0]).toBe('synthetic-password');
    expect(signOut).toHaveBeenCalled();
    expect(screen.queryByDisplayValue('synthetic-password')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao login' }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('keeps global sign-out failures explicit and retries only sign-out', async () => {
    signOut.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    await openForm();
    await enterPasswords('synthetic-password');
    expect(await screen.findByText('Não foi possível encerrar as sessões. Tente novamente.')).toBeTruthy();
    expect(screen.queryByText('Senha redefinida. Entre novamente com sua nova senha.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir e encerrar sessões' }));
    expect(await screen.findByText('Senha redefinida. Entre novamente com sua nova senha.')).toBeTruthy();
    expect(update).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  it('shows network update failures without claiming completion', async () => {
    update.mockRejectedValue(new TypeError('Network request failed'));
    await openForm();
    await enterPasswords('synthetic-password');
    expect(await screen.findByText('Não foi possível conectar. Verifique sua internet e tente novamente.')).toBeTruthy();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('accepts a new deep link while the same screen is already open', async () => {
    mockParams = {};
    const { rerender, client } = await renderWithQuery(<ResetPasswordScreen />);
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    mockParams = { token_hash: 'another-synthetic-token', type: 'recovery' };
    await rerender(<QueryClientProvider client={client}><ResetPasswordScreen /></QueryClientProvider>);
    await fireEvent.press(screen.getByRole('button', { name: 'Validar link de recuperação' }));
    expect(await screen.findByLabelText('Nova senha')).toBeTruthy();
    expect(verify).toHaveBeenCalledWith('another-synthetic-token');
  });

  it('requires session cleanup before requesting a fresh link', async () => {
    signOut.mockRejectedValueOnce(new Error('offline'));
    await openForm();
    await fireEvent.press(screen.getByRole('button', { name: 'Solicitar outro link' }));
    expect(await screen.findByText('Não foi possível encerrar a sessão. Tente novamente.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Solicitar outro link' }));
    expect(mockReplace).toHaveBeenCalledWith('/forgot-password');
  });
});
