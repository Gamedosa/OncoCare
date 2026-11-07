import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithQuery } from '@/shared/query/testing';

import * as repository from './authRepository';
import { INVALID_CREDENTIALS_MESSAGE } from './authErrors';
import { LoginScreen } from './LoginScreen';

jest.mock('./authRepository', () => ({ signIn: jest.fn() }));
jest.mock('expo-router', () => ({ Link: ({ children }: { children: unknown }) => children }));

const signIn = jest.mocked(repository.signIn);

const renderLogin = () => renderWithQuery(<LoginScreen />);

describe('LoginScreen', () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it('validates fields before calling the server', async () => {
    await renderLogin();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe seu e-mail.')).toBeTruthy();
    expect(screen.getByText('Informe sua senha.')).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with trimmed credentials', async () => {
    signIn.mockResolvedValue(undefined);
    await renderLogin();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), ' ana@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'secret');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(signIn.mock.calls[0]?.[0]).toEqual({ email: 'ana@example.com', password: 'secret' });
  });

  it('shows a generic message when credentials are rejected', async () => {
    signIn.mockRejectedValue({ code: 'invalid_credentials', status: 400 });
    await renderLogin();

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(INVALID_CREDENTIALS_MESSAGE)).toBeTruthy();
  });
});
