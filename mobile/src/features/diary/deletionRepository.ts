import { z } from 'zod';

import { supabase } from '@/shared/supabase/client';

const pendingSchema = z.object({ entry_id: z.uuid(), audio_path: z.string() });
export type PendingDeletion = z.infer<typeof pendingSchema>;

export async function deleteOwnEntry(entryId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_own_diary_entry', { p_entry_id: entryId });
  if (error) throw error;
}

export async function listPendingAudioDeletions(): Promise<PendingDeletion[]> {
  const { data, error } = await supabase.from('diary_audio_deletion_queue').select('entry_id, audio_path');
  if (error) throw error;
  return pendingSchema.array().parse(data);
}

export async function finishAudioDeletion(entryId: string): Promise<void> {
  const { error } = await supabase.rpc('finish_diary_audio_deletion', { p_entry_id: entryId });
  if (error) throw error;
}
