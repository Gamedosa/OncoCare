import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createEntry, getEntry, listEntries, updateEntry } from './diaryRepository';
import type { DiaryEntry, EntryDraft } from './schemas';

export const diaryKeys = {
  all: ['diary'] as const,
  list: (patientId: string) => ['diary', 'list', patientId] as const,
  entry: (entryId: string) => ['diary', 'entry', entryId] as const,
};

export function useEntries(patientId: string) {
  const query = useInfiniteQuery({
    queryKey: diaryKeys.list(patientId),
    queryFn: ({ pageParam }) => listEntries(patientId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  });
  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  return { ...query, entries };
}

export function useEntry(entryId: string) {
  return useQuery({ queryKey: diaryKeys.entry(entryId), queryFn: () => getEntry(entryId) });
}

function useSyncEntry() {
  const queryClient = useQueryClient();
  return (entry: DiaryEntry) => {
    queryClient.setQueryData(diaryKeys.entry(entry.id), entry);
    void queryClient.invalidateQueries({ queryKey: diaryKeys.list(entry.patientId) });
  };
}

export function useCreateEntry(patientId: string) {
  const sync = useSyncEntry();
  return useMutation({ mutationFn: (draft: EntryDraft) => createEntry(patientId, draft), onSuccess: sync });
}

export function useUpdateEntry(entryId: string) {
  const sync = useSyncEntry();
  return useMutation({ mutationFn: (draft: EntryDraft) => updateEntry(entryId, draft), onSuccess: sync });
}
