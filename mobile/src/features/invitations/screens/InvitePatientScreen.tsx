import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

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
  TextField,
} from '@/shared/ui';

import { inviteErrorMessage } from '../errors';
import { useInvitePatient, useRevokeInvitation, useSentInvitations } from '../hooks';
import { inviteFormSchema, isExpired, type SentInvitation } from '../schemas';

const SENT_MESSAGE =
  'Convite enviado. Se a paciente ainda não tem conta, ela receberá um e-mail para criar a senha; ' +
  'se já tem, verá o convite ao entrar no aplicativo. O vínculo só começa quando ela aceitar.';

export function InvitePatientScreen() {
  const router = useRouter();
  const invite = useInvitePatient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (invite.isPending) return;
    setSent(false);
    const parsed = inviteFormSchema.safeParse({ name, email });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ name: fieldErrors.name?.[0], email: fieldErrors.email?.[0] });
      return;
    }
    setErrors({});
    try {
      await invite.mutateAsync(parsed.data);
      setName('');
      setEmail('');
      setSent(true);
    } catch {
      // Rendered below through inviteErrorMessage.
    }
  };

  return (
    <Screen header={<Header title="Convidar paciente" onBack={() => router.back()} />}>
      <Text style={styles.intro}>
        A paciente recebe o convite e decide se aceita. Ao aceitar, você poderá ler e ouvir os relatos dela, sem
        editá-los. Se ela já estiver vinculada a outro profissional, o vínculo será transferido para você.
      </Text>
      <TextField
        label="Nome da paciente"
        value={name}
        onChangeText={setName}
        autoComplete="off"
        error={errors.name}
        editable={!invite.isPending}
      />
      <TextField
        label="E-mail da paciente"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        error={errors.email}
        editable={!invite.isPending}
      />
      {sent ? <Notice tone="success">{SENT_MESSAGE}</Notice> : null}
      {invite.isError ? <Notice tone="error">{inviteErrorMessage(invite.error)}</Notice> : null}
      <Button onPress={submit} loading={invite.isPending}>Enviar convite</Button>
      <PendingInvitations />
    </Screen>
  );
}

function PendingInvitations() {
  const query = useSentInvitations();
  const resend = useInvitePatient();
  const revoke = useRevokeInvitation();
  const [toRevoke, setToRevoke] = useState<SentInvitation | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  const resendTo = async (invitation: SentInvitation) => {
    setResent(null);
    try {
      await resend.mutateAsync({ name: invitation.patientName, email: invitation.email });
      setResent(invitation.id);
    } catch {
      // Rendered below through inviteErrorMessage.
    }
  };

  const confirmRevoke = async () => {
    const invitation = toRevoke;
    setToRevoke(null);
    if (!invitation) return;
    try {
      await revoke.mutateAsync(invitation.id);
    } catch {
      // Rendered below.
    }
  };

  let body;
  if (query.isPending) {
    body = <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando convites" />;
  } else if (query.isError) {
    body = <ErrorState title="Não foi possível carregar os convites." onRetry={() => void query.refetch()} />;
  } else if (query.data.length === 0) {
    body = <EmptyState title="Nenhum convite pendente." text="Os convites aguardando resposta aparecem aqui." />;
  } else {
    body = query.data.map((invitation) => {
      const expired = isExpired(invitation);
      const busy = resend.isPending && resend.variables?.email === invitation.email;
      return (
        <Card key={invitation.id} style={styles.card}>
          <Text style={styles.name}>{invitation.patientName}</Text>
          <Text style={styles.detail}>{invitation.email}</Text>
          <Text style={[styles.detail, expired && styles.expired]}>
            {expired ? 'Convite expirado' : `Válido até ${formatDateTime(invitation.expiresAt)}`}
          </Text>
          {resent === invitation.id ? <Notice tone="success">Convite reenviado.</Notice> : null}
          <View style={styles.actions}>
            <Button variant="secondary" onPress={() => resendTo(invitation)} loading={busy}
              disabled={resend.isPending || revoke.isPending}>
              Reenviar
            </Button>
            <Button variant="text" onPress={() => setToRevoke(invitation)}
              disabled={resend.isPending || revoke.isPending}>
              Cancelar convite
            </Button>
          </View>
        </Card>
      );
    });
  }

  return (
    <View style={styles.pending}>
      <Text accessibilityRole="header" style={styles.section}>Convites pendentes</Text>
      {resend.isError ? <Notice tone="error">{inviteErrorMessage(resend.error)}</Notice> : null}
      {revoke.isError ? <Notice tone="error">Não foi possível cancelar o convite. Tente novamente.</Notice> : null}
      {body}
      <ConfirmDialog
        visible={toRevoke !== null}
        title="Cancelar convite?"
        message="A paciente não poderá mais aceitar este convite. A conta dela, se já existir, continua ativa."
        confirmLabel="Cancelar convite"
        cancelLabel="Manter"
        destructive
        onConfirm={confirmRevoke}
        onCancel={() => setToRevoke(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: font.body, color: colors.textMuted },
  pending: { gap: spacing.md, marginTop: spacing.lg },
  section: { fontSize: font.title, fontWeight: '800', color: colors.text },
  card: { gap: spacing.xs },
  name: { fontSize: font.body, fontWeight: '800', color: colors.text },
  detail: { fontSize: font.small, color: colors.textMuted },
  expired: { color: colors.danger, fontWeight: '700' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
