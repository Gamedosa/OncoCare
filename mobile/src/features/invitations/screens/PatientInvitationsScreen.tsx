import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useLinkedPsychologist } from '@/features/account/hooks';
import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { formatDateTime } from '@/features/diary/format';
import {
  Button,
  Card,
  colors,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  font,
  Header,
  Notice,
  Screen,
  spacing,
} from '@/shared/ui';

import { respondErrorMessage } from '../errors';
import { useAcceptInvitation, useDeclineInvitation, useReceivedInvitations } from '../hooks';
import type { ReceivedInvitation } from '../schemas';

const UNNAMED = 'Profissional sem nome informado';

type Pending = { invitation: ReceivedInvitation; action: 'accept' | 'decline' };

export function PatientInvitationsScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const query = useReceivedInvitations();
  const linked = useLinkedPsychologist(profile.id);
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);
  const busy = accept.isPending || decline.isPending;

  const confirm = async () => {
    const current = pending;
    setPending(null);
    if (!current) return;
    setResult(null);
    try {
      if (current.action === 'accept') await accept.mutateAsync(current.invitation.id);
      else await decline.mutateAsync(current.invitation.id);
      setResult(current.action === 'accept' ? 'accepted' : 'declined');
    } catch {
      // Rendered below through respondErrorMessage.
    }
  };

  const currentName = linked.data ? linked.data.displayName ?? UNNAMED : null;
  const acceptMessage = (invitation: ReceivedInvitation) => {
    const name = invitation.psychologistName ?? UNNAMED;
    const base = `${name} poderá ler todos os seus relatos e ouvir seus áudios, incluindo os anteriores ao vínculo e os criados enquanto estiverem vinculados, sem editá-los.`;
    return currentName
      ? `${base} ${currentName} deixará de ter acesso aos seus relatos.`
      : `${base} Se você já tiver outro profissional vinculado, ele deixará de ter acesso aos seus relatos.`;
  };

  let body;
  if (query.isPending) {
    body = <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando convites" />;
  } else if (query.isError) {
    body = <ErrorState title="Não foi possível carregar os convites." onRetry={() => void query.refetch()} />;
  } else if (query.data.length === 0) {
    body = <EmptyState title="Nenhum convite pendente." text="Você pode continuar usando seu diário normalmente." />;
  } else {
    body = query.data.map((invitation) => (
      <Card key={invitation.id} style={styles.card}>
        <Text style={styles.name}>{invitation.psychologistName ?? UNNAMED}</Text>
        <Text style={styles.text}>
          convidou você para acompanhar seu diário. Se aceitar, poderá ler e ouvir seus relatos anteriores e futuros enquanto houver vínculo, sem editá-los.
        </Text>
        {currentName ? (
          <Text style={styles.text}>Ao aceitar, este convite substitui o acompanhamento atual com {currentName}.</Text>
        ) : null}
        <Text style={styles.detail}>Válido até {formatDateTime(invitation.expiresAt)}</Text>
        <View style={styles.actions}>
          <Button onPress={() => setPending({ invitation, action: 'accept' })} disabled={busy}
            loading={accept.isPending && accept.variables === invitation.id}>
            Aceitar
          </Button>
          <Button variant="secondary" onPress={() => setPending({ invitation, action: 'decline' })} disabled={busy}
            loading={decline.isPending && decline.variables === invitation.id}>
            Recusar
          </Button>
        </View>
      </Card>
    ));
  }

  return (
    <Screen header={<Header title="Convites" onBack={() => router.replace('/patient')} />}>
      <Text style={styles.intro}>A decisão é sua. Recusar não afeta seu diário nem sua conta.</Text>
      {result === 'accepted' ? <Notice tone="success">Convite aceito. O acompanhamento começou.</Notice> : null}
      {result === 'declined' ? <Notice tone="success">Convite recusado.</Notice> : null}
      {accept.isError ? <Notice tone="error">{respondErrorMessage(accept.error)}</Notice> : null}
      {decline.isError ? <Notice tone="error">{respondErrorMessage(decline.error)}</Notice> : null}
      {body}
      {result ? <Button variant="text" onPress={() => router.replace('/patient')}>Ir para meus relatos</Button> : null}
      <ConfirmDialog
        visible={pending !== null}
        title={pending?.action === 'accept' ? 'Aceitar acompanhamento?' : 'Recusar convite?'}
        message={pending?.action === 'accept' ? acceptMessage(pending.invitation)
          : 'Você continuará usando o diário normalmente, sem compartilhar seus relatos com este profissional.'}
        confirmLabel={pending?.action === 'accept' ? 'Aceitar' : 'Recusar'}
        cancelLabel="Voltar"
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: font.body, color: colors.textMuted },
  card: { gap: spacing.sm },
  name: { fontSize: font.body, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.text },
  detail: { fontSize: font.small, color: colors.textMuted },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
