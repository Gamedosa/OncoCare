import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.'));

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;

// Mirrors the current Supabase minimum; stronger server policies remain authoritative.
export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Use pelo menos 6 caracteres.'),
  confirmation: z.string().min(1, 'Confirme a nova senha.'),
}).refine((value) => value.password === value.confirmation, {
  message: 'As senhas não coincidem.',
  path: ['confirmation'],
});

export const recoveryLinkSchema = z.object({
  token_hash: z.string().min(1).max(2048),
  type: z.literal('recovery'),
});

export const roleSchema = z.enum(['patient', 'psychologist']);

export type Role = z.infer<typeof roleSchema>;

export const profileSchema = z
  .object({
    id: z.uuid(),
    role: roleSchema,
    display_name: z.string().nullable(),
  })
  .transform((row) => ({ id: row.id, role: row.role, displayName: row.display_name }));

export type Profile = z.output<typeof profileSchema>;
