import { File } from 'expo-file-system';

import type { RecordedAudio } from './recordingFile';
import { MAX_AUDIO_BYTES } from './audioRepository';

export function discardRecording(uri: string) {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function readRecording(uri: string): Promise<RecordedAudio> {
  const file = new File(uri);
  if (file.size > MAX_AUDIO_BYTES) throw new Error('O áudio ultrapassa 10 MiB. Grave um áudio menor.');
  return {
    uri,
    bytes: await file.arrayBuffer(),
    contentType: 'audio/mp4',
    extension: 'm4a',
    dispose: () => discardRecording(uri),
  };
}
