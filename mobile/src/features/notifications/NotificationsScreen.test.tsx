import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQuery } from '@/shared/query/testing';
import * as repository from './notificationsRepository';
import { NotificationsScreen } from './NotificationsScreen';

jest.mock('@/features/auth/AuthProvider', () => ({
  useSignedInAuth: () => ({ profile: { id: '00000000-0000-4000-8000-000000000001', role: 'patient' } }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('./notificationsRepository', () => ({
  listNotifications: jest.fn(), markNotificationRead: jest.fn(), NOTIFICATION_PAGE_SIZE: 20,
}));
const list = jest.mocked(repository.listNotifications);
const mark = jest.mocked(repository.markNotificationRead);
const notification: repository.Notification = {
  id: '00000000-0000-4000-8000-000000000003', kind: 'announcement', title: 'Atualização',
  body: 'Uma nova versão está disponível.', created_at: '2026-11-07T12:00:00Z', read_at: null,
};
describe('notifications', () => {
  beforeEach(() => { jest.resetAllMocks(); mark.mockResolvedValue(undefined); });
  it('shows an empty state', async () => {
    list.mockResolvedValue([]);
    await renderWithQuery(<NotificationsScreen />);
    expect(await screen.findByText('Nenhuma notificação')).toBeTruthy();
  });
  it('lists messages and persists read status', async () => {
    list.mockResolvedValueOnce([notification]).mockResolvedValue([{ ...notification, read_at: '2026-11-07T12:01:00Z' }]);
    await renderWithQuery(<NotificationsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Marcar como lida' }));
    await waitFor(() => expect(mark.mock.calls[0]?.[0]).toBe(notification.id));
    expect(await screen.findByText('Lida')).toBeTruthy();
  });
  it('reports fetch and read failures rather than showing success', async () => {
    list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([notification]);
    mark.mockRejectedValue(new Error('offline'));
    await renderWithQuery(<NotificationsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Tentar novamente' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Marcar como lida' }));
    expect(await screen.findByText(/Não foi possível marcar/)).toBeTruthy();
    expect(screen.queryByText('Lida')).toBeNull();
  });
});
