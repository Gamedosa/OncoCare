import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { z } from 'zod';
import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { useLinkedPatient } from '@/features/patients/hooks';
import { AccessUnavailable } from '@/features/patients/screens/AccessUnavailable';
import { colors, EmptyState, ErrorState, Header, Notice, Screen } from '@/shared/ui';
import { EntryList } from '../components/EntryList';
import { diaryDaySchema } from '../dayRepository';
import { useDiaryDayEntries } from '../dayHooks';
import { formatDiaryDay } from '../format';

export function DiaryDayScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const params = useLocalSearchParams<{ day?: string; patientId?: string }>();
  const day = diaryDaySchema.safeParse(params.day);
  const patientId = profile.role === 'patient' ? profile.id : params.patientId;
  if (!day.success || !z.uuid().safeParse(patientId).success || !patientId) return (
    <Screen header={<Header title="Relatos do dia" onBack={() => router.back()} />}>
      <Notice tone="error">Dia ou paciente inválido. Volte ao histórico para abrir os registros.</Notice>
    </Screen>
  );
  return profile.role === 'psychologist'
    ? <PsychologistDay patientId={patientId} day={day.data} />
    : <DayEntries patientId={patientId} day={day.data} psychologist={false} />;
}
function PsychologistDay({ patientId, day }: { patientId: string; day: string }) {
  const router = useRouter();
  const patient = useLinkedPatient(patientId);
  if (patient.isPending) return (
    <Screen header={<Header title="Relatos do dia" onBack={() => router.back()} />}>
      <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando paciente" />
    </Screen>
  );
  if (patient.isError) return (
    <Screen header={<Header title="Relatos do dia" onBack={() => router.back()} />}>
      <ErrorState title="Não foi possível carregar a paciente." onRetry={() => void patient.refetch()} />
    </Screen>
  );
  if (!patient.data) return <Screen><AccessUnavailable /></Screen>;
  return <DayEntries patientId={patientId} day={day} psychologist />;
}
function DayEntries({ patientId, day, psychologist }: { patientId: string; day: string; psychologist: boolean }) {
  const router = useRouter();
  const query = useDiaryDayEntries(patientId, day);
  return (
    <Screen scroll={false} header={<Header title={formatDiaryDay(day)} onBack={() => router.back()} />}>
      <EntryList query={query}
        onOpen={(entry) => router.push(psychologist
          ? { pathname: '/psychologist/patients/[patientId]/entries/[id]', params: { patientId, id: entry.id } }
          : { pathname: '/patient/entries/[id]', params: { id: entry.id } })}
        header={<Notice>{psychologist ? 'Visualização somente leitura' : 'Registros individuais'} · horário de Brasília</Notice>}
        empty={<EmptyState title="Nenhum registro neste dia." text="O relato pode ter sido excluído ou não estar mais disponível." />}
      />
    </Screen>
  );
}
