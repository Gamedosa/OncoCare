export type LocalAudio = { uri: string; dispose: () => void };

export async function createLocalAudio(blob: Blob): Promise<LocalAudio> {
  const uri = URL.createObjectURL(blob);
  return { uri, dispose: () => URL.revokeObjectURL(uri) };
}
