import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, ConfirmDialog, Header, Notice, Screen } from '@/shared/ui';

import { EntryContent } from '../components/EntryContent';
import { useDeleteEntry } from '../deletionHooks';
import { EntryLoader } from './EntryLoader';

export function PatientEntryDetailScreen() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const deletion = useDeleteEntry();
  return (
    <EntryLoader title="Relato">
      {(entry) => (
        <Screen header={<Header title="Relato" onBack={() => router.back()} />}>
          <EntryContent entry={entry} />
          {deletion.isError ? (
            <Notice tone="error">
              Não foi possível confirmar a exclusão. Verifique sua conexão e consulte o histórico antes de tentar novamente.
            </Notice>
          ) : null}
          <Button
            variant="secondary"
            disabled={deletion.isPending}
            onPress={() => router.push({ pathname: '/patient/entries/[id]/edit', params: { id: entry.id } })}
          >
            Editar
          </Button>
          <Button variant="danger" loading={deletion.isPending} onPress={() => setConfirming(true)}>
            Excluir relato
          </Button>
          <ConfirmDialog
            visible={confirming}
            title="Excluir relato?"
            message="O relato será excluído e deixará de estar disponível para você e para o psicólogo vinculado. Se houver áudio, ele também será removido. Esta ação não pode ser desfeita."
            confirmLabel="Excluir relato"
            cancelLabel="Voltar"
            destructive
            onCancel={() => setConfirming(false)}
            onConfirm={async () => {
              setConfirming(false);
              try {
                await deletion.mutateAsync(entry.id);
                router.replace('/patient');
              } catch {
                // The screen reports uncertain deletion outcomes.
              }
            }}
          />
        </Screen>
      )}
    </EntryLoader>
  );
}
