import { File, Paths } from 'expo-file-system';

import { disposeAudio } from './cleanup';
import type { LocalAudio } from './localAudio';

const extensionByMime: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

export async function createLocalAudio(blob: Blob): Promise<LocalAudio> {
  const extension = extensionByMime[blob.type.split(';')[0].toLowerCase()];
  if (!extension) throw new Error('Unsupported audio MIME type');
  // React Native Blob does not implement arrayBuffer(); FileReader does.
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('Invalid audio bytes'));
        return;
      }
      resolve(new Uint8Array(reader.result));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read audio bytes'));
    reader.onabort = () => reject(new Error('Audio read aborted'));
    reader.readAsArrayBuffer(blob);
  });
  // Unique cache file per mounted player; never use names or health data in filenames.
  const file = new File(Paths.cache, `diary-playback-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  const dispose = () => {
    if (file.exists) file.delete();
  };
  try {
    file.writeSync(bytes);
  } catch (error) {
    disposeAudio({ uri: file.uri, dispose });
    throw error;
  }
  return { uri: file.uri, dispose };
}
