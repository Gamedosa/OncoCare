import { createEntry, getEntry, getEntryByAudioPath, updateEntry } from '@/features/diary/diaryRepository';
import type { DiaryEntry, EntryDraft } from '@/features/diary/schemas';

import { AudioUploadRecoveryError, removeUnattachedAudio, uploadAudio, type UploadedAudio } from './audioRepository';
import type { RecordedAudio } from './recordingFile';

export class AudioSaveRecoveryError extends Error {
  constructor() {
    super('Não foi possível confirmar o salvamento ou limpar o áudio enviado. Tente novamente para verificar antes de enviar outro arquivo.');
  }
}

// Keep the pending operation outside mutation cache; a retry first reconciles uncertain writes.
export function createRecordingSaver(patientId: string, previous?: Pick<DiaryEntry, 'id'>) {
  let pending: Pick<UploadedAudio, 'path'> | null = null;

  async function reconcile(): Promise<DiaryEntry | null> {
    if (!pending) return null;
    const operation = pending;
    try {
      const entry = previous ? await getEntry(previous.id) : await getEntryByAudioPath(operation.path);
      if (entry?.audioPath === operation.path) {
        pending = null;
        return entry;
      }
      await removeUnattachedAudio(operation.path);
      pending = null;
      return null;
    } catch {
      throw new AudioSaveRecoveryError();
    }
  }

  return async (draft: EntryDraft, audio: RecordedAudio): Promise<DiaryEntry> => {
    const recovered = await reconcile();
    if (recovered) return recovered;
    let uploaded: UploadedAudio;
    try {
      uploaded = await uploadAudio(patientId, audio);
    } catch (error) {
      if (error instanceof AudioUploadRecoveryError) {
        pending = { path: error.path };
        throw new AudioSaveRecoveryError();
      }
      throw error;
    }
    pending = uploaded;
    try {
      const entry = previous
        ? await updateEntry(previous.id, draft, uploaded.id)
        : await createEntry(patientId, draft, uploaded.id);
      pending = null;
      return entry;
    } catch (error) {
      const confirmed = await reconcile();
      if (confirmed) return confirmed;
      throw error;
    }
  };
}
