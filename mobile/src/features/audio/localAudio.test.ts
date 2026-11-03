import { describe, expect, it, jest } from '@jest/globals';

// The native Jest preset otherwise resolves this import to the .native implementation.
const { createLocalAudio } = jest.requireActual<typeof import('./localAudio')>('./localAudio.ts');

describe('web temporary playback URL', () => {
  it('keeps the blob local and revokes its URL on disposal', async () => {
    const blob = new Blob(['synthetic'], { type: 'audio/wav' });
    const create = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic');
    const revoke = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    try {
      const audio = await createLocalAudio(blob);
      expect(create).toHaveBeenCalledWith(blob);
      expect(audio.uri).toBe('blob:synthetic');
      audio.dispose();
      expect(revoke).toHaveBeenCalledWith('blob:synthetic');
    } finally {
      create.mockRestore();
      revoke.mockRestore();
    }
  });
});
