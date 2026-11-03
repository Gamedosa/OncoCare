import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { Button, Card, colors, EmptyState, font, Header, Screen, spacing } from '@/shared/ui';

import { EntryList } from '../components/EntryList';
import { useEntries } from '../hooks';

export function PatientHistoryScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const entries = useEntries(profile.id);
  const newEntry = () => router.push('/patient/new');

  return (
    <Screen
      scroll={false}
      header={
        <Header
          title="Meus relatos"
          right={
            <Button variant="text" onPress={() => router.push('/patient/account')}>
              Conta
            </Button>
          }
        />
      }
    >
      <EntryList
        query={entries}
        onOpen={(entry) => router.push({ pathname: '/patient/entries/[id]', params: { id: entry.id } })}
        header={
          <Card style={styles.prompt}>
            <Text style={styles.promptTitle}>Como você está hoje?</Text>
            <Button onPress={newEntry}>Novo relato</Button>
          </Card>
        }
        empty={
          <EmptyState
            title="Seu diário está esperando por você."
            text="Quando quiser, registre como foi o seu dia. Você escolhe o que contar."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: spacing.md, marginBottom: spacing.sm },
  promptTitle: { fontSize: font.title, fontWeight: '800', color: colors.text },
});
