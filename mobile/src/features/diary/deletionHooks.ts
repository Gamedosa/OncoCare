import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { removeUnattachedAudio } from '@/features/audio/audioRepository';
import { patientKeys } from '@/features/patients/hooks';

import { deleteOwnEntry, finishAudioDeletion, listPendingAudioDeletions } from './deletionRepository';
import { diaryKeys } from './hooks';

export const pendingDeletionKey = ['diary', 'pending-audio-deletions'] as const;

export function usePendingAudioDeletions() {
  return useQuery({ queryKey: pendingDeletionKey, queryFn: listPendingAudioDeletions });
}

export function useDeleteEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteOwnEntry,
    onSuccess: async (_data, entryId) => {
      await client.cancelQueries({ queryKey: diaryKeys.all });
      client.removeQueries({ queryKey: diaryKeys.entry(entryId) });
      await Promise.all([
        client.invalidateQueries({ queryKey: diaryKeys.all }),
        client.invalidateQueries({ queryKey: patientKeys.all }),
      ]);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['diary', 'list'] });
      void client.invalidateQueries({ queryKey: pendingDeletionKey });
    },
  });
}

export function useCleanDeletedAudio() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const pending = await listPendingAudioDeletions();
      for (const item of pending) {
        await removeUnattachedAudio(item.audio_path);
        await finishAudioDeletion(item.entry_id);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: pendingDeletionKey }),
  });
}
