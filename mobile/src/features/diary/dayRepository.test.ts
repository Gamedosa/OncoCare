import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { listDiaryDayEntries, listDiaryDays } from './dayRepository';

const mockRpc = jest.fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>();
jest.mock('@/shared/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
const PATIENT = '00000000-0000-4000-8000-000000000001';
const row = {
  id: '00000000-0000-4000-8000-000000000002', patient_id: PATIENT,
  content: 'Fictício', mood_score: null, audio_path: null,
  created_at: '2026-11-07T12:00:00Z', updated_at: '2026-11-07T12:00:00Z',
};
describe('diary day repository', () => {
  beforeEach(() => { jest.resetAllMocks(); });
  it('uses server totals, not the count of currently loaded entries', async () => {
    mockRpc.mockResolvedValue({ data: [{ day: '2026-11-07', entry_count: 25, has_audio: true }], error: null });
    expect(await listDiaryDays(PATIENT, null)).toEqual({
      days: [{ day: '2026-11-07', count: 25, hasAudio: true }], nextDay: null,
    });
    expect(mockRpc).toHaveBeenCalledWith('list_diary_days', { p_patient_id: PATIENT });
  });
  it('paginates complete days with an exclusive date cursor', async () => {
    mockRpc.mockResolvedValue({ data: Array.from({ length: 21 }, (_, i) => ({
      day: `2026-11-${String(30 - i).padStart(2, '0')}`, entry_count: 1, has_audio: false,
    })), error: null });
    const result = await listDiaryDays(PATIENT, null);
    expect(result.days).toHaveLength(20);
    expect(result.nextDay).toBe('2026-11-11');
    await listDiaryDays(PATIENT, result.nextDay);
    expect(mockRpc).toHaveBeenLastCalledWith('list_diary_days', { p_patient_id: PATIENT, p_before: '2026-11-11' });
  });
  it('opens only the selected day and supports more than twenty entries', async () => {
    mockRpc.mockResolvedValue({ data: Array.from({ length: 21 }, () => row), error: null });
    const result = await listDiaryDayEntries(PATIENT, '2026-11-07', 0);
    expect(result.entries).toHaveLength(20);
    expect(result.nextPage).toBe(1);
    expect(mockRpc).toHaveBeenCalledWith('list_diary_day_entries', { p_patient_id: PATIENT, p_day: '2026-11-07', p_page: 0 });
  });
  it('rejects invalid dates and propagates query errors', async () => {
    await expect(listDiaryDayEntries(PATIENT, '2026-02-30', 0)).rejects.toThrow();
    expect(mockRpc).not.toHaveBeenCalled();
    const error = new Error('offline');
    mockRpc.mockResolvedValue({ data: null, error });
    await expect(listDiaryDays(PATIENT, null)).rejects.toBe(error);
  });
});
