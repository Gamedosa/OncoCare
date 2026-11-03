import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { useSignOut } from '@/features/auth/hooks';
import { Button, Card, colors, font, Header, Notice, Screen, spacing } from '@/shared/ui';

import { useLinkedPsychologist } from '../hooks';

const ROLE_LABEL = { patient: 'Paciente', psychologist: 'Psicólogo(a)' } as const;

export function AccountScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const signOut = useSignOut();
  const isPatient = profile.role === 'patient';

  return (
    <Screen header={<Header title="Conta" onBack={() => router.back()} />}>
      <Card style={styles.card}>
        <Field label="Nome" value={profile.displayName ?? 'Não informado'} />
        <Field label="Perfil" value={ROLE_LABEL[profile.role]} />
        {isPatient ? <LinkedPsychologistField patientId={profile.id} /> : null}
      </Card>

      {isPatient ? (
        <Card style={styles.card}>
          <Text accessibilityRole="header" style={styles.section}>
            Privacidade
          </Text>
          <Text style={styles.text}>
            Seus relatos são visíveis apenas para você e para o psicólogo vinculado a você. Ele pode ler os relatos, mas
            não pode editá-los.
          </Text>
          {/* The full consent/privacy text is still "a definir" (Docs/telas.md). */}
          <Notice>O termo de consentimento e privacidade completo estará disponível em breve.</Notice>
        </Card>
      ) : null}

      <Button variant="secondary" onPress={() => signOut.mutate()} loading={signOut.isPending}>
        Sair
      </Button>
    </Screen>
  );
}

function LinkedPsychologistField({ patientId }: { patientId: string }) {
  const query = useLinkedPsychologist(patientId);
  let value: ReactNode;
  if (query.isPending) value = <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando psicólogo" />;
  else if (query.isError)
    value = (
      <Button variant="text" onPress={() => void query.refetch()}>
        Não foi possível carregar. Tentar novamente
      </Button>
    );
  else if (!query.data) value = 'Nenhum psicólogo vinculado';
  else value = query.data.displayName ?? 'Nome não informado';
  return <Field label="Psicólogo vinculado" value={value} />;
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
