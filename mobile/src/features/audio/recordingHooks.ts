import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { diaryKeys } from '@/features/diary/hooks';
import type { DiaryEntry, EntryDraft } from '@/features/diary/schemas';

import type { RecordedAudio } from './recordingFile';
import { AudioCleanupPendingError, createRecordingSaver } from './saveRecording';

export function useSaveRecording(patientId: string, previous?: DiaryEntry) {
  const queryClient = useQueryClient();
  const previousId = previous?.id;
  // Keep recovery and the original audio path stable when the cached entry refreshes.
  const save = useMemo(() => createRecordingSaver(patientId, previous), [patientId, previousId]);
  const sync = (entry: DiaryEntry) => {
    queryClient.setQueryData(diaryKeys.entry(entry.id), entry);
    void queryClient.invalidateQueries({ queryKey: diaryKeys.list(patientId) });
  };
  return useMutation({
    mutationFn: ({ draft, audio }: { draft: EntryDraft; audio: RecordedAudio | null }) => save(draft, audio),
    gcTime: 0,
    onSuccess: sync,
    onError: (error) => {
      if (error instanceof AudioCleanupPendingError) sync(error.entry);
    },
  });
}
