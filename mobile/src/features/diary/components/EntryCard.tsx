import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, shadow, spacing } from '@/shared/ui';

import { excerpt, relativeDay } from '../format';
import { moodLabel } from '../mood';
import type { DiaryEntry } from '../schemas';

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function EntryCard({ entry, onPress }: { entry: DiaryEntry; onPress: () => void }) {
  const mood = moodLabel(entry.mood);
  const when = `${relativeDay(entry.createdAt)}, ${time.format(entry.createdAt)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre o relato completo"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.date}>{when}</Text>
        {mood ? <Text style={styles.badge}>{mood}</Text> : null}
      </View>
      {entry.content ? (
        <Text style={styles.text} numberOfLines={3}>
          {excerpt(entry.content)}
        </Text>
      ) : null}
      {entry.hasAudio ? <Text style={styles.audio}>● Áudio</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...shadow },
  pressed: { backgroundColor: colors.surface },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  date: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  badge: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  text: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  audio: { fontSize: font.small, fontWeight: '700', color: colors.primary },
});
