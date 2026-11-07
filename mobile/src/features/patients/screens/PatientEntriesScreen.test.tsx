import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as diaryRepository from '@/features/diary/diaryRepository';
import * as linksRepository from '@/features/links/linksRepository';
import { renderWithQuery } from '@/shared/query/testing';

import * as patientsRepository from '../patientsRepository';
import { PatientEntriesScreen } from './PatientEntriesScreen';

const PSYCHOLOGIST = '00000000-0000-4000-8000-000000000009';
const PATIENT = '00000000-0000-4000-8000-000000000001';
const mockReplace = jest.fn();

jest.mock('@/features/auth/AuthProvider', () => ({
  useSignedInAuth: () => ({ profile: { id: '00000000-0000-4000-8000-000000000009', role: 'psychologist' } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => ({ patientId: '00000000-0000-4000-8000-000000000001' }),
}));
jest.mock('../patientsRepository', () => ({ listLinkedPatients: jest.fn() }));
jest.mock('@/features/diary/diaryRepository', () => ({ listEntries: jest.fn() }));
jest.mock('@/features/links/linksRepository', () => ({ unlinkPatient: jest.fn() }));
jest.mock('@/features/account/accountRepository', () => ({ getLinkedPsychologist: jest.fn() }));

const listLinkedPatients = jest.mocked(patientsRepository.listLinkedPatients);
const listEntries = jest.mocked(diaryRepository.listEntries);
const unlinkPatient = jest.mocked(linksRepository.unlinkPatient);

describe('PatientEntriesScreen', () => {
  beforeEach(() => {
    listLinkedPatients.mockReset();
    listEntries.mockReset();
    unlinkPatient.mockReset();
    mockReplace.mockReset();
    listEntries.mockResolvedValue({
      entries: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          patientId: PATIENT,
          content: 'Dia tranquilo.',
          mood: 4,
          hasAudio: false,
          audioPath: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      nextPage: null,
    });
  });

  it('shows the linked patient entries as read-only', async () => {
    listLinkedPatients.mockResolvedValue([{ id: PATIENT, displayName: 'Ana', lastEntryAt: new Date() }]);
    await renderWithQuery(<PatientEntriesScreen />);

    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText('Visualização somente leitura')).toBeTruthy();
    expect(await screen.findByText('Dia tranquilo.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Novo relato' })).toBeNull();
    expect(listLinkedPatients).toHaveBeenCalledWith(PSYCHOLOGIST);
    expect(listEntries).toHaveBeenCalledWith(PATIENT, 0);
  });

  it('shows a neutral message when the patient is no longer linked', async () => {
    listLinkedPatients.mockResolvedValue([]);
    await renderWithQuery(<PatientEntriesScreen />);

    expect(await screen.findByText('Este conteúdo não está mais disponível para você.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar para pacientes' })).toBeTruthy();
    expect(screen.queryByText('Dia tranquilo.')).toBeNull();
  });

  it('confirms unlinking before revoking access and returning to the list', async () => {
    listLinkedPatients.mockResolvedValueOnce([{ id: PATIENT, displayName: 'Ana', lastEntryAt: null }])
      .mockResolvedValue([]);
    unlinkPatient.mockResolvedValue(undefined);
    await renderWithQuery(<PatientEntriesScreen />);
    await screen.findByText('Ana');
    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar vínculo' }));
    expect(screen.getByText(/você não poderá mais acessar os relatos/)).toBeTruthy();
    expect(unlinkPatient).not.toHaveBeenCalled();
    const cancelButtons = screen.getAllByRole('button', { name: 'Voltar' });
    await fireEvent.press(cancelButtons[cancelButtons.length - 1]!);
    expect(unlinkPatient).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar vínculo' }));
    const buttons = screen.getAllByRole('button', { name: 'Encerrar vínculo' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() => expect(unlinkPatient.mock.calls[0]?.[0]).toEqual({
      patientId: PATIENT, psychologistId: PSYCHOLOGIST,
    }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/psychologist'));
  });

  it('reports an unlink failure without claiming success', async () => {
    listLinkedPatients.mockResolvedValue([{ id: PATIENT, displayName: 'Ana', lastEntryAt: null }]);
    unlinkPatient.mockRejectedValue(new Error('failure'));
    await renderWithQuery(<PatientEntriesScreen />);
    await screen.findByText('Ana');
    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar vínculo' }));
    const buttons = screen.getAllByRole('button', { name: 'Encerrar vínculo' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    expect(await screen.findByText('Não foi possível encerrar o vínculo. Tente novamente.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
