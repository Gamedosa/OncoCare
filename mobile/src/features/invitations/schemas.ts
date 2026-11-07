import { z } from 'zod';

import { emailSchema } from '@/features/auth/schemas';
import { parseTimestamp } from '@/features/diary/schemas';

export const inviteFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da paciente.').max(120, 'Use até 120 caracteres.'),
  email: emailSchema.pipe(z.string().max(320, 'E-mail muito longo.')).transform((email) => email.toLowerCase()),
});

export type InviteForm = z.output<typeof inviteFormSchema>;

export const sentInvitationRowSchema = z
  .object({
    id: z.uuid(),
    email: z.string(),
    patient_name: z.string(),
    expires_at: z.string(),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    email: row.email,
    patientName: row.patient_name,
    expiresAt: parseTimestamp(row.expires_at),
    createdAt: parseTimestamp(row.created_at),
  }));

export type SentInvitation = z.output<typeof sentInvitationRowSchema>;

export const receivedInvitationRowSchema = z
  .object({
    id: z.uuid(),
    psychologist_name: z.string().nullable(),
    expires_at: z.string(),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    psychologistName: row.psychologist_name?.trim() || null,
    expiresAt: parseTimestamp(row.expires_at),
  }));

export type ReceivedInvitation = z.output<typeof receivedInvitationRowSchema>;

export const INVITATION_ERROR_CODES = [
  'invalid_input',
  'unauthorized',
  'not_psychologist',
  'invitation_unavailable',
  'already_linked',
  'rate_limited',
  'internal',
] as const;

export type InvitationErrorCode = (typeof INVITATION_ERROR_CODES)[number];

export class InvitationError extends Error {
  code: InvitationErrorCode;

  constructor(code: InvitationErrorCode) {
    super(code);
    this.name = 'InvitationError';
    this.code = code;
  }
}

export function toInvitationErrorCode(value: unknown): InvitationErrorCode {
  return INVITATION_ERROR_CODES.find((code) => code === value) ?? 'internal';
}

export function isExpired(invitation: { expiresAt: Date }, now = new Date()): boolean {
  return invitation.expiresAt.getTime() <= now.getTime();
}
