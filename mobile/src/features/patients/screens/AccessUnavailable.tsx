import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { Button, EmptyState } from '@/shared/ui';

import { patientKeys } from '../hooks';

// Neutral message for when a link was removed or the content is otherwise hidden by RLS.
export function AccessUnavailable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const backToList = () => {
    void queryClient.invalidateQueries({ queryKey: patientKeys.all });
    router.dismissTo('/psychologist');
  };
  return (
    <EmptyState
      title="Este conteúdo não está mais disponível para você."
      text="A lista de pacientes será atualizada."
      action={
        <Button variant="secondary" onPress={backToList}>
          Voltar para pacientes
        </Button>
      }
    />
  );
}
