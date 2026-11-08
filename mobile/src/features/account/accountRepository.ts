import { z } from 'zod';
import { createURL } from 'expo-linking';

import { supabase } from '@/shared/supabase/client';
import { emailSchema, profileSchema, type Profile } from '@/features/auth/schemas';
import { accountContactSchema, displayNameSchema, type AccountContact } from './profileSchemas';

export type LinkedPsychologist = { id: string; displayName: string | null };

const linkRowSchema = z.object({ psychologist_id: z.uuid().nullable() });
const nameRowSchema = z.object({ display_name: z.string().nullable() });

export async function updateDisplayName(userId: string, name: string): Promise<Profile> {
  const displayName = displayNameSchema.parse(name);
  const { data, error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId)
    .select('id, role, display_name, deletion_requested_at').single();
  if (error) throw error;
  return profileSchema.parse(data);
}

export async function getAccountContact(): Promise<AccountContact> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return accountContactSchema.parse(data.user);
}

export async function requestEmailChange(email: string): Promise<AccountContact> {
  const { data, error } = await supabase.auth.updateUser({ email: emailSchema.parse(email) }, {
    emailRedirectTo: createURL('/confirm-email'),
  });
  if (error) throw error;
  return accountContactSchema.parse(data.user);
}
// Two RLS-allowed reads: the patient's own link row, then the linked psychologist's profile.
export async function getLinkedPsychologist(patientId: string): Promise<LinkedPsychologist | null> {
  const link = await supabase.from('patient_profiles').select('psychologist_id').eq('user_id', patientId).maybeSingle();
  if (link.error) throw link.error;
  const psychologistId = link.data ? linkRowSchema.parse(link.data).psychologist_id : null;
  if (!psychologistId) return null;

  const profile = await supabase.from('profiles').select('display_name').eq('id', psychologistId).maybeSingle();
  if (profile.error) throw profile.error;
  const displayName = profile.data ? nameRowSchema.parse(profile.data).display_name?.trim() || null : null;
  return { id: psychologistId, displayName };
}
