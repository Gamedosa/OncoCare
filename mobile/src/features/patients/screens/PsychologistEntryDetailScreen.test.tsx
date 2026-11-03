import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';

import * as diaryRepository from '@/features/diary/diaryRepository';
import type { DiaryEntry } from '@/features/diary/schemas';
import { renderWithQuery } from '@/shared/query/testing';

import { PsychologistEntryDetailScreen } from './PsychologistEntryDetailScreen';

const PATIENT = '00000000-0000-4000-8000-000000000001';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({
    patientId: '00000000-0000-4000-8000-000000000001',
    id: '00000000-0000-4000-8000-000000000010',
  }),
}));
jest.mock('@/features/diary/diaryRepository', () => ({ getEntry: jest.fn() }));
jest.mock('@/features/audio/components/EntryAudioPlayer', () => ({ EntryAudioPlayer: jest.fn(() => null) }));
jest.mock('@/features/auth/AuthProvider', () => ({ useSignedInAuth: jest.fn() }));
jest.mock('../patientsRepository', () => ({ listLinkedPatients: jest.fn() }));

const getEntry = jest.mocked(diaryRepository.getEntry);

const entry: DiaryEntry = {
  id: '00000000-0000-4000-8000-000000000010',
  patientId: PATIENT,
  content: 'Hoje consegui caminhar.',
  mood: 4,
  hasAudio: false,
  audioPath: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PsychologistEntryDetailScreen', () => {
  beforeEach(() => {
    getEntry.mockReset();
  });

  it('shows the entry without write actions', async () => {
    getEntry.mockResolvedValue(entry);
    await renderWithQuery(<PsychologistEntryDetailScreen />);

    expect(await screen.findByText('Hoje consegui caminhar.')).toBeTruthy();
    expect(screen.getByText('Visualização somente leitura')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('shows a neutral message when the entry is hidden', async () => {
    getEntry.mockResolvedValue(null);
    await renderWithQuery(<PsychologistEntryDetailScreen />);

    expect(await screen.findByText('Este conteúdo não está mais disponível para você.')).toBeTruthy();
  });

  it('does not show an entry from another patient than the one in the route', async () => {
    getEntry.mockResolvedValue({ ...entry, patientId: '00000000-0000-4000-8000-000000000002' });
    await renderWithQuery(<PsychologistEntryDetailScreen />);

    expect(await screen.findByText('Este conteúdo não está mais disponível para você.')).toBeTruthy();
    expect(screen.queryByText('Hoje consegui caminhar.')).toBeNull();
  });
});
