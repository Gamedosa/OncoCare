import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as authRepository from '@/features/auth/authRepository';
import type { Profile } from '@/features/auth/schemas';
import * as linksRepository from '@/features/links/linksRepository';
import { renderWithQuery } from '@/shared/query/testing';

import * as accountRepository from '../accountRepository';
import { AccountScreen } from './AccountScreen';

let mockProfile: Profile;
const mockPush = jest.fn();

jest.mock('@/features/auth/AuthProvider', () => ({ useSignedInAuth: () => ({ profile: mockProfile }) }));
jest.mock('@/features/auth/authRepository', () => ({ signOut: jest.fn() }));
jest.mock('../accountRepository', () => ({
  getLinkedPsychologist: jest.fn(),
  getAccountContact: jest.fn<() => Promise<{ email: string; pendingEmail: null }>>()
    .mockResolvedValue({ email: 'synthetic@example.test', pendingEmail: null }),
  updateDisplayName: jest.fn(), requestEmailChange: jest.fn(),
}));
jest.mock('@/features/links/linksRepository', () => ({ unlinkPatient: jest.fn() }));
jest.mock('@/features/patients/patientsRepository', () => ({ listLinkedPatients: jest.fn() }));
jest.mock('@/features/diary/diaryRepository', () => ({}));
jest.mock('@/features/notifications/notificationsRepository', () => ({
  countUnreadNotifications: jest.fn<() => Promise<number>>().mockResolvedValue(2),
}));
jest.mock('../deletionRepository', () => ({
  deleteOwnAccount: jest.fn(), AccountDeletionError: class extends Error {},
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: mockPush }) }));

const getLinkedPsychologist = jest.mocked(accountRepository.getLinkedPsychologist);
const signOut = jest.mocked(authRepository.signOut);
const unlinkPatient = jest.mocked(linksRepository.unlinkPatient);

const PATIENT = '00000000-0000-4000-8000-000000000001';

describe('AccountScreen', () => {
  beforeEach(() => {
    getLinkedPsychologist.mockReset();
    signOut.mockReset();
    unlinkPatient.mockReset();
    mockPush.mockReset();
    mockProfile = { id: PATIENT, role: 'patient', displayName: 'Ana' };
  });

  it('shows the patient profile, linked psychologist and privacy summary', async () => {
    getLinkedPsychologist.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000009', displayName: 'Dra. Paula' });
    await renderWithQuery(<AccountScreen />);

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Paciente')).toBeTruthy();
    expect(await screen.findByText('Dra. Paula')).toBeTruthy();
    expect(screen.getByText('Privacidade')).toBeTruthy();
    expect(getLinkedPsychologist).toHaveBeenCalledWith(PATIENT);
  });

  it('tells the patient when no psychologist is linked', async () => {
    getLinkedPsychologist.mockResolvedValue(null);
    await renderWithQuery(<AccountScreen />);

    expect(await screen.findByText('Sem vínculo com psicólogo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Encerrar vínculo' })).toBeNull();
  });

  it('opens the terms preview from the patient account', async () => {
    getLinkedPsychologist.mockResolvedValue(null);
    await renderWithQuery(<AccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ver termos de uso (prévia)' }));
    expect(mockPush).toHaveBeenCalledWith('/patient/terms');
  });

  it('opens the terms preview from the psychologist account', async () => {
    mockProfile = { id: '00000000-0000-4000-8000-000000000009', role: 'psychologist', displayName: null };
    await renderWithQuery(<AccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ver termos de uso (prévia)' }));
    expect(mockPush).toHaveBeenCalledWith('/psychologist/terms');
  });

  it('requires confirmation, unlinks the displayed psychologist and keeps the diary', async () => {
    const psychologistId = '00000000-0000-4000-8000-000000000009';
    getLinkedPsychologist.mockResolvedValueOnce({ id: psychologistId, displayName: 'Dra. Paula' })
      .mockResolvedValue(null);
    unlinkPatient.mockResolvedValue(undefined);
    await renderWithQuery(<AccountScreen />);
    await screen.findByText('Dra. Paula');
    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar vínculo' }));
    expect(unlinkPatient).not.toHaveBeenCalled();
    expect(screen.getByText(/Seus registros continuam disponíveis/)).toBeTruthy();
    const cancelButtons = screen.getAllByRole('button', { name: 'Voltar' });
    await fireEvent.press(cancelButtons[cancelButtons.length - 1]!);
    expect(unlinkPatient).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar vínculo' }));
    const buttons = screen.getAllByRole('button', { name: 'Encerrar vínculo' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() => expect(unlinkPatient.mock.calls[0]?.[0]).toEqual({ patientId: PATIENT, psychologistId }));
    expect(await screen.findByText('Vínculo encerrado. Seu diário continua disponível para você.')).toBeTruthy();
    expect(await screen.findByText('Sem vínculo com psicólogo')).toBeTruthy();
  });

  it('shows an error when the link changed', async () => {
    getLinkedPsychologist.mockResolvedValue({ id: 'old', displayName: 'Dra. Paula' });
    unlinkPatient.mockRejectedValue({ code: 'P0002' });
    await renderWithQuery(<AccountScreen />);
    await screen.findByText('Dra. Paula');
    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar vínculo' }));
    const buttons = screen.getAllByRole('button', { name: 'Encerrar vínculo' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    expect(await screen.findByText(/Este vínculo não está mais disponível/)).toBeTruthy();
  });
  it.each(['patient', 'psychologist'] as const)('opens notifications for %s', async (role) => {
    mockProfile = { id: PATIENT, role, displayName: null };
    getLinkedPsychologist.mockResolvedValue(null);
    await renderWithQuery(<AccountScreen />);
    expect(await screen.findByText('2 não lida(s)')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver notificações' }));
    expect(mockPush).toHaveBeenCalledWith(`/${role}/notifications`);
  });

  it('does not look up a link for psychologists and signs out', async () => {
    mockProfile = { id: '00000000-0000-4000-8000-000000000009', role: 'psychologist', displayName: null };
    let completeSignOut: (() => void) | undefined;
    signOut.mockImplementation(() => new Promise<void>((resolve) => {
      completeSignOut = resolve;
    }));
    await renderWithQuery(<AccountScreen />);

    expect(screen.getByText('Psicólogo(a)')).toBeTruthy();
    expect(screen.getByText('Não informado')).toBeTruthy();
    expect(screen.queryByText('Psicólogo vinculado')).toBeNull();
    expect(getLinkedPsychologist).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { busy: true })).toBeTruthy());
    await act(async () => {
      completeSignOut?.();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sair' }).props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    }));
  });
});
