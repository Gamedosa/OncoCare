import { createClient } from 'npm:@supabase/supabase-js@2';
import { DeleteError, deleteAccount, parseDeleteInput, STATUS_BY_CODE, type DeleteDeps, type StoredObject } from './delete.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed: Record<string, string> = JSON.parse(keys);
    if (parsed.default) return parsed.default;
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('missing_secret_key');
  return legacy;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    if (!url) throw new Error('missing_url');
    const key = secretKey();
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new DeleteError('unauthorized');
    // Dashboard administrators use the server credential; app users must provide a verified user JWT.
    const isAdmin = token === key || token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let callerId: string | null = null;
    if (!isAdmin) {
      const { data, error } = await admin.auth.getClaims(token);
      if (error || !data?.claims.sub || data.claims.role !== 'authenticated') throw new DeleteError('unauthorized');
      callerId = data.claims.sub;
    }
    let body: unknown;
    try { body = await req.json(); } catch { throw new DeleteError('invalid_input'); }
    const input = parseDeleteInput(body, isAdmin);
    const deps: DeleteDeps = {
      async verifyPassword(userId, password) {
        const { data: account, error: accountError } = await admin.auth.admin.getUserById(userId);
        if (accountError) throw new DeleteError(accountError.status === 404 ? 'unauthorized' : 'internal');
        if (!account.user?.email) throw new DeleteError('unauthorized');
        const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await verifier.auth.signInWithPassword({ email: account.user.email, password });
        if (error) throw new DeleteError(error.status === 429 ? 'rate_limited'
          : error.code === 'invalid_credentials' ? 'invalid_password' : 'internal');
        if (data.user?.id !== userId) throw new DeleteError('unauthorized');
        const { error: signOutError } = await verifier.auth.signOut({ scope: 'local' });
        if (signOutError) throw new DeleteError('internal');
      },
      async begin(userId) {
        const { error } = await admin.rpc('begin_account_deletion', { p_user_id: userId });
        if (error) throw new DeleteError(error.message === 'account_unavailable' ? 'account_unavailable' : 'internal');
      },
      async listObjects(userId) {
        const { data, error } = await admin.rpc('list_account_deletion_objects', { p_user_id: userId });
        if (error) throw new Error('storage_list_failed');
        return data as StoredObject[];
      },
      async removeObjects(bucket, paths) {
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (error) throw new Error('storage_removal_failed');
      },
      async deleteUser(userId) {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error('auth_deletion_failed');
      },
    };
    await deleteAccount(deps, callerId, input);
    return json({ status: 'deleted' }, 200);
  } catch (error) {
    const code = error instanceof DeleteError ? error.code : 'internal';
    // Never log passwords, identifiers, diary contents or provider messages.
    if (code === 'internal' || code === 'cleanup_pending') console.error('delete-account failed:', code);
    return json({ error: code }, STATUS_BY_CODE[code]);
  }
});
