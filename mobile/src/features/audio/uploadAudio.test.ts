import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { MAX_AUDIO_BYTES, removeUnattachedAudio, uploadAudio, validateRecording } from './audioRepository';
import type { RecordedAudio } from './recordingFile';

const mockUpload = jest.fn<(...args: unknown[]) => Promise<{
  data: { id: string; path: string } | null; error: Error | null;
}>>();
const mockRemove = jest.fn<(...args: unknown[]) => Promise<{
  data: { name: string }[] | null; error: Error | null;
}>>();
const mockUser = jest.fn<() => Promise<{ data: { user: { id: string } | null }; error: Error | null }>>();
const mockList = jest.fn<() => Promise<{ data: { name: string }[]; error: Error | null }>>();
const mockProfile = jest.fn<() => Promise<{ data: { role: string }; error: Error | null }>>();
jest.mock('@/shared/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ upload: mockUpload, remove: mockRemove, list: mockList }) },
    auth: { getUser: () => mockUser() },
    from: () => ({ select: () => ({ eq: () => ({ single: () => mockProfile() }) }) }),
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000010' }));
const PATIENT = '00000000-0000-4000-8000-000000000001';
const path = `${PATIENT}/00000000-0000-4000-8000-000000000010.m4a`;
const audio: RecordedAudio = {
  uri: 'file:///synthetic.m4a', bytes: new ArrayBuffer(2),
  contentType: 'audio/mp4', extension: 'm4a', dispose: jest.fn(),
};

describe('audio upload and cleanup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('uploads raw bytes under a random UUID without overwrite or caching', async () => {
    mockUpload.mockResolvedValue({
      data: { id: '00000000-0000-4000-8000-000000000010', path }, error: null,
    });
    await uploadAudio(PATIENT, audio);
    expect(mockUpload).toHaveBeenCalledWith(path, audio.bytes, {
      contentType: 'audio/mp4', upsert: false, cacheControl: '0',
    });
  });

  it('accepts exactly 10 MiB, rejects one byte over and empty bytes', () => {
    expect(() => validateRecording({ ...audio, bytes: new ArrayBuffer(MAX_AUDIO_BYTES) })).not.toThrow();
    expect(() => validateRecording({ ...audio, bytes: new ArrayBuffer(MAX_AUDIO_BYTES + 1) })).toThrow('10 MiB');
    expect(() => validateRecording({ ...audio, bytes: new ArrayBuffer(0) })).toThrow('vazio');
  });

  it('rejects incorrect format and extension pairs before uploading', async () => {
    await expect(uploadAudio(PATIENT, { ...audio, extension: 'mp3' })).rejects.toThrow('Formato');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('does not report deletion success if RLS returns no deleted files', async () => {
    mockRemove.mockResolvedValue({ data: [], error: null });
    await expect(removeUnattachedAudio(path)).rejects.toThrow('confirmar');
  });

  it('confirms deletion only for the requested path', async () => {
    mockRemove.mockResolvedValue({ data: [{ name: path }], error: null });
    await expect(removeUnattachedAudio(path)).resolves.toBeUndefined();
    expect(mockRemove).toHaveBeenCalledWith([path]);
  });

  it('confirms absence only for an authenticated owner with patient-role visibility', async () => {
    mockRemove.mockResolvedValue({ data: [], error: null });
    mockUser.mockResolvedValue({ data: { user: { id: PATIENT } }, error: null });
    mockProfile.mockResolvedValue({ data: { role: 'patient' }, error: null });
    mockList.mockResolvedValue({ data: [], error: null });
    await expect(removeUnattachedAudio(path)).resolves.toBeUndefined();
    mockList.mockResolvedValue({ data: [{ name: path.split('/')[1] }], error: null });
    await expect(removeUnattachedAudio(path)).rejects.toThrow('confirmar');
  });

  it('tries to clean up a failed upload whose request might have reached Storage', async () => {
    mockUpload.mockResolvedValue({ data: null, error: new Error('upload interrupted') });
    mockRemove.mockResolvedValue({ data: [{ name: path }], error: null });
    await expect(uploadAudio(PATIENT, audio)).rejects.toThrow('upload interrupted');
    expect(mockRemove).toHaveBeenCalledWith([path]);
  });
});
