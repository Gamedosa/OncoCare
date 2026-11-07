import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EntryList } from '@/features/diary/components/EntryList';
import { useEntries } from '@/features/diary/hooks';
import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { unlinkErrorMessage } from '@/features/links/errors';
import { useUnlinkPatient } from '@/features/links/hooks';
import { Button, colors, ConfirmDialog, EmptyState, ErrorState, Header, Notice, Screen, spacing } from '@/shared/ui';

import { useLinkedPatient } from '../hooks';
import { patientName } from '../schemas';
import { AccessUnavailable } from './AccessUnavailable';

export function PatientEntriesScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { profile } = useSignedInAuth();
  const patient = useLinkedPatient(patientId);
  const entries = useEntries(patientId);
  const unlink = useUnlinkPatient();
  const [confirming, setConfirming] = useState(false);

  const back = () => router.back();
  const confirmUnlink = async () => {
    setConfirming(false);
    try {
      await unlink.mutateAsync({ patientId, psychologistId: profile.id });
      router.replace('/psychologist');
    } catch {
      // The error is shown below.
    }
  };

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
            {unlink.isError ? <Notice tone="error">{unlinkErrorMessage(unlink.error)}</Notice> : null}
            <Button variant="secondary" loading={unlink.isPending} onPress={() => {
              unlink.reset();
              setConfirming(true);
            }}>
              Encerrar vínculo
            </Button>
            <ConfirmDialog
              visible={confirming}
              title="Encerrar vínculo?"
              message="Ao confirmar, você não poderá mais acessar os relatos e áudios desta paciente pelo aplicativo. Os registros continuarão disponíveis para ela."
              confirmLabel="Encerrar vínculo"
              cancelLabel="Voltar"
              destructive
              onConfirm={confirmUnlink}
              onCancel={() => setConfirming(false)}
            />
          </View>
        }
        empty={<EmptyState title="Esta paciente ainda não registrou relatos." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: spacing.sm, gap: spacing.sm },
});
