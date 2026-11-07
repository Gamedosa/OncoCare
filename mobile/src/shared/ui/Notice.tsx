import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from './theme';

export type NoticeTone = 'info' | 'error' | 'warning' | 'success';

export function Notice({ tone = 'info', children }: { tone?: NoticeTone; children: ReactNode }) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[styles.base, toneStyles[tone]]}
    >
      <Text style={[styles.text, textStyles[tone]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, padding: spacing.md },
  text: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
});

const toneStyles = StyleSheet.create({
  info: { backgroundColor: colors.surface },
  error: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.danger },
  warning: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.warning },
  success: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.success },
});

const textStyles = StyleSheet.create({
  info: { color: colors.text, fontSize: font.body },
  error: { color: colors.danger },
  warning: { color: colors.warning },
  success: { color: colors.success },
});
