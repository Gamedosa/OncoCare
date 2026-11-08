import { useMutation } from '@tanstack/react-query';

import { requestPasswordReset, signIn, signOut, updatePassword, verifyEmailChangeLink, verifyInviteLink, verifyRecoveryLink } from './authRepository';

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useVerifyRecoveryLink(tokenHash: () => string) {
  return useMutation({ mutationFn: () => verifyRecoveryLink(tokenHash()), gcTime: 0, retry: false });
}

export function useVerifyInviteLink(tokenHash: () => string) {
  return useMutation({ mutationFn: () => verifyInviteLink(tokenHash()), gcTime: 0, retry: false });
}

export function useVerifyEmailChangeLink(tokenHash: () => string) {
  return useMutation({ mutationFn: () => verifyEmailChangeLink(tokenHash()), gcTime: 0, retry: false });
}
export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword, gcTime: 0, retry: false });
}

export function useFinishPasswordRecovery() {
  return useMutation({ mutationFn: signOut, gcTime: 0, retry: false });
}
