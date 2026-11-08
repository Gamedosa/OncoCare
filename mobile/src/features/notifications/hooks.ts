import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { countUnreadNotifications, listNotifications, markNotificationRead, NOTIFICATION_PAGE_SIZE, type NotificationCursor } from './notificationsRepository';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => ['notifications', userId, 'list'] as const,
  unread: (userId: string) => ['notifications', userId, 'unread'] as const,
};
export function useNotifications(userId: string) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(userId),
    initialPageParam: null as NotificationCursor | null,
    queryFn: ({ pageParam }) => listNotifications(userId, pageParam),
    getNextPageParam: (lastPage) => lastPage.length === NOTIFICATION_PAGE_SIZE ? lastPage[lastPage.length - 1] : undefined,
    refetchInterval: 30_000,
  });
}
export function useUnreadNotifications(userId: string) {
  return useQuery({
    queryKey: notificationKeys.unread(userId), queryFn: () => countUnreadNotifications(userId),
    refetchInterval: 30_000,
  });
}
export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
