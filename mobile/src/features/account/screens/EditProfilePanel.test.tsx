import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQuery } from '@/shared/query/testing';
import * as repository from '../accountRepository';
import { EditProfilePanel } from './EditProfilePanel';

jest.mock('@/features/auth/AuthProvider', () => ({ profileQueryKey: (id: string) => ['profile', id] }));
jest.mock('../accountRepository', () => ({
  getAccountContact: jest.fn(), updateDisplayName: jest.fn(), requestEmailChange: jest.fn(),
}));
const contact = jest.mocked(repository.getAccountContact);
const updateName = jest.mocked(repository.updateDisplayName);
const changeEmail = jest.mocked(repository.requestEmailChange);
const profile = { id: '00000000-0000-4000-8000-000000000001', role: 'patient', displayName: 'Nome fictício' } as const;

describe('editing profile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    contact.mockResolvedValue({ email: 'synthetic@example.test', pendingEmail: null });
    updateName.mockResolvedValue({ ...profile, displayName: 'Novo nome' });
    changeEmail.mockResolvedValue({ email: 'synthetic@example.test', pendingEmail: 'new@example.test' });
  });
  it('saves the trimmed name and updates the cached profile', async () => {
    const { client } = await renderWithQuery(<EditProfilePanel profile={profile} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), ' Novo nome ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nome' }));
    await waitFor(() => expect(updateName.mock.calls[0]?.slice(0, 2)).toEqual([profile.id, 'Novo nome']));
    expect(await screen.findByText('Nome atualizado.')).toBeTruthy();
    expect(client.getQueryData(['profile', profile.id])).toEqual({ ...profile, displayName: 'Novo nome' });
  });
  it('validates name and e-mail before requesting a change', async () => {
    await renderWithQuery(<EditProfilePanel profile={profile} />);
    await screen.findByText('E-mail: synthetic@example.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), ' ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(screen.getByText('Informe seu nome.')).toBeTruthy();
    expect(updateName).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Novo e-mail'), 'invalid');
    await fireEvent.press(screen.getByRole('button', { name: 'Solicitar troca de e-mail' }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(changeEmail).not.toHaveBeenCalled();
  });
  it('keeps the current login e-mail until confirmation', async () => {
    await renderWithQuery(<EditProfilePanel profile={profile} />);
    await screen.findByText('E-mail: synthetic@example.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    await fireEvent.changeText(screen.getByLabelText('Novo e-mail'), ' new@example.test ');
    await fireEvent.press(screen.getByRole('button', { name: 'Solicitar troca de e-mail' }));
    await waitFor(() => expect(changeEmail.mock.calls[0]?.[0]).toBe('new@example.test'));
    expect(await screen.findByText(/Solicitação enviada/)).toBeTruthy();
    expect(screen.getByText('E-mail: synthetic@example.test')).toBeTruthy();
    expect(screen.getByText(/Alteração aguardando confirmação: new@example.test/)).toBeTruthy();
  });
  it('shows save failures and allows retry', async () => {
    updateName.mockRejectedValueOnce(new Error('offline'));
    await renderWithQuery(<EditProfilePanel profile={{ ...profile, role: 'psychologist' }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Novo nome');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText(/Não foi possível salvar seu nome/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(await screen.findByText('Nome atualizado.')).toBeTruthy();
  });
  it('can still edit the name if e-mail lookup fails', async () => {
    contact.mockRejectedValue(new Error('offline'));
    await renderWithQuery(<EditProfilePanel profile={profile} />);
    await screen.findByText('Não foi possível carregar seu e-mail.');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    expect(screen.getByLabelText('Nome de exibição')).toBeTruthy();
    expect(screen.queryByLabelText('Novo e-mail')).toBeNull();
  });

  it('keeps the current email and shows failures without claiming a pending change', async () => {
    changeEmail.mockRejectedValue(new Error('rate limited'));
    await renderWithQuery(<EditProfilePanel profile={profile} />);
    await screen.findByText('E-mail: synthetic@example.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    await fireEvent.changeText(screen.getByLabelText('Novo e-mail'), 'new@example.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Solicitar troca de e-mail' }));
    expect(await screen.findByText(/Não foi possível solicitar a troca/)).toBeTruthy();
    expect(screen.getByText('E-mail: synthetic@example.test')).toBeTruthy();
    expect(screen.queryByText(/Solicitação enviada/)).toBeNull();
  });
});
