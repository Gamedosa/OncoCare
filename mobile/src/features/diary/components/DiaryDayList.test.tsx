import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { EmptyState } from '@/shared/ui';
import { renderWithQuery } from '@/shared/query/testing';
import { useDiaryDays } from '../dayHooks';
import * as repository from '../dayRepository';
import { DiaryDayList } from './DiaryDayList';

jest.mock('../dayRepository', () => ({ listDiaryDays: jest.fn() }));
jest.mock('../diaryRepository', () => ({}));
const list = jest.mocked(repository.listDiaryDays);
const mockOpen = jest.fn();
function Harness() {
  const query = useDiaryDays('00000000-0000-4000-8000-000000000001');
  return <DiaryDayList query={query} onOpen={mockOpen} empty={<EmptyState title="Sem registros" />} />;
}
describe('day boxes', () => {
  beforeEach(() => { jest.resetAllMocks(); });
  it('renders one box for a day with twenty-five entries and opens the selected day', async () => {
    list.mockResolvedValue({ days: [{ day: '2026-11-07', count: 25, hasAudio: true }], nextDay: null });
    await renderWithQuery(<Harness />);
    const button = await screen.findByRole('button', { name: /25 registros/ });
    expect(screen.getAllByRole('button', { name: /25 registros/ })).toHaveLength(1);
    expect(screen.getByText('Áudio')).toBeTruthy();
    await fireEvent.press(button);
    expect(mockOpen).toHaveBeenCalledWith('2026-11-07');
  });
  it('uses the singular count for a day with one entry', async () => {
    list.mockResolvedValue({ days: [{ day: '2026-11-07', count: 1, hasAudio: false }], nextDay: null });
    await renderWithQuery(<Harness />);
    expect(await screen.findByText('1 registro')).toBeTruthy();
    expect(screen.queryByText('Áudio')).toBeNull();
  });
  it('reports fetch errors and supports retry', async () => {
    list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ days: [], nextDay: null });
    await renderWithQuery(<Harness />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Sem registros')).toBeTruthy();
  });
});
