import type { LocalAudio } from './localAudio';
import { MAX_AUDIO_BYTES } from './audioRepository';

export type RecordedAudio = LocalAudio & { bytes: ArrayBuffer; contentType: string; extension: string };

export function discardRecording(uri: string) {
  URL.revokeObjectURL(uri);
}

export async function readRecording(uri: string): Promise<RecordedAudio> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read recording');
  const blob = await response.blob();
  if (blob.size > MAX_AUDIO_BYTES) throw new Error('O áudio ultrapassa 10 MiB. Grave um áudio menor.');
  const contentType = blob.type.split(';')[0].toLowerCase();
  const extension = contentType === 'audio/mp4' ? 'm4a' : contentType === 'audio/webm' ? 'webm' : null;
  if (!extension) throw new Error('Unsupported recording format');
  return { uri, bytes: await blob.arrayBuffer(), contentType, extension, dispose: () => discardRecording(uri) };
}
