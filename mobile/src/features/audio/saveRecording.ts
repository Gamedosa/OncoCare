import { createEntry, getEntry, getEntryByAudioPath, updateEntry } from '@/features/diary/diaryRepository';
import type { DiaryEntry, EntryDraft } from '@/features/diary/schemas';

import { AudioUploadRecoveryError, removeUnattachedAudio, uploadAudio, type UploadedAudio } from './audioRepository';
import type { RecordedAudio } from './recordingFile';

export class AudioSaveRecoveryError extends Error {
  constructor() {
    super('Não foi possível confirmar o salvamento ou limpar o áudio enviado. Tente novamente para verificar antes de enviar outro arquivo.');
  }
}

export class AudioCleanupPendingError extends AudioSaveRecoveryError {
  constructor(readonly entry: DiaryEntry) {
    super();
    this.message = 'O relato foi salvo, mas não foi possível excluir o áudio antigo. Tente novamente para concluir a limpeza sem reenviar o relato.';
  }
}

// Keep the pending operation outside mutation cache; a retry first reconciles uncertain writes.
export function createRecordingSaver(patientId: string, previous?: Pick<DiaryEntry, 'id' | 'audioPath'>) {
  let pending: { path: string | null; draft: EntryDraft; oldPath: string | null } | null = null;
  let cleanup: { entry: DiaryEntry; path: string } | null = null;

  async function finishCleanup(): Promise<DiaryEntry | null> {
    if (!cleanup) return null;
    const operation = cleanup;
    try {
      await removeUnattachedAudio(operation.path);
    } catch {
      throw new AudioCleanupPendingError(operation.entry);
    }
    cleanup = null;
    return operation.entry;
  }

  async function complete(entry: DiaryEntry, oldPath: string | null): Promise<DiaryEntry> {
    pending = null;
    if (oldPath && oldPath !== entry.audioPath) {
      cleanup = { entry, path: oldPath };
      await finishCleanup();
    }
    return entry;
  }

  async function reconcile(): Promise<DiaryEntry | null> {
    if (!pending) return null;
    const operation = pending;
    let entry: DiaryEntry | null;
    try {
      entry = previous ? await getEntry(previous.id)
        : operation.path ? await getEntryByAudioPath(operation.path) : null;
      if (entry && entry.audioPath === operation.path &&
        (operation.path !== null ||
          (entry.content === operation.draft.content && entry.mood === operation.draft.mood))) {
        return await complete(entry, operation.oldPath);
      }
      if (operation.path) await removeUnattachedAudio(operation.path);
      pending = null;
      return null;
    } catch (error) {
      if (error instanceof AudioCleanupPendingError) throw error;
      throw new AudioSaveRecoveryError();
    }
  }

  return async (draft: EntryDraft, audio: RecordedAudio | null): Promise<DiaryEntry> => {
    const cleaned = await finishCleanup();
    if (cleaned) return cleaned;
    const recovered = await reconcile();
    if (recovered) return recovered;
    if (audio === null) {
      if (!previous || !draft.content?.trim()) {
        throw new Error('Escreva algo antes de remover o áudio para não deixar o relato vazio.');
      }
      pending = { path: null, draft, oldPath: previous.audioPath };
      let entry: DiaryEntry;
      try {
        entry = await updateEntry(previous.id, draft, null);
      } catch (error) {
        const confirmed = await reconcile();
        if (confirmed) return confirmed;
        throw error;
      }
      return complete(entry, previous.audioPath);
    }
    let uploaded: UploadedAudio;
    try {
      uploaded = await uploadAudio(patientId, audio);
    } catch (error) {
      if (error instanceof AudioUploadRecoveryError) {
        pending = { path: error.path, draft, oldPath: null };
        throw new AudioSaveRecoveryError();
      }
      throw error;
    }
    pending = { path: uploaded.path, draft, oldPath: previous?.audioPath ?? null };
    let entry: DiaryEntry;
    try {
      entry = previous
        ? await updateEntry(previous.id, draft, uploaded.id)
        : await createEntry(patientId, draft, uploaded.id);
    } catch (error) {
      const confirmed = await reconcile();
      if (confirmed) return confirmed;
      throw error;
    }
    return complete(entry, previous?.audioPath ?? null);
  };
}
