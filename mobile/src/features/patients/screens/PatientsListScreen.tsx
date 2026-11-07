import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { relativeDay } from '@/features/diary/format';
import {
  Button,
  colors,
  EmptyState,
  ErrorState,
  font,
  Header,
  radius,
  Screen,
  shadow,
  spacing,
  TextField,
} from '@/shared/ui';

import { useLinkedPatients } from '../hooks';
import { filterPatients, patientName, type LinkedPatient } from '../schemas';

// Search only helps once the list no longer fits comfortably on one screen.
const SEARCH_THRESHOLD = 6;

export function PatientsListScreen() {
  const router = useRouter();
  const query = useLinkedPatients();
  const [search, setSearch] = useState('');

  const patients = query.data ?? [];
  const visible = filterPatients(patients, search);
  const open = (patient: LinkedPatient) =>
    router.push({ pathname: '/psychologist/patients/[patientId]', params: { patientId: patient.id } });

  const header = (
    <Header
      title="Pacientes"
      right={
        <Button variant="text" onPress={() => router.push('/psychologist/account')}>
          Conta
        </Button>
      }
    />
  );

  let body;
  if (query.isPending) {
    body = <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando pacientes" />;
  } else if (query.isError) {
    body = <ErrorState title="Não foi possível carregar as pacientes." onRetry={() => void query.refetch()} />;
  } else {
    body = (
      <FlatList
        data={visible}
        keyExtractor={(patient) => patient.id}
        renderItem={({ item }) => <PatientCard patient={item} onPress={() => open(item)} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Button variant="secondary" onPress={() => router.push('/psychologist/invitations')}>
              Convidar paciente
            </Button>
            {patients.length > SEARCH_THRESHOLD ? (
              <TextField
                label="Buscar por nome"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          patients.length === 0 ? (
            <EmptyState
              title="Nenhuma paciente vinculada no momento."
              text="Convide uma paciente. Ela aparecerá aqui quando aceitar o convite."
            />
          ) : (
            <EmptyState title="Nenhuma paciente encontrada." text="Confira o nome digitado." />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <Screen scroll={false} header={header}>
      {body}
    </Screen>
  );
}

function PatientCard({ patient, onPress }: { patient: LinkedPatient; onPress: () => void }) {
  const last = patient.lastEntryAt ? relativeDay(patient.lastEntryAt) : 'Nenhum relato ainda';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre os relatos da paciente"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={[styles.name, !patient.displayName && styles.unnamed]}>{patientName(patient)}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Último relato:</Text>
        <Text style={styles.value}>{last}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  listHeader: { gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, ...shadow },
  pressed: { backgroundColor: colors.surface },
  name: { fontSize: font.body, fontWeight: '800', color: colors.text },
  unnamed: { fontStyle: 'italic', color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  label: { fontSize: font.small, color: colors.textMuted },
  value: { fontSize: font.small, fontWeight: '700', color: colors.text },
});
