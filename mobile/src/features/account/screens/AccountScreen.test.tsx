import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as authRepository from '@/features/auth/authRepository';
import type { Profile } from '@/features/auth/schemas';
import { renderWithQuery } from '@/shared/query/testing';

import * as accountRepository from '../accountRepository';
import { AccountScreen } from './AccountScreen';

let mockProfile: Profile;

jest.mock('@/features/auth/AuthProvider', () => ({ useSignedInAuth: () => ({ profile: mockProfile }) }));
jest.mock('@/features/auth/authRepository', () => ({ signOut: jest.fn() }));
jest.mock('../accountRepository', () => ({ getLinkedPsychologist: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

const getLinkedPsychologist = jest.mocked(accountRepository.getLinkedPsychologist);
const signOut = jest.mocked(authRepository.signOut);

const PATIENT = '00000000-0000-4000-8000-000000000001';

describe('AccountScreen', () => {
  beforeEach(() => {
    getLinkedPsychologist.mockReset();
    signOut.mockReset();
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

    expect(await screen.findByText('Nenhum psicólogo vinculado')).toBeTruthy();
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
