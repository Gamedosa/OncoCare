import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { InvitationBanner } from '@/features/invitations/screens/InvitationBanner';
import { Button, Card, colors, EmptyState, font, Header, Notice, Screen, spacing } from '@/shared/ui';

import { DiaryDayList } from '../components/DiaryDayList';
import { useCleanDeletedAudio, usePendingAudioDeletions } from '../deletionHooks';
import { useDiaryDays } from '../dayHooks';

export function PatientHistoryScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const entries = useDiaryDays(profile.id);
  const pending = usePendingAudioDeletions();
  const cleanup = useCleanDeletedAudio();
  const attemptedCleanup = useRef(new Set<string>());
  useEffect(() => {
    if (!cleanup.isPending && pending.data?.some((item) => !attemptedCleanup.current.has(item.entry_id))) {
      for (const item of pending.data) attemptedCleanup.current.add(item.entry_id);
      cleanup.mutate();
    }
  }, [pending.data, cleanup.isPending, cleanup.mutate]);
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
      <DiaryDayList
        query={entries}
        onOpen={(day) => router.push({ pathname: '/patient/days/[day]', params: { day } })}
        header={
          <>
            <InvitationBanner />
            {pending.isError ? (
              <Notice tone="error">Não foi possível verificar se há áudios aguardando exclusão.</Notice>
            ) : null}
            {pending.isError ? <Button variant="secondary" onPress={() => void pending.refetch()}>Tentar novamente</Button> : null}
            {pending.data?.length ? (
              <Card style={styles.prompt}>
                <Notice tone={cleanup.isError ? 'error' : 'warning'}>
                  {cleanup.isError
                    ? 'Não foi possível excluir todos os áudios dos relatos removidos. Tente novamente.'
                    : 'Há áudios de relatos excluídos aguardando remoção. A limpeza será tentada automaticamente.'}
                </Notice>
                <Button variant="secondary" loading={cleanup.isPending} onPress={() => cleanup.mutate()}>
                  Excluir áudios pendentes
                </Button>
              </Card>
            ) : null}
            <Card style={styles.prompt}>
              <Text style={styles.promptTitle}>Como você está hoje?</Text>
              <Button onPress={newEntry}>Novo relato</Button>
            </Card>
          </>
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
