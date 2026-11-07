import { supabase } from '@/shared/supabase/client';

import { linkedPatientRowSchema, sortPatients, type LinkedPatient } from './schemas';

// The psychologist filter states intent; RLS only returns patients linked to the signed-in psychologist,
// and the embedded entries are limited to the latest one per patient.
export async function listLinkedPatients(psychologistId: string): Promise<LinkedPatient[]> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('user_id, profile:profiles!patient_profiles_user_id_fkey(display_name), diary_entries(created_at)')
    .eq('psychologist_id', psychologistId)
    .order('created_at', { referencedTable: 'diary_entries', ascending: false })
    .limit(1, { referencedTable: 'diary_entries' });
  if (error) throw error;
  return sortPatients(linkedPatientRowSchema.array().parse(data));
}
