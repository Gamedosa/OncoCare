import { FunctionsHttpError } from '@supabase/supabase-js';
import { createURL } from 'expo-linking';

import { supabase } from '@/shared/supabase/client';

import {
  InvitationError,
  receivedInvitationRowSchema,
  sentInvitationRowSchema,
  toInvitationErrorCode,
  type InviteForm,
  type ReceivedInvitation,
  type SentInvitation,
} from './schemas';

// Creating accounts needs the Auth admin API, so invitations go through the invite-patient Edge Function.
export async function invitePatient({ name, email }: InviteForm): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-patient', {
    body: { name, email, redirectTo: createURL('/accept-invite') },
  });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    const body: unknown = await (error.context as Response).json().catch(() => null);
    throw new InvitationError(toInvitationErrorCode((body as { error?: unknown } | null)?.error));
  }
  throw error;
}

function rpcError(error: { message: string }): unknown {
  return error.message === 'invitation_unavailable' ? new InvitationError('invitation_unavailable') : error;
}

// RLS only returns invitations sent by the signed-in psychologist.
export async function listSentInvitations(psychologistId: string): Promise<SentInvitation[]> {
  const { data, error } = await supabase
    .from('patient_invitations')
    .select('id, email, patient_name, expires_at, created_at')
    .eq('psychologist_id', psychologistId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return sentInvitationRowSchema.array().parse(data);
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_patient_invitation', { p_invitation_id: invitationId });
  if (error) throw rpcError(error);
}

export async function listMyInvitations(): Promise<ReceivedInvitation[]> {
  const { data, error } = await supabase.rpc('list_my_patient_invitations');
  if (error) throw error;
  return receivedInvitationRowSchema.array().parse(data);
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_patient_invitation', { p_invitation_id: invitationId });
  if (error) throw rpcError(error);
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('decline_patient_invitation', { p_invitation_id: invitationId });
  if (error) throw rpcError(error);
}
