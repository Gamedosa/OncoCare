import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createLocalAudio } from './localAudio.native';

const mockFile = { exists: true, uri: 'file:///cache/synthetic.wav', writeSync: jest.fn(), delete: jest.fn() };
jest.mock('expo-file-system', () => ({
  File: jest.fn(() => mockFile),
  Paths: { cache: 'file:///cache/' },
}));

describe('native temporary playback file', () => {
  const originalReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
  beforeAll(() => {
    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      value: class {
        result: ArrayBuffer | null = null;
        onload: (() => void) | null = null;
        readAsArrayBuffer(blob: Blob) {
          void blob.arrayBuffer().then((bytes) => {
            this.result = bytes;
            this.onload?.();
          });
        }
      },
    });
  });
  afterAll(() => {
    if (originalReader) Object.defineProperty(globalThis, 'FileReader', originalReader);
    else Reflect.deleteProperty(globalThis, 'FileReader');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockFile.exists = true;
  });

  it('reads native Blob bytes, writes into cache and deletes on disposal', async () => {
    const audio = await createLocalAudio(new Blob(['synthetic'], { type: 'audio/wav' }));
    expect(audio.uri).toBe('file:///cache/synthetic.wav');
    expect(mockFile.writeSync).toHaveBeenCalledWith(expect.any(Uint8Array));
    audio.dispose();
    expect(mockFile.delete).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to delete an already removed file', async () => {
    const audio = await createLocalAudio(new Blob(['synthetic'], { type: 'audio/mp4' }));
    mockFile.exists = false;
    audio.dispose();
    expect(mockFile.delete).not.toHaveBeenCalled();
  });

  it('rejects unsupported formats before writing a file', async () => {
    await expect(createLocalAudio(new Blob(['synthetic'], { type: 'text/plain' }))).rejects.toThrow('Unsupported audio MIME type');
    expect(mockFile.writeSync).not.toHaveBeenCalled();
  });

  it('cleans up a partially written file on write failure', async () => {
    mockFile.writeSync.mockImplementationOnce(() => { throw new Error('write failed'); });
    await expect(createLocalAudio(new Blob(['synthetic'], { type: 'audio/wav' }))).rejects.toThrow('write failed');
    expect(mockFile.delete).toHaveBeenCalledTimes(1);
  });
});
