import { supabase } from '@/shared/supabase/client';
import { z } from 'zod';
import { randomUUID } from 'expo-crypto';
import type { RecordedAudio } from './recordingFile';

export const AUDIO_BUCKET = 'diary-audio';
export const MAX_AUDIO_BYTES = 10_485_760;

export function validateRecording(audio: Pick<RecordedAudio, 'bytes' | 'contentType' | 'extension'>) {
  if (audio.bytes.byteLength === 0) throw new Error('O áudio está vazio. Grave novamente.');
  if (audio.bytes.byteLength > MAX_AUDIO_BYTES) throw new Error('O áudio ultrapassa 10 MiB. Grave um áudio menor.');
  if (!((audio.extension === 'm4a' && audio.contentType === 'audio/mp4') ||
    (audio.extension === 'webm' && audio.contentType === 'audio/webm'))) {
    throw new Error('Formato de gravação não suportado.');
  }
}

export type UploadedAudio = { id: string; path: string };

export class AudioUploadRecoveryError extends Error {
  constructor(readonly path: string) {
    super('Não foi possível confirmar a limpeza do envio interrompido.');
  }
}

export async function uploadAudio(patientId: string, audio: RecordedAudio): Promise<UploadedAudio> {
  validateRecording(audio);
  z.uuid().parse(patientId);
  const path = `${patientId}/${randomUUID().toLowerCase()}.${audio.extension}`;
  try {
    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, audio.bytes, {
      contentType: audio.contentType, upsert: false, cacheControl: '0',
    });
    if (error) throw error;
    if (data.path !== path) throw new Error('Unexpected uploaded audio path');
    return { id: z.uuid().parse(data.id), path };
  } catch (error) {
    try {
      await removeUnattachedAudio(path);
    } catch {
      throw new AudioUploadRecoveryError(path);
    }
    throw error;
  }
}

export async function removeUnattachedAudio(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).remove([path]);
  if (error) throw error;
  if (!data?.some((file) => file.name === path)) {
    // Zero deleted rows can mean either absence or an RLS denial. Verify own visibility before treating it as absent.
    const [folder, filename] = path.split('/');
    const user = await supabase.auth.getUser();
    if (user.error || user.data.user?.id !== folder || !filename) {
      throw new Error('Não foi possível confirmar a remoção do áudio.');
    }
    const profile = await supabase.from('profiles').select('role').eq('id', folder).single();
    if (profile.error || profile.data.role !== 'patient') throw new Error('Não foi possível confirmar a remoção do áudio.');
    const remaining = await supabase.storage.from(AUDIO_BUCKET).list(folder, { search: filename, limit: 1 });
    if (remaining.error || !remaining.data || remaining.data.some((file) => file.name === filename)) {
      throw new Error('Não foi possível confirmar a remoção do áudio.');
    }
  }
}

export async function downloadAudio(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(path);
  if (error) throw error;
  if (!data || data.size === 0 || data.size > MAX_AUDIO_BYTES) {
    throw new Error('Invalid audio download size');
  }
  return data;
}
