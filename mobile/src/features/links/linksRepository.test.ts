import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { unlinkPatient } from './linksRepository';

const mockRpc = jest.fn<(name: string, args: { p_patient_id: string; p_psychologist_id: string }) => Promise<{ error: unknown }>>();
jest.mock('@/shared/supabase/client', () => ({
  supabase: { rpc: (name: string, args: { p_patient_id: string; p_psychologist_id: string }) => mockRpc(name, args) },
}));

describe('unlinkPatient', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('passes both confirmed IDs to the server', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await unlinkPatient({ patientId: 'patient', psychologistId: 'psychologist' });
    expect(mockRpc).toHaveBeenCalledWith('unlink_patient', {
      p_patient_id: 'patient',
      p_psychologist_id: 'psychologist',
    });
  });

  it('propagates server errors', async () => {
    const error = { code: 'P0002' };
    mockRpc.mockResolvedValue({ error });
    await expect(unlinkPatient({ patientId: 'patient', psychologistId: 'psychologist' })).rejects.toBe(error);
  });
});
