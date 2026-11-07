export type InviteErrorCode =
  | 'invalid_input'
  | 'unauthorized'
  | 'not_psychologist'
  | 'invitation_unavailable'
  | 'already_linked'
  | 'rate_limited'
  | 'internal';

export type InviteInput = { email: string; name: string; redirectTo: string | null };

export type InvitationTarget = { userId: string; confirmed: boolean; role: string | null };

export type InviteDeps = {
  isPsychologist(userId: string): Promise<boolean>;
  findTarget(email: string): Promise<InvitationTarget | null>;
  /** Creates the account (or resends to an unconfirmed one) and sends the Auth invite e-mail. */
  sendAuthInvite(email: string, redirectTo: string | null): Promise<string>;
  createInvitation(psychologistId: string, patientId: string, email: string, name: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
};

export class InviteError extends Error {
  code: InviteErrorCode;

  constructor(code: InviteErrorCode) {
    super(code);
    this.code = code;
  }
}

export const STATUS_BY_CODE: Record<InviteErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  not_psychologist: 403,
  invitation_unavailable: 409,
  already_linked: 409,
  rate_limited: 429,
  internal: 500,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_REDIRECT_PROTOCOLS = new Set(['https:', 'http:', 'oncocare:', 'exp:']);

export function parseInviteInput(body: unknown, configuredRedirect: string | undefined): InviteInput {
  if (typeof body !== 'object' || body === null) throw new InviteError('invalid_input');
  const { email, name, redirectTo } = body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof name !== 'string') throw new InviteError('invalid_input');

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (normalizedEmail.length > 320 || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new InviteError('invalid_input');
  }
  if (trimmedName.length < 1 || trimmedName.length > 120) throw new InviteError('invalid_input');

  return {
    email: normalizedEmail,
    name: trimmedName,
    redirectTo: configuredRedirect?.trim() || parseRedirect(redirectTo),
  };
}

// Supabase Auth still checks the URL against the project's Redirect URLs allowlist.
function parseRedirect(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 2048) throw new InviteError('invalid_input');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InviteError('invalid_input');
  }
  if (!ALLOWED_REDIRECT_PROTOCOLS.has(url.protocol)) throw new InviteError('invalid_input');
  return url.toString();
}

export async function invitePatient(deps: InviteDeps, callerId: string, input: InviteInput): Promise<void> {
  if (!(await deps.isPsychologist(callerId))) throw new InviteError('not_psychologist');

  const target = await deps.findTarget(input.email);
  if (target && (target.userId === callerId || (target.role !== null && target.role !== 'patient'))) {
    throw new InviteError('invitation_unavailable');
  }

  const createdNow = target === null;
  // Confirmed accounts already have a password: they see the invitation in the app instead.
  const patientId = target?.confirmed ? target.userId : await deps.sendAuthInvite(input.email, input.redirectTo);

  try {
    await deps.createInvitation(callerId, patientId, input.email, input.name);
  } catch (error) {
    if (createdNow) {
      await deps.deleteUser(patientId).catch(() => undefined);
    }
    throw error;
  }
}
