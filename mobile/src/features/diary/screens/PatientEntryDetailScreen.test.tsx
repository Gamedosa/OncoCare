import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as diaryRepository from '../diaryRepository';
import * as deletionRepository from '../deletionRepository';
import { renderWithQuery } from '@/shared/query/testing';
import { PatientEntryDetailScreen } from './PatientEntryDetailScreen';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => ({ id: 'entry' }),
}));
jest.mock('../diaryRepository', () => ({ getEntry: jest.fn() }));
jest.mock('../deletionRepository', () => ({ deleteOwnEntry: jest.fn() }));
jest.mock('@/features/audio/audioRepository', () => ({ removeUnattachedAudio: jest.fn() }));
jest.mock('@/features/auth/AuthProvider', () => ({ useSignedInAuth: jest.fn() }));
jest.mock('@/features/patients/patientsRepository', () => ({ listLinkedPatients: jest.fn() }));
jest.mock('@/features/audio/components/EntryAudioPlayer', () => ({ EntryAudioPlayer: () => null }));

const getEntry = jest.mocked(diaryRepository.getEntry);
const deleteOwnEntry = jest.mocked(deletionRepository.deleteOwnEntry);
const entry = { id: 'entry', patientId: 'patient', content: 'Relato fictício', mood: null,
  hasAudio: false, audioPath: null, createdAt: new Date(), updatedAt: new Date() };

describe('PatientEntryDetailScreen deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getEntry.mockResolvedValue(entry);
  });

  it('requires confirmation and returns to history only after deletion', async () => {
    deleteOwnEntry.mockResolvedValue(undefined);
    await renderWithQuery(<PatientEntryDetailScreen />);
    await screen.findByText('Relato fictício');
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir relato' }));
    expect(deleteOwnEntry).not.toHaveBeenCalled();
    expect(screen.getByText(/Esta ação não pode ser desfeita/)).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Excluir relato' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    await waitFor(() => expect(deleteOwnEntry.mock.calls[0]?.[0]).toBe('entry'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/patient'));
  });

  it('reports uncertainty if the server response fails', async () => {
    deleteOwnEntry.mockRejectedValue(new Error('offline'));
    await renderWithQuery(<PatientEntryDetailScreen />);
    await screen.findByText('Relato fictício');
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir relato' }));
    const buttons = screen.getAllByRole('button', { name: 'Excluir relato' });
    await fireEvent.press(buttons[buttons.length - 1]!);
    expect(await screen.findByText(/Não foi possível confirmar a exclusão/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
