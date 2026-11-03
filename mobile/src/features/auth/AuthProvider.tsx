import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchProfile, getSession, onSessionChange } from './authRepository';
import type { Profile } from './schemas';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'profileError'; retry: () => void }
  | { status: 'signedIn'; session: Session; profile: Profile };

const AuthContext = createContext<AuthState | null>(null);

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    getSession()
      .catch(() => null)
      .then((current) => {
        if (!active) return;
        setSession(current);
        setRestored(true);
      });
    const unsubscribe = onSessionChange((next) => {
      setSession(next);
      // Drop every cached diary/profile query so nothing leaks to the next account.
      if (!next) queryClient.clear();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id;
  const profile = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const value = useMemo<AuthState>(() => {
    if (!restored) return { status: 'loading' };
    if (!session) return { status: 'signedOut' };
    if (profile.data) return { status: 'signedIn', session, profile: profile.data };
    if (profile.isError) return { status: 'profileError', retry: () => void profile.refetch() };
    return { status: 'loading' };
  }, [restored, session, profile.data, profile.isError, profile.refetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function useSignedInAuth() {
  const auth = useAuth();
  if (auth.status !== 'signedIn') throw new Error('useSignedInAuth requires a signed-in user');
  return auth;
}
