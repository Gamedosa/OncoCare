import { useRouter } from 'expo-router';

import { Button, Header, Screen } from '@/shared/ui';

import { EntryContent } from '../components/EntryContent';
import { EntryLoader } from './EntryLoader';

export function PatientEntryDetailScreen() {
  const router = useRouter();
  return (
    <EntryLoader title="Relato">
      {(entry) => (
        <Screen header={<Header title="Relato" onBack={() => router.back()} />}>
          <EntryContent entry={entry} />
          <Button
            variant="secondary"
            onPress={() => router.push({ pathname: '/patient/entries/[id]/edit', params: { id: entry.id } })}
          >
            Editar
          </Button>
        </Screen>
      )}
    </EntryLoader>
  );
}
