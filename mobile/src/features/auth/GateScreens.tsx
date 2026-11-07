import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, colors, EmptyState, Screen } from '@/shared/ui';

import { useSignOut } from './hooks';

export function LoadingScreen() {
  return (
    <View style={styles.center} accessibilityLabel="Carregando" accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ProfileErrorScreen({ onRetry }: { onRetry: () => void }) {
  const signOut = useSignOut();
  return (
    <Screen>
      <EmptyState
        title="Não foi possível carregar sua conta."
        text="Verifique sua conexão e tente novamente."
        action={
          <View style={styles.actions}>
            <Button onPress={onRetry}>Tentar novamente</Button>
            <Button variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending}>
              Sair
            </Button>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  actions: { gap: 12 },
});
