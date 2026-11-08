import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileQueryKey } from '@/features/auth/AuthProvider';

import { getAccountContact, getLinkedPsychologist, requestEmailChange, updateDisplayName } from './accountRepository';

export const accountKeys = {
  linkedPsychologist: (patientId: string) => ['account', 'linked-psychologist', patientId] as const,
  contact: (userId: string) => ['account', 'contact', userId] as const,
};

export function useAccountContact(userId: string) {
  return useQuery({ queryKey: accountKeys.contact(userId), queryFn: getAccountContact });
}
export function useUpdateDisplayName(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => updateDisplayName(userId, name),
    onSuccess: (profile) => {
      client.setQueryData(profileQueryKey(userId), profile);
      void client.invalidateQueries({ queryKey: ['account'] });
      void client.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
export function useRequestEmailChange(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestEmailChange,
    onSuccess: (contact) => client.setQueryData(accountKeys.contact(userId), contact),
  });
}
export function useLinkedPsychologist(patientId: string) {
  return useQuery({
    queryKey: accountKeys.linkedPsychologist(patientId),
    queryFn: () => getLinkedPsychologist(patientId),
  });
}
