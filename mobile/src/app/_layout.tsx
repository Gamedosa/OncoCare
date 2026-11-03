import { Stack } from 'expo-router';
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
  if (auth.status === 'loading') return <LoadingScreen />;
  if (auth.status === 'profileError') return <ProfileErrorScreen onRetry={auth.retry} />;

  const role = auth.status === 'signedIn' ? auth.profile.role : null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={role === null}>
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
