import { z } from 'zod';
import { supabase } from '@/shared/supabase/client';

const notificationSchema = z.object({
  id: z.uuid(), kind: z.enum(['invitation', 'link', 'diary', 'announcement']),
  title: z.string(), body: z.string(), created_at: z.iso.datetime({ offset: true }),
  read_at: z.iso.datetime({ offset: true }).nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationCursor = Pick<Notification, 'id' | 'created_at'>;
export const NOTIFICATION_PAGE_SIZE = 20;

export async function listNotifications(userId: string, cursor: NotificationCursor | null): Promise<Notification[]> {
  let query = supabase.from('notifications')
    .select('id, kind, title, body, created_at, read_at').eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(NOTIFICATION_PAGE_SIZE);
  if (cursor) {
    const parsed = notificationSchema.pick({ id: true, created_at: true }).parse(cursor);
    query = query.or(`created_at.lt.${parsed.created_at},and(created_at.eq.${parsed.created_at},id.lt.${parsed.id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return notificationSchema.array().parse(data);
}
export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).is('read_at', null);
  if (error) throw error;
  return z.number().int().nonnegative().parse(count);
}
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
  if (error) throw error;
}
