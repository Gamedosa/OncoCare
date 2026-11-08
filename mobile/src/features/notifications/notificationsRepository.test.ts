import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { countUnreadNotifications, listNotifications, markNotificationRead } from './notificationsRepository';

const mockResult = jest.fn<() => Promise<{ data?: unknown; count?: number | null; error: unknown }>>();
const mockRpc = jest.fn<(...args: unknown[]) => Promise<{ error: unknown }>>();
const mockFrom = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();
jest.mock('@/shared/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      const query = {
        select: () => query, eq: () => query, order: () => query,
        limit: (...values: unknown[]) => { mockLimit(...values); return query; },
        or: (...values: unknown[]) => { mockOr(...values); return query; },
        is: () => query,
        then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => mockResult().then(resolve, reject),
      };
      return query;
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
const USER = '00000000-0000-4000-8000-000000000001';
const row = {
  id: '00000000-0000-4000-8000-000000000002', kind: 'announcement', title: 'Aviso', body: 'Ficticio',
  created_at: '2026-11-07T00:00:00+00:00', read_at: null,
};
describe('notifications repository', () => {
  beforeEach(() => { jest.resetAllMocks(); });
  it('uses stable keyset pagination with timestamp and UUID tie-breaker', async () => {
    mockResult.mockResolvedValue({ data: [row], error: null });
    expect(await listNotifications(USER, null)).toEqual([row]);
    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(mockOr).not.toHaveBeenCalled();
    await listNotifications(USER, row);
    expect(mockOr).toHaveBeenCalledWith(
      `created_at.lt.${row.created_at},and(created_at.eq.${row.created_at},id.lt.${row.id})`,
    );
  });
  it('rejects invalid rows and cursor inputs instead of displaying corrupt data', async () => {
    mockResult.mockResolvedValue({ data: [{ ...row, kind: 'unknown' }], error: null });
    await expect(listNotifications(USER, null)).rejects.toThrow();
    await expect(listNotifications(USER, { id: 'invalid', created_at: row.created_at })).rejects.toThrow();
  });
  it('counts unread messages and requires an actual numeric count', async () => {
    mockResult.mockResolvedValueOnce({ count: 3, error: null }).mockResolvedValueOnce({ count: null, error: null });
    expect(await countUnreadNotifications(USER)).toBe(3);
    await expect(countUnreadNotifications(USER)).rejects.toThrow();
  });
  it('propagates database errors and only marks through the authorized RPC', async () => {
    const error = new Error('offline');
    mockResult.mockResolvedValue({ error });
    await expect(listNotifications(USER, null)).rejects.toBe(error);
    mockRpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error });
    await markNotificationRead(row.id);
    expect(mockRpc).toHaveBeenCalledWith('mark_notification_read', { p_notification_id: row.id });
    await expect(markNotificationRead(row.id)).rejects.toBe(error);
  });
});
