import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, minTouch, radius, spacing } from './theme';

type Props = { title: string; onBack?: () => void; right?: ReactNode };

export function Header({ title, onBack, right }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  back: { width: minTouch, height: minTouch, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  backPressed: { backgroundColor: colors.surface },
  backIcon: { fontSize: 32, lineHeight: 34, color: colors.primary, fontWeight: '700' },
  spacer: { width: spacing.md },
  title: { flex: 1, fontSize: font.title, fontWeight: '800', color: colors.text },
});
