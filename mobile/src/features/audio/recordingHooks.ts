import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { diaryKeys } from '@/features/diary/hooks';
import type { DiaryEntry, EntryDraft } from '@/features/diary/schemas';

import type { RecordedAudio } from './recordingFile';
import { createRecordingSaver } from './saveRecording';

export function useSaveRecording(patientId: string, previous?: DiaryEntry) {
  const queryClient = useQueryClient();
  const previousId = previous?.id;
  const save = useMemo(() => createRecordingSaver(patientId, previousId ? { id: previousId } : undefined), [patientId, previousId]);
  return useMutation({
    mutationFn: ({ draft, audio }: { draft: EntryDraft; audio: RecordedAudio }) => save(draft, audio),
    gcTime: 0,
    onSuccess: (entry) => {
      queryClient.setQueryData(diaryKeys.entry(entry.id), entry);
      void queryClient.invalidateQueries({ queryKey: diaryKeys.list(patientId) });
    },
  });
}
