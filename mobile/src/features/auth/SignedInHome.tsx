import { StyleSheet, Text } from 'react-native';

import { Button, colors, font, Header, Screen } from '@/shared/ui';

import { useSignedInAuth } from './AuthProvider';
import { useSignOut } from './hooks';

export function SignedInHome() {
  const { profile } = useSignedInAuth();
  const signOut = useSignOut();
  return (
    <Screen header={<Header title={profile.displayName ? `Olá, ${profile.displayName}` : 'Olá'} />}>
      <Text style={styles.text}>{profile.role === 'patient' ? 'Área da paciente' : 'Área do psicólogo'}</Text>
      <Button variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending}>
        Sair
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: font.body, color: colors.textMuted },
});
