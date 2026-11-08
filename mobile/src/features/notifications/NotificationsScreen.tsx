import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useSignedInAuth } from '@/features/auth/AuthProvider';
import { Button, Card, colors, EmptyState, font, Header, Notice, Screen } from '@/shared/ui';
import { useMarkNotificationRead, useNotifications } from './hooks';

export function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useSignedInAuth();
  const query = useNotifications(profile.id);
  const markRead = useMarkNotificationRead();
  const notifications = query.data?.pages.flat() ?? [];
  return (
    <Screen header={<Header title="Notificações" onBack={() => router.back()} />}>
      <Text style={styles.body}>Convites, vínculos e atualizações do aplicativo. Esta central não é um canal de emergência e não envia alertas por push ou e-mail.</Text>
      {query.isPending ? <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando notificações" /> : null}
      {query.isError ? (
        <>
          <Notice tone="error">Não foi possível atualizar as notificações.</Notice>
          <Button variant="secondary" onPress={() => void query.refetch()}>Tentar novamente</Button>
        </>
      ) : null}
      {!query.isPending && !query.isError && !notifications.length ? (
        <EmptyState title="Nenhuma notificação" text="Novos acontecimentos e atualizações aparecerão aqui." />
      ) : null}
      {markRead.isError ? <Notice tone="error">Não foi possível marcar a notificação como lida. Tente novamente.</Notice> : null}
      {notifications.map((item) => (
        <Card key={item.id}>
          <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text>
          {item.read_at ? <Text style={styles.date}>Lida</Text> : (
            <Button variant="secondary" disabled={markRead.isPending}
              loading={markRead.isPending && markRead.variables === item.id}
              onPress={() => markRead.mutate(item.id)}>Marcar como lida</Button>
          )}
        </Card>
      ))}
      {query.hasNextPage ? <Button variant="secondary" loading={query.isFetchingNextPage}
        onPress={() => void query.fetchNextPage()}>Carregar mais</Button> : null}
      <Button variant="text" loading={query.isRefetching} onPress={() => void query.refetch()}>Atualizar</Button>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: font.body, fontWeight: '800', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  date: { fontSize: font.small, color: colors.textMuted },
});
