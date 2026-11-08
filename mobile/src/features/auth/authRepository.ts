import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createURL } from 'expo-linking';

import { supabase } from '@/shared/supabase/client';

import { profileSchema, type Credentials, type Profile } from './schemas';

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onSessionChange(listener: (session: Session | null, event: AuthChangeEvent) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => listener(session, event));
  return () => data.subscription.unsubscribe();
}

export async function signIn({ email, password }: Credentials): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
}

export async function signOutLocally(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: createURL('/reset-password') });
  if (error) throw error;
}

export async function verifyRecoveryLink(tokenHash: string): Promise<void> {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (error) throw error;
  if (!data.session) throw new Error('Recovery session missing');
}

export async function verifyInviteLink(tokenHash: string): Promise<void> {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'invite' });
  if (error) throw error;
  if (!data.session) throw new Error('Invite session missing');
}

export async function verifyEmailChangeLink(tokenHash: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email_change' });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('id, role, display_name, deletion_requested_at').eq('id', userId).single();
  if (error) throw error;
  return profileSchema.parse(data);
}
