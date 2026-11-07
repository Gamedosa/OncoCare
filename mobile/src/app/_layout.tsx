import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { LoadingScreen, ProfileErrorScreen } from '@/features/auth/GateScreens';
import { QueryProvider } from '@/shared/query/QueryProvider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="dark" />
    </QueryProvider>
  );
}

// Guards only decide navigation; data access is enforced by RLS in Supabase.
function RootNavigator() {
  const auth = useAuth();
  const segments = useSegments();
  // Link callbacks keep their screen state while the session or profile changes underneath them.
  const isAuthLinkRoute = segments[0] === 'reset-password' || segments[0] === 'accept-invite';
  if (auth.status === 'loading' && !isAuthLinkRoute) return <LoadingScreen />;
  if (auth.status === 'profileError' && !isAuthLinkRoute) return <ProfileErrorScreen onRetry={auth.retry} />;

  const role = auth.status === 'signedIn' ? auth.profile.role : null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="accept-invite" />
      <Stack.Protected guard={role === null && auth.status !== 'passwordRecovery'}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'patient'}>
        <Stack.Screen name="patient" />
      </Stack.Protected>
      <Stack.Protected guard={role === 'psychologist'}>
        <Stack.Screen name="psychologist" />
      </Stack.Protected>
    </Stack>
  );
}
