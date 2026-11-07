import { describe, expect, it } from '@jest/globals';

import { inviteErrorMessage, respondErrorMessage } from './errors';
import { InvitationError, inviteFormSchema, isExpired, toInvitationErrorCode } from './schemas';

describe('invitation schemas', () => {
  it('trims the name and normalizes the e-mail', () => {
    expect(inviteFormSchema.parse({ name: '  Ana  ', email: ' Ana@Example.TEST ' })).toEqual({
      name: 'Ana',
      email: 'ana@example.test',
    });
  });

  it('rejects empty names, long names and invalid e-mails', () => {
    expect(inviteFormSchema.safeParse({ name: ' ', email: 'ana@example.test' }).success).toBe(false);
    expect(inviteFormSchema.safeParse({ name: 'a'.repeat(121), email: 'ana@example.test' }).success).toBe(false);
    expect(inviteFormSchema.safeParse({ name: 'Ana', email: 'ana' }).success).toBe(false);
  });

  it('only accepts known error codes', () => {
    expect(toInvitationErrorCode('rate_limited')).toBe('rate_limited');
    expect(toInvitationErrorCode('anything')).toBe('internal');
    expect(toInvitationErrorCode(undefined)).toBe('internal');
  });

  it('detects expiry', () => {
    const now = new Date('2026-11-07T10:00:00Z');
    expect(isExpired({ expiresAt: new Date('2026-11-07T09:59:59Z') }, now)).toBe(true);
    expect(isExpired({ expiresAt: new Date('2026-11-07T10:00:01Z') }, now)).toBe(false);
  });

  it('maps errors to respectful, non-technical messages', () => {
    expect(inviteErrorMessage(new InvitationError('already_linked'))).toBe('Esta paciente já está vinculada a você.');
    expect(inviteErrorMessage(Object.assign(new Error('x'), { name: 'FunctionsFetchError' })))
      .toMatch(/Verifique sua internet/);
    expect(inviteErrorMessage(new Error('internal details'))).not.toMatch(/internal details/);
    expect(respondErrorMessage(new InvitationError('invitation_unavailable'))).toBe('Este convite não está mais disponível.');
  });
});
