import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Button } from '@/shared/ui';
import { createTestQueryClient, renderWithQuery } from '@/shared/query/testing';
import { useDeleteAccount } from './deletionHooks';
import * as repository from './deletionRepository';

jest.mock('./deletionRepository', () => ({
  deleteOwnAccount: jest.fn(),
  AccountDeletionError: class extends Error {
    code: string;
    constructor(code: string) { super(code); this.code = code; }
  },
}));
const remove = jest.mocked(repository.deleteOwnAccount);
function Harness() {
  const mutation = useDeleteAccount(() => 'synthetic-password');
  return <Button onPress={() => mutation.mutate()}>{mutation.status}</Button>;
}
describe('account deletion cache', () => {
  beforeEach(() => { jest.resetAllMocks(); });
  function clientWithData() {
    const client = createTestQueryClient();
    client.setQueryData(['diary', 'list'], ['synthetic-entry']);
    client.setQueryData(['profile', 'synthetic-id'], { role: 'patient' });
    return client;
  }
  it('discards diary caches on completion without storing the password in mutation variables', async () => {
    remove.mockResolvedValue(undefined);
    const client = clientWithData();
    await renderWithQuery(<Harness />, client);
    await fireEvent.press(screen.getByRole('button', { name: 'idle' }));
    await screen.findByRole('button', { name: 'success' });
    expect(client.getQueryData(['diary', 'list'])).toBeUndefined();
    expect(client.getQueryData(['profile', 'synthetic-id'])).toEqual({ role: 'patient' });
    expect(client.getMutationCache().getAll()[0]?.state.variables).toBeUndefined();
  });
  it('keeps existing data when the password is wrong', async () => {
    remove.mockRejectedValue(new repository.AccountDeletionError('invalid_password'));
    const client = clientWithData();
    await renderWithQuery(<Harness />, client);
    await fireEvent.press(screen.getByRole('button', { name: 'idle' }));
    await screen.findByRole('button', { name: 'error' });
    expect(client.getQueryData(['diary', 'list'])).toEqual(['synthetic-entry']);
  });
  it('discards cached records and refetches profile after incomplete cleanup', async () => {
    remove.mockRejectedValue(new repository.AccountDeletionError('cleanup_pending'));
    const client = clientWithData();
    await renderWithQuery(<Harness />, client);
    await fireEvent.press(screen.getByRole('button', { name: 'idle' }));
    await waitFor(() => expect(client.getQueryState(['profile', 'synthetic-id'])?.isInvalidated).toBe(true));
    expect(client.getQueryData(['diary', 'list'])).toBeUndefined();
  });
});
