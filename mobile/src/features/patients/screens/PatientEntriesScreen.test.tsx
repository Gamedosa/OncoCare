import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';

import * as diaryRepository from '@/features/diary/diaryRepository';
import { renderWithQuery } from '@/shared/query/testing';

import * as patientsRepository from '../patientsRepository';
import { PatientEntriesScreen } from './PatientEntriesScreen';

const PSYCHOLOGIST = '00000000-0000-4000-8000-000000000009';
const PATIENT = '00000000-0000-4000-8000-000000000001';

jest.mock('@/features/auth/AuthProvider', () => ({
  useSignedInAuth: () => ({ profile: { id: '00000000-0000-4000-8000-000000000009', role: 'psychologist' } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({ patientId: '00000000-0000-4000-8000-000000000001' }),
}));
jest.mock('../patientsRepository', () => ({ listLinkedPatients: jest.fn() }));
jest.mock('@/features/diary/diaryRepository', () => ({ listEntries: jest.fn() }));

const listLinkedPatients = jest.mocked(patientsRepository.listLinkedPatients);
const listEntries = jest.mocked(diaryRepository.listEntries);

describe('PatientEntriesScreen', () => {
  beforeEach(() => {
    listLinkedPatients.mockReset();
    listEntries.mockReset();
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
});
