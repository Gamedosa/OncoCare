import { useMutation } from '@tanstack/react-query';

import { requestPasswordReset, signIn, signOut, updateRecoveredPassword, verifyRecoveryLink } from './authRepository';

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

export function useUpdateRecoveredPassword() {
  return useMutation({ mutationFn: updateRecoveredPassword, gcTime: 0, retry: false });
}

export function useFinishPasswordRecovery() {
  return useMutation({ mutationFn: signOut, gcTime: 0, retry: false });
}
