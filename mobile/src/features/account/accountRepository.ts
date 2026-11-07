import { z } from 'zod';

import { supabase } from '@/shared/supabase/client';

export type LinkedPsychologist = { id: string; displayName: string | null };

const linkRowSchema = z.object({ psychologist_id: z.uuid().nullable() });
const nameRowSchema = z.object({ display_name: z.string().nullable() });

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
