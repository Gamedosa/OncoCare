import { Button } from './Button';
import { EmptyState } from './EmptyState';

type Props = { title?: string; onRetry: () => void };

// Never render technical details here: errors may carry query data.
export function ErrorState({ title = 'Não foi possível carregar.', onRetry }: Props) {
  return (
    <EmptyState
      title={title}
      text="Verifique sua conexão e tente novamente."
      action={<Button onPress={onRetry}>Tentar novamente</Button>}
    />
  );
}
