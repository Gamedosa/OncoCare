import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EntryList } from '@/features/diary/components/EntryList';
import { useEntries } from '@/features/diary/hooks';
import { colors, EmptyState, ErrorState, Header, Notice, Screen, spacing } from '@/shared/ui';

import { useLinkedPatient } from '../hooks';
import { patientName } from '../schemas';
import { AccessUnavailable } from './AccessUnavailable';

export function PatientEntriesScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useLinkedPatient(patientId);
  const entries = useEntries(patientId);

  const back = () => router.back();

  if (patient.isPending) {
    return (
      <Screen header={<Header title="Relatos" onBack={back} />}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando paciente" />
      </Screen>
    );
  }
  if (patient.isError) {
    return (
      <Screen header={<Header title="Relatos" onBack={back} />}>
        <ErrorState title="Não foi possível carregar a paciente." onRetry={() => void patient.refetch()} />
      </Screen>
    );
  }
  if (!patient.data) {
    return (
      <Screen header={<Header title="Relatos" onBack={back} />}>
        <AccessUnavailable />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} header={<Header title={patientName(patient.data)} onBack={back} />}>
      <EntryList
        query={entries}
        onOpen={(entry) =>
          router.push({
            pathname: '/psychologist/patients/[patientId]/entries/[id]',
            params: { patientId, id: entry.id },
          })
        }
        header={
          <View style={styles.notice}>
            <Notice>Visualização somente leitura</Notice>
          </View>
        }
        empty={<EmptyState title="Esta paciente ainda não registrou relatos." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: spacing.sm },
});
