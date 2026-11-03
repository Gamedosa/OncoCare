import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Button } from 'react-native';

import { diaryKeys } from '@/features/diary/hooks';
import type { DiaryEntry, EntryDraft } from '@/features/diary/schemas';
import { renderWithQuery } from '@/shared/query/testing';

import type { RecordedAudio } from './recordingFile';
import { useSaveRecording } from './recordingHooks';
import { AudioCleanupPendingError, createRecordingSaver } from './saveRecording';

const mockSave = jest.fn<(draft: EntryDraft, audio: RecordedAudio | null) => Promise<DiaryEntry>>();
jest.mock('./saveRecording', () => {
  class AudioCleanupPendingError extends Error {
    readonly entry: DiaryEntry;

    constructor(savedEntry: DiaryEntry) {
      super('cleanup pending');
      this.entry = savedEntry;
    }
  }
  return { createRecordingSaver: jest.fn(() => mockSave), AudioCleanupPendingError };
});
jest.mock('@/features/diary/diaryRepository', () => ({
  createEntry: jest.fn(), getEntry: jest.fn(), listEntries: jest.fn(), updateEntry: jest.fn(),
}));
const createSaver = jest.mocked(createRecordingSaver);
const original: DiaryEntry = {
  id: '00000000-0000-4000-8000-000000000010',
  patientId: '00000000-0000-4000-8000-000000000001',
  content: 'Texto', mood: 4, hasAudio: true, audioPath: 'patient/original.m4a',
  createdAt: new Date(), updatedAt: new Date(),
};
const changed: DiaryEntry = { ...original, hasAudio: false, audioPath: null };

function Probe({ entry }: { entry: DiaryEntry }) {
  const mutation = useSaveRecording(entry.patientId, entry);
  return <Button title="Remover" onPress={() => mutation.mutate({
    draft: { content: 'Texto', mood: 4 }, audio: null,
  })} />;
}

describe('audio change query synchronization', () => {
  beforeEach(() => {
    mockSave.mockReset();
    createSaver.mockClear();
  });

  it('updates the cached detail and invalidates history on successful removal', async () => {
    mockSave.mockResolvedValue(changed);
    const result = await renderWithQuery(<Probe entry={original} />);
    result.client.setQueryData(diaryKeys.list(original.patientId), { pages: [], pageParams: [] });
    await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(result.client.getQueryData(diaryKeys.entry(original.id))).toEqual(changed));
    expect(result.client.getQueryState(diaryKeys.list(original.patientId))?.isInvalidated).toBe(true);
    expect(mockSave).toHaveBeenCalledWith({ content: 'Texto', mood: 4 }, null);
  });

  it('also synchronizes a saved entry when old-file cleanup fails', async () => {
    mockSave.mockRejectedValue(new AudioCleanupPendingError(changed));
    const result = await renderWithQuery(<Probe entry={original} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(result.client.getQueryData(diaryKeys.entry(original.id))).toEqual(changed));
  });
});
