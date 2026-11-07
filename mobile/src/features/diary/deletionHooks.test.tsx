import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Button, Text } from 'react-native';

import * as audioRepository from '@/features/audio/audioRepository';
import { renderWithQuery } from '@/shared/query/testing';

import * as repository from './deletionRepository';
import { useCleanDeletedAudio } from './deletionHooks';

jest.mock('./deletionRepository', () => ({
  listPendingAudioDeletions: jest.fn(), finishAudioDeletion: jest.fn(), deleteOwnEntry: jest.fn(),
}));
jest.mock('@/features/audio/audioRepository', () => ({ removeUnattachedAudio: jest.fn() }));
jest.mock('@/features/diary/diaryRepository', () => ({}));
jest.mock('@/features/patients/patientsRepository', () => ({}));
jest.mock('@/features/auth/AuthProvider', () => ({}));

const list = jest.mocked(repository.listPendingAudioDeletions);
const finish = jest.mocked(repository.finishAudioDeletion);
const remove = jest.mocked(audioRepository.removeUnattachedAudio);
const item = { entry_id: 'entry', audio_path: 'patient/audio.m4a' };

function Probe() {
  const cleanup = useCleanDeletedAudio();
  return <>
    <Button title="Limpar" onPress={() => cleanup.mutate()} />
    {cleanup.isError ? <Text>Falha</Text> : null}
    {cleanup.isSuccess ? <Text>Concluído</Text> : null}
  </>;
}

describe('deleted audio cleanup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    list.mockResolvedValue([item]);
    remove.mockResolvedValue(undefined);
    finish.mockResolvedValue(undefined);
  });

  it('removes the audio before clearing the persistent queue', async () => {
    await renderWithQuery(<Probe />);
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar' }));
    await screen.findByText('Concluído');
    expect(remove).toHaveBeenCalledWith(item.audio_path);
    expect(finish).toHaveBeenCalledWith(item.entry_id);
    expect(remove.mock.invocationCallOrder[0]!).toBeLessThan(finish.mock.invocationCallOrder[0]!);
  });

  it('keeps the queue entry on storage failure and permits retry', async () => {
    remove.mockRejectedValueOnce(new Error('offline'));
    await renderWithQuery(<Probe />);
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar' }));
    await screen.findByText('Falha');
    expect(finish).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() => expect(finish).toHaveBeenCalledWith(item.entry_id));
  });
});
