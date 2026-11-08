import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { useSignOut } from '@/features/auth/hooks';
import { Button, Header, Notice, Screen } from '@/shared/ui';
import { DeleteAccountPanel } from './DeleteAccountPanel';

export function PendingAccountDeletionScreen() {
  const { profile } = useSignedInAuth();
  const signOut = useSignOut();
  return (
    <Screen header={<Header title="Exclusão de conta" />}>
      <DeleteAccountPanel role={profile.role} pending />
      {signOut.isError ? <Notice tone="error">Não foi possível sair. Tente novamente.</Notice> : null}
      <Button variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending}>Sair</Button>
    </Screen>
  );
}
