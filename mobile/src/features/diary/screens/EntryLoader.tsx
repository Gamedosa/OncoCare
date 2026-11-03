import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { Button, colors, EmptyState, ErrorState, Header, Screen } from '@/shared/ui';

import { useEntry } from '../hooks';
import type { DiaryEntry } from '../schemas';

type Props = { title: string; notFound?: ReactNode; children: (entry: DiaryEntry) => ReactNode };

// Shared loading / not found / error handling for screens that show one entry.
export function EntryLoader({ title, notFound, children }: Props) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEntry(id);

  if (query.data) return children(query.data);

  let body: ReactNode;
  if (query.isPending) body = <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando relato" />;
  else if (query.isError) body = <ErrorState title="Não foi possível carregar o relato." onRetry={() => void query.refetch()} />;
  else if (notFound) body = notFound;
  else
    body = (
      <EmptyState
        title="Relato não encontrado."
        text="Ele pode não estar mais disponível para você."
        action={
          <Button variant="secondary" onPress={() => router.back()}>
            Voltar
          </Button>
        }
      />
    );

  return <Screen header={<Header title={title} onBack={() => router.back()} />}>{body}</Screen>;
}
