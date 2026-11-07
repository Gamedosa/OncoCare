import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountKeys } from '@/features/account/hooks';
import { useSignedInAuth } from '@/features/auth/AuthProvider';

import {
  acceptInvitation,
  declineInvitation,
  invitePatient,
  listMyInvitations,
  listSentInvitations,
  revokeInvitation,
} from './invitationsRepository';

export const invitationKeys = {
  sent: (psychologistId: string) => ['invitations', 'sent', psychologistId] as const,
  received: (patientId: string) => ['invitations', 'received', patientId] as const,
};

export function useSentInvitations() {
  const { profile } = useSignedInAuth();
  return useQuery({ queryKey: invitationKeys.sent(profile.id), queryFn: () => listSentInvitations(profile.id) });
}

export function useInvitePatient() {
  const { profile } = useSignedInAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: invitePatient,
    retry: false,
    onSettled: () => client.invalidateQueries({ queryKey: invitationKeys.sent(profile.id) }),
  });
}

export function useRevokeInvitation() {
  const { profile } = useSignedInAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: revokeInvitation,
    onSettled: () => client.invalidateQueries({ queryKey: invitationKeys.sent(profile.id) }),
  });
}

export function useReceivedInvitations() {
  const { profile } = useSignedInAuth();
  return useQuery({ queryKey: invitationKeys.received(profile.id), queryFn: listMyInvitations });
}

function useRespondToInvitation(respond: (invitationId: string) => Promise<void>) {
  const { profile } = useSignedInAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: respond,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: invitationKeys.received(profile.id) }),
        client.invalidateQueries({ queryKey: accountKeys.linkedPsychologist(profile.id) }),
      ]),
  });
}

export function useAcceptInvitation() {
  return useRespondToInvitation(acceptInvitation);
}

export function useDeclineInvitation() {
  return useRespondToInvitation(declineInvitation);
}
