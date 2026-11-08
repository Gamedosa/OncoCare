import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { colors, ErrorState, font, radius, shadow, spacing } from '@/shared/ui';
import type { useDiaryDays } from '../dayHooks';
import { formatDiaryDay } from '../format';

export function DiaryDayList({ query, onOpen, header, empty }: {
  query: ReturnType<typeof useDiaryDays>; onOpen: (day: string) => void; header?: ReactElement; empty: ReactElement;
}) {
  if (query.isPending) return (
    <View>{header}<ActivityIndicator color={colors.primary} accessibilityLabel="Carregando dias de relatos" /></View>
  );
  if (query.isError && !query.days.length) return (
    <View>{header}<ErrorState title="Não foi possível carregar os relatos." onRetry={() => void query.refetch()} /></View>
  );
  return (
    <FlatList data={query.days} keyExtractor={(item) => item.day}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button"
          accessibilityLabel={`${formatDiaryDay(item.day)}, ${item.count} ${item.count === 1 ? 'registro' : 'registros'}`}
          accessibilityHint="Abre todos os registros deste dia" onPress={() => onOpen(item.day)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.row}>
            <Text style={styles.date}>{formatDiaryDay(item.day)}</Text>
            <Text style={styles.count}>{item.count} {item.count === 1 ? 'registro' : 'registros'}</Text>
          </View>
          <Text style={styles.description}>Ver registros do dia</Text>
          {item.hasAudio ? <Text style={styles.audio}>Áudio</Text> : null}
        </Pressable>
      )}
      ListHeaderComponent={header} ListEmptyComponent={empty}
      ListFooterComponent={query.isError ? (
        <ErrorState title="Não foi possível atualizar os relatos." onRetry={() => void query.refetch()} />
      ) : query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : undefined}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) void query.fetchNextPage(); }}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => void query.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
      contentContainerStyle={styles.content}
    />
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...shadow },
  pressed: { backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  date: { fontSize: font.body, fontWeight: '700', color: colors.text },
  count: { fontSize: font.small, color: colors.textMuted, backgroundColor: colors.surface,
    borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, overflow: 'hidden' },
  description: { fontSize: font.small, color: colors.textMuted },
  audio: { fontSize: font.small, fontWeight: '700', color: colors.primary },
});
