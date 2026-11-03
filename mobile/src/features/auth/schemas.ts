import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.'));

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;

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
