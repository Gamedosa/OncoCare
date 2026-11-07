import { useQuery } from '@tanstack/react-query';

import { getLinkedPsychologist } from './accountRepository';

export const accountKeys = {
  linkedPsychologist: (patientId: string) => ['account', 'linked-psychologist', patientId] as const,
};

export function useLinkedPsychologist(patientId: string) {
  return useQuery({
    queryKey: accountKeys.linkedPsychologist(patientId),
    queryFn: () => getLinkedPsychologist(patientId),
  });
}
