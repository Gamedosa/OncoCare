import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import { deleteAccount, DeleteError, parseDeleteInput, type DeleteDeps } from './delete.ts';

const USER = '00000000-0000-4000-8000-000000000001';
function fake(overrides: Partial<DeleteDeps> = {}) {
  const calls: string[] = [];
  const deps: DeleteDeps = {
    verifyPassword: async (id) => { calls.push(`password:${id}`); },
    begin: async (id) => { calls.push(`begin:${id}`); },
    listObjects: async () => [],
    removeObjects: async (bucket, paths) => { calls.push(`remove:${bucket}:${paths.join(',')}`); },
    deleteUser: async (id) => { calls.push(`delete:${id}`); },
    ...overrides,
  };
  return { deps, calls };
}
Deno.test('users cannot target other accounts; admin requires a valid UUID', () => {
  assertThrows(() => parseDeleteInput({ password: 'synthetic', userId: USER }, false), DeleteError);
  assertThrows(() => parseDeleteInput({ userId: 'invalid' }, true), DeleteError);
  assertThrows(() => parseDeleteInput({ password: '' }, false), DeleteError);
  assertEquals(parseDeleteInput({ userId: USER }, true), { userId: USER });
});
Deno.test('password is verified before any destructive step', async () => {
  const { deps, calls } = fake({ verifyPassword: async () => { throw new DeleteError('invalid_password'); } });
  await assertRejects(() => deleteAccount(deps, USER, { password: 'synthetic' }), DeleteError, 'invalid_password');
  assertEquals(calls, []);
});
Deno.test('self deletion verifies password and admin does not need the users password', async () => {
  const self = fake();
  await deleteAccount(self.deps, USER, { password: 'synthetic' });
  assertEquals(self.calls, [`password:${USER}`, `begin:${USER}`, `delete:${USER}`]);
  const admin = fake();
  await deleteAccount(admin.deps, null, { userId: USER });
  assertEquals(admin.calls, [`begin:${USER}`, `delete:${USER}`]);
});
Deno.test('removes all batches and buckets before deleting Auth', async () => {
  let listed = 0;
  const { deps, calls } = fake({
    listObjects: async () => listed++ === 0 ? [
      { bucket_id: 'diary-audio', name: `${USER}/attached.m4a` },
      { bucket_id: 'diary-audio', name: `${USER}/orphan.m4a` },
      { bucket_id: 'other-private', name: 'owned-file' },
    ] : [],
  });
  await deleteAccount(deps, USER, { password: 'synthetic' });
  assertEquals(calls, [`password:${USER}`, `begin:${USER}`,
    `remove:diary-audio:${USER}/attached.m4a,${USER}/orphan.m4a`,
    'remove:other-private:owned-file', `delete:${USER}`]);
});
Deno.test('failure leaves deletion pending and does not claim completion', async () => {
  const { deps, calls } = fake({
    listObjects: async () => [{ bucket_id: 'diary-audio', name: 'synthetic.m4a' }],
    removeObjects: async () => { throw new Error('offline'); },
  });
  await assertRejects(() => deleteAccount(deps, USER, { password: 'synthetic' }), DeleteError, 'cleanup_pending');
  assertEquals(calls, [`password:${USER}`, `begin:${USER}`]);
});
Deno.test('zero-removal responses are bounded, not success-shaped', async () => {
  const { deps, calls } = fake({
    listObjects: async () => [{ bucket_id: 'diary-audio', name: 'synthetic.m4a' }],
  });
  await assertRejects(() => deleteAccount(deps, USER, { password: 'synthetic' }), DeleteError, 'cleanup_pending');
  assertEquals(calls.filter((call) => call.startsWith('remove:')).length, 20);
  assertEquals(calls.some((call) => call.startsWith('delete:')), false);
});
