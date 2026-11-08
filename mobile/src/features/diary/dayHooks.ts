import { useInfiniteQuery } from '@tanstack/react-query';
import { diaryKeys } from './hooks';
import { listDiaryDayEntries, listDiaryDays } from './dayRepository';

export function useDiaryDays(patientId: string) {
  const query = useInfiniteQuery({
    queryKey: [...diaryKeys.list(patientId), 'days'],
    queryFn: ({ pageParam }) => listDiaryDays(patientId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextDay,
  });
  return { ...query, days: query.data?.pages.flatMap((page) => page.days) ?? [] };
}

export function useDiaryDayEntries(patientId: string, day: string, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: [...diaryKeys.list(patientId), 'day', day],
    queryFn: ({ pageParam }) => listDiaryDayEntries(patientId, day, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    enabled,
  });
  return { ...query, entries: query.data?.pages.flatMap((page) => page.entries) ?? [] };
}
