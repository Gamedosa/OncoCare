import { supabase } from '@/shared/supabase/client';

export const AUDIO_BUCKET = 'diary-audio';
export const MAX_AUDIO_BYTES = 10_485_760;

export async function downloadAudio(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(path);
  if (error) throw error;
  if (!data || data.size === 0 || data.size > MAX_AUDIO_BYTES) {
    throw new Error('Invalid audio download size');
  }
  return data;
}
