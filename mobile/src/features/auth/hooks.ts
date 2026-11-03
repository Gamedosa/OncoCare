import { useMutation } from '@tanstack/react-query';

import { requestPasswordReset, signIn, signOut } from './authRepository';

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}
