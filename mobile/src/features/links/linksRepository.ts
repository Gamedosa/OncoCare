import { supabase } from '@/shared/supabase/client';

export type Link = { patientId: string; psychologistId: string };

export async function unlinkPatient({ patientId, psychologistId }: Link): Promise<void> {
  const { error } = await supabase.rpc('unlink_patient', {
    p_patient_id: patientId,
    p_psychologist_id: psychologistId,
  });
  if (error) throw error;
}
