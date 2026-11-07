import { createClient } from 'npm:@supabase/supabase-js@2';

import { InviteError, invitePatient, parseInviteInput, STATUS_BY_CODE, type InviteDeps } from './invite.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DATABASE_ERRORS = new Set(['not_psychologist', 'invitation_unavailable', 'already_linked']);

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('missing_secret_key');
  return legacy;
}

function databaseError(error: { message?: string } | null): InviteError {
  const message = error?.message ?? '';
  return new InviteError(DATABASE_ERRORS.has(message) ? (message as never) : 'internal');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new InviteError('unauthorized');
    // Verifies the signature (JWKS or Auth server) and expiry before trusting the subject.
    const { data: claimsData, error: claimsError } = await admin.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub;
    if (claimsError || !callerId || claimsData.claims.role !== 'authenticated') {
      throw new InviteError('unauthorized');
    }

    const body = await req.json().catch(() => null);
    const input = parseInviteInput(body, Deno.env.get('INVITE_REDIRECT_URL'));

    const deps: InviteDeps = {
      async isPsychologist(userId) {
        const { data, error } = await admin
          .from('psychologist_profiles')
          .select('user_id, profiles!inner(role)')
          .eq('user_id', userId)
          .eq('profiles.role', 'psychologist')
          .maybeSingle();
        if (error) throw new InviteError('internal');
        return data !== null;
      },
      async findTarget(email) {
        const { data, error } = await admin.rpc('find_invitation_target', { p_email: email });
        if (error) throw new InviteError('internal');
        const row = (data as { user_id: string; confirmed: boolean; role: string | null }[])[0];
        return row ? { userId: row.user_id, confirmed: row.confirmed, role: row.role } : null;
      },
      async sendAuthInvite(email, redirectTo) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(
          email,
          redirectTo ? { redirectTo } : undefined,
        );
        if (error) {
          console.error('invite-patient: auth invite failed', error.status, error.code);
          throw new InviteError(error.status === 429 ? 'rate_limited' : 'internal');
        }
        return data.user.id;
      },
      async createInvitation(psychologistId, patientId, email, name) {
        const { error } = await admin.rpc('create_patient_invitation', {
          p_psychologist_id: psychologistId,
          p_patient_id: patientId,
          p_email: email,
          p_patient_name: name,
        });
        if (error) throw databaseError(error);
      },
      async deleteUser(userId) {
        await admin.auth.admin.deleteUser(userId);
      },
    };

    await invitePatient(deps, callerId, input);
    return json({ status: 'sent' }, 200);
  } catch (error) {
    if (error instanceof InviteError) {
      return json({ error: error.code }, STATUS_BY_CODE[error.code]);
    }
    console.error('invite-patient: unexpected failure', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'internal' }, 500);
  }
});
