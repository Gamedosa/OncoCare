import { useMutation, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from '@/features/account/hooks';
import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { diaryKeys } from '@/features/diary/hooks';
import { patientKeys } from '@/features/patients/hooks';

import { unlinkPatient } from './linksRepository';

export function useUnlinkPatient() {
  const client = useQueryClient();
  const { profile } = useSignedInAuth();
  return useMutation({
    mutationFn: unlinkPatient,
    onSuccess: async (_data, link) => {
      if (profile.role === 'psychologist') {
        await client.cancelQueries({ queryKey: diaryKeys.all });
        client.removeQueries({ queryKey: diaryKeys.all });
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: accountKeys.linkedPsychologist(link.patientId) }),
        client.invalidateQueries({ queryKey: patientKeys.all }),
      ]);
    },
  });
}
