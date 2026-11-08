import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { useSignOut } from '@/features/auth/hooks';
import { unlinkErrorMessage } from '@/features/links/errors';
import { useUnlinkPatient } from '@/features/links/hooks';
import { useUnreadNotifications } from '@/features/notifications/hooks';
import { Button, Card, colors, ConfirmDialog, font, Header, Notice, Screen, spacing } from '@/shared/ui';

import { useLinkedPsychologist } from '../hooks';
import { DeleteAccountPanel } from './DeleteAccountPanel';
import { EditProfilePanel } from './EditProfilePanel';

const ROLE_LABEL = { patient: 'Paciente', psychologist: 'Psicólogo(a)' } as const;

export function AccountScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const signOut = useSignOut();
  const isPatient = profile.role === 'patient';
  const unread = useUnreadNotifications(profile.id);

  return (
    <Screen header={<Header title="Conta" onBack={() => router.back()} />}>
      <Card style={styles.card}>
        <Field label="Nome" value={profile.displayName ?? 'Não informado'} />
        <Field label="Perfil" value={ROLE_LABEL[profile.role]} />
        <EditProfilePanel profile={profile} />
        {isPatient ? <LinkedPsychologistField patientId={profile.id} /> : null}
      </Card>

      {isPatient ? (
        <Card style={styles.card}>
          <Text accessibilityRole="header" style={styles.section}>
            Privacidade
          </Text>
          <Text style={styles.text}>
            Seus relatos são visíveis apenas para você e para o psicólogo vinculado a você. Ele pode ler os relatos, mas
            não pode editá-los. Você pode continuar registrando relatos sem um psicólogo vinculado.
          </Text>
          {/* The full consent/privacy text is still "a definir" (Docs/telas.md). */}
          <Notice>O termo de consentimento e privacidade completo estará disponível em breve.</Notice>
        </Card>
      ) : null}

      <Button variant="secondary" onPress={() => router.push(isPatient ? '/patient/terms' : '/psychologist/terms')}>
        Ver termos de uso (prévia)
      </Button>

      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.section}>Notificações</Text>
        {unread.isError ? (
          <>
            <Notice tone="error">Não foi possível carregar a quantidade de notificações.</Notice>
            <Button variant="text" onPress={() => void unread.refetch()}>Tentar novamente</Button>
          </>
        ) : unread.data !== undefined ? <Text style={styles.text}>{unread.data} não lida(s)</Text> : null}
        <Button variant="secondary" onPress={() => router.push(isPatient ? '/patient/notifications' : '/psychologist/notifications')}>
          Ver notificações
        </Button>
      </Card>

      <DeleteAccountPanel role={profile.role} />
      {signOut.isError ? <Notice tone="error">Não foi possível sair. Tente novamente.</Notice> : null}
      <Button variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending}>
        Sair
      </Button>
    </Screen>
  );
}

function LinkedPsychologistField({ patientId }: { patientId: string }) {
  const query = useLinkedPsychologist(patientId);
  const unlink = useUnlinkPatient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const confirm = async () => {
    const psychologistId = pendingId;
    setPendingId(null);
    if (!psychologistId) return;
    setSuccess(false);
    try {
      await unlink.mutateAsync({ patientId, psychologistId });
      setSuccess(true);
    } catch {
      // The error is shown below.
    }
  };
  let value: ReactNode;
  if (query.isPending) value = <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando psicólogo" />;
  else if (query.isError)
    value = (
      <Button variant="text" onPress={() => void query.refetch()}>
        Não foi possível carregar. Tentar novamente
      </Button>
    );
  else if (!query.data) value = 'Sem vínculo com psicólogo';
  else value = query.data.displayName ?? 'Nome não informado';
  const linkedId = query.data?.id;
  return (
    <>
      <Field label="Psicólogo vinculado" value={value} />
      {success ? <Notice tone="success">Vínculo encerrado. Seu diário continua disponível para você.</Notice> : null}
      {unlink.isError ? <Notice tone="error">{unlinkErrorMessage(unlink.error)}</Notice> : null}
      {linkedId ? (
        <Button variant="secondary" loading={unlink.isPending} onPress={() => {
          unlink.reset();
          setPendingId(linkedId);
        }}>
          Encerrar vínculo
        </Button>
      ) : null}
      <ConfirmDialog
        visible={pendingId !== null}
        title="Encerrar vínculo?"
        message="Ao confirmar, seu psicólogo não poderá mais acessar seus relatos e áudios pelo aplicativo. Seus registros continuam disponíveis para você, e você pode continuar escrevendo sem um psicólogo vinculado."
        confirmLabel="Encerrar vínculo"
        cancelLabel="Voltar"
        destructive
        onConfirm={confirm}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  field: { gap: 2, alignItems: 'flex-start' },
  label: { fontSize: font.small, color: colors.textMuted },
  value: { fontSize: font.body, fontWeight: '700', color: colors.text },
  section: { fontSize: font.body, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.text, lineHeight: 22 },
});
