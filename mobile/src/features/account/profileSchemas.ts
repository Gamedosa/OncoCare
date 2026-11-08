import { z } from 'zod';
import { emailSchema } from '@/features/auth/schemas';

export const displayNameSchema = z.string().trim().min(1, 'Informe seu nome.').max(120, 'Use até 120 caracteres.');
export const accountContactSchema = z.object({
  email: emailSchema,
  new_email: z.string().optional(),
}).transform((row) => ({ email: row.email, pendingEmail: row.new_email || null }));
export type AccountContact = z.output<typeof accountContactSchema>;
