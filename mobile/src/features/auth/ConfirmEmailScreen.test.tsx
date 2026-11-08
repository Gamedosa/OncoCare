import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQuery } from '@/shared/query/testing';
import * as repository from './authRepository';
import { ConfirmEmailScreen } from './ConfirmEmailScreen';

let mockParams: { token_hash?: string; type?: string };
const mockSetParams = jest.fn();
const mockReplace = jest.fn();
jest.mock('./authRepository', () => ({ verifyEmailChangeLink: jest.fn() }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: mockSetParams, replace: mockReplace }),
}));
const verify = jest.mocked(repository.verifyEmailChangeLink);
describe('email change callback', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { token_hash: 'synthetic-token', type: 'email_change' };
    verify.mockResolvedValue(undefined);
  });
  it('requires explicit confirmation and removes the token from route params', async () => {
    await renderWithQuery(<ConfirmEmailScreen />);
    expect(verify).not.toHaveBeenCalled();
    expect(mockSetParams).toHaveBeenCalledWith({ token_hash: undefined, type: undefined });
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar alteração de e-mail' }));
    await waitFor(() => expect(verify).toHaveBeenCalledWith('synthetic-token'));
    expect(await screen.findByText(/Link confirmado/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirmar alteração de e-mail' })).toBeNull();
  });
  it('rejects incorrect link types before calling Auth', async () => {
    mockParams = { token_hash: 'synthetic-token', type: 'recovery' };
    await renderWithQuery(<ConfirmEmailScreen />);
    expect(screen.getByText(/Link de confirmação inválido/)).toBeTruthy();
    expect(verify).not.toHaveBeenCalled();
  });
  it('reports expired links without exposing tokens', async () => {
    verify.mockRejectedValue(new Error('expired'));
    await renderWithQuery(<ConfirmEmailScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar alteração de e-mail' }));
    expect(await screen.findByText(/Não foi possível confirmar/)).toBeTruthy();
    expect(screen.queryByText('synthetic-token')).toBeNull();
  });
});
