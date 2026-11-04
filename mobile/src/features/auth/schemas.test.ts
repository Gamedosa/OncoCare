import { describe, expect, it } from '@jest/globals';

import { credentialsSchema, profileSchema, recoveryLinkSchema, resetPasswordSchema } from './schemas';

describe('credentialsSchema', () => {
  it('trims the e-mail and requires both fields', () => {
    expect(credentialsSchema.parse({ email: '  ana@example.com ', password: 'x' })).toEqual({
      email: 'ana@example.com',
      password: 'x',
    });
    const result = credentialsSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(['Informe seu e-mail.', 'Informe sua senha.']);
  });

  it('rejects malformed e-mails', () => {
    const result = credentialsSchema.safeParse({ email: 'ana', password: 'x' });
    expect(result.error?.issues[0]?.message).toBe('Informe um e-mail válido.');
  });
});

describe('profileSchema', () => {
  it('maps database rows to the app profile', () => {
    expect(
      profileSchema.parse({ id: '00000000-0000-4000-8000-000000000001', role: 'patient', display_name: null }),
    ).toEqual({ id: '00000000-0000-4000-8000-000000000001', role: 'patient', displayName: null });
  });

  describe('password recovery schemas', () => {
    it('requires the current minimum length and matching passwords without trimming', () => {
      expect(resetPasswordSchema.safeParse({ password: 'short', confirmation: 'short' }).success).toBe(false);
      expect(resetPasswordSchema.safeParse({ password: 'abcdef', confirmation: 'different' }).success).toBe(false);
      expect(resetPasswordSchema.parse({ password: ' abcdef ', confirmation: ' abcdef ' }).password).toBe(' abcdef ');
    });

    it('accepts only a single recovery token, not another auth flow or repeated params', () => {
      expect(recoveryLinkSchema.safeParse({ token_hash: 'synthetic', type: 'recovery' }).success).toBe(true);
      expect(recoveryLinkSchema.safeParse({ token_hash: 'synthetic', type: 'invite' }).success).toBe(false);
      expect(recoveryLinkSchema.safeParse({ token_hash: ['first', 'second'], type: 'recovery' }).success).toBe(false);
      expect(recoveryLinkSchema.safeParse({ token_hash: '', type: 'recovery' }).success).toBe(false);
    });
  });

  it('rejects unknown roles', () => {
    expect(profileSchema.safeParse({ id: '00000000-0000-4000-8000-000000000001', role: 'admin', display_name: null }).success).toBe(false);
  });
});
