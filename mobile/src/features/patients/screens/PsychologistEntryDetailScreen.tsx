import { useLocalSearchParams, useRouter } from 'expo-router';

import { EntryContent } from '@/features/diary/components/EntryContent';
import { EntryLoader } from '@/features/diary/screens/EntryLoader';
import { Header, Notice, Screen } from '@/shared/ui';

import { AccessUnavailable } from './AccessUnavailable';

export function PsychologistEntryDetailScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  return (
    <EntryLoader title="Relato" notFound={<AccessUnavailable />}>
      {(entry) => (
        <Screen header={<Header title="Relato" onBack={() => router.back()} />}>
          {entry.patientId === patientId ? (
            <>
              <Notice>Visualização somente leitura</Notice>
              <EntryContent entry={entry} />
            </>
          ) : (
            <AccessUnavailable />
          )}
        </Screen>
      )}
    </EntryLoader>
  );
}
