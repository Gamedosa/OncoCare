import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

export default function Index() {
  const auth = useAuth();
  if (auth.status === 'passwordRecovery') return <Redirect href="/reset-password" />;
  if (auth.status !== 'signedIn') return <Redirect href="/login" />;
  return <Redirect href={auth.profile.role === 'patient' ? '/patient' : '/psychologist'} />;
}
