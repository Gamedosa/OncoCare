import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQuery } from '@/shared/query/testing';
import * as repository from '../deletionRepository';
import * as authRepository from '@/features/auth/authRepository';
import { DeleteAccountPanel } from './DeleteAccountPanel';

jest.mock('../deletionRepository', () => ({
  deleteOwnAccount: jest.fn(),
  AccountDeletionError: class extends Error {
    code: string;
    constructor(code: string) { super(code); this.code = code; }
  },
}));
jest.mock('@/features/auth/authRepository', () => ({ signOutLocally: jest.fn() }));
const deleteAccount = jest.mocked(repository.deleteOwnAccount);
const signOut = jest.mocked(authRepository.signOutLocally);

describe('account deletion panel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    deleteAccount.mockResolvedValue(undefined);
    signOut.mockResolvedValue(undefined);
  });
  async function openConfirmation() {
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await fireEvent.changeText(screen.getByLabelText('Senha atual'), 'synthetic-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
  }
  it('requires the current password and explicit confirmation before deleting', async () => {
    await renderWithQuery(<DeleteAccountPanel role="patient" />);
    await openConfirmation();
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Excluir sua conta permanentemente?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir permanentemente' }));
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith('synthetic-password'));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(screen.getByText(/Conta excluída/)).toBeTruthy();
  });
  it('does not delete when the user cancels', async () => {
    await renderWithQuery(<DeleteAccountPanel role="patient" />);
    await openConfirmation();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(deleteAccount).not.toHaveBeenCalled();
  });
  it('preserves psychologist patients and their entries in the warning', async () => {
    await renderWithQuery(<DeleteAccountPanel role="psychologist" />);
    expect(screen.getByText(/todos os relatos delas serão preservados/)).toBeTruthy();
  });
  it('displays wrong-password errors and clears the password field', async () => {
    deleteAccount.mockRejectedValue(new repository.AccountDeletionError('invalid_password'));
    await renderWithQuery(<DeleteAccountPanel role="patient" />);
    await openConfirmation();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir permanentemente' }));
    expect(await screen.findByText(/Senha incorreta/)).toBeTruthy();
    expect(screen.getByLabelText('Senha atual').props.value).toBe('');
    expect(signOut).not.toHaveBeenCalled();
  });
  it('retries local sign-out without repeating account deletion', async () => {
    signOut.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    await renderWithQuery(<DeleteAccountPanel role="patient" />);
    await openConfirmation();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir permanentemente' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Encerrar sessão' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(2));
    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });
  it('offers completion of a previously started deletion', async () => {
    await renderWithQuery(<DeleteAccountPanel role="patient" pending />);
    expect(screen.getByLabelText('Senha atual')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Concluir exclusão' }).props.accessibilityState.disabled).toBe(true);
  });
});
