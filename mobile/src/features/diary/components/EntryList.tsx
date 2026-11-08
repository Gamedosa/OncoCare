import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { colors, ErrorState, spacing } from '@/shared/ui';

import type { useEntries } from '../hooks';
import type { DiaryEntry } from '../schemas';
import { EntryCard } from './EntryCard';

type Props = {
  query: ReturnType<typeof useEntries>;
  onOpen: (entry: DiaryEntry) => void;
  header?: ReactElement;
  empty: ReactElement;
};

export function EntryList({ query, onOpen, header, empty }: Props) {
  if (query.isPending) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Carregando relatos" />
      </View>
    );
  }

  if (query.isError && query.entries.length === 0) {
    return (
      <View>
        {header}
        <ErrorState title="Não foi possível carregar os relatos." onRetry={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      data={query.entries}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => <EntryCard entry={item} onPress={() => onOpen(item)} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={query.isError ? (
        <ErrorState title="Não foi possível atualizar os relatos." onRetry={() => void query.refetch()} />
      ) : query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : undefined}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, gap: spacing.xl },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  footer: { paddingVertical: spacing.lg },
});
