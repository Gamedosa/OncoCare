import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { downloadAudio, MAX_AUDIO_BYTES } from './audioRepository';

const mockDownload = jest.fn<(path: string) => Promise<{ data: Blob | null; error: Error | null }>>();
const mockFrom = jest.fn((_bucket: string) => ({ download: mockDownload }));
jest.mock('@/shared/supabase/client', () => ({ supabase: { storage: { from: (bucket: string) => mockFrom(bucket) } } }));

describe('downloadAudio', () => {
  beforeEach(() => {
    mockDownload.mockReset();
    mockFrom.mockClear();
  });

  it('uses the authenticated download from the private bucket', async () => {
    const audio = new Blob(['synthetic']);
    mockDownload.mockResolvedValue({ data: audio, error: null });
    expect(await downloadAudio('patient/file.wav')).toBe(audio);
    expect(mockFrom).toHaveBeenCalledWith('diary-audio');
    expect(mockDownload).toHaveBeenCalledWith('patient/file.wav');
  });

  it('propagates access and network errors without returning a URL', async () => {
    const error = new Error('denied');
    mockDownload.mockResolvedValue({ data: null, error });
    await expect(downloadAudio('patient/file.wav')).rejects.toBe(error);
  });

  it('accepts exactly 10 MiB and rejects one byte more', async () => {
    const exact = new Blob(['x'.repeat(MAX_AUDIO_BYTES)]);
    mockDownload.mockResolvedValue({ data: exact, error: null });
    expect(await downloadAudio('patient/file.wav')).toBe(exact);
    mockDownload.mockResolvedValue({ data: new Blob(['x'.repeat(MAX_AUDIO_BYTES + 1)]), error: null });
    await expect(downloadAudio('patient/file.wav')).rejects.toThrow('Invalid audio download size');
  });

  it('rejects empty or missing downloads', async () => {
    mockDownload.mockResolvedValue({ data: new Blob([]), error: null });
    await expect(downloadAudio('patient/file.wav')).rejects.toThrow();
    mockDownload.mockResolvedValue({ data: null, error: null });
    await expect(downloadAudio('patient/file.wav')).rejects.toThrow();
  });
});
