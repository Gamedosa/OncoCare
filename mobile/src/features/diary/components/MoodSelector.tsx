import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, minTouch, radius, spacing } from '@/shared/ui';

import { MOODS } from '../mood';

type Props = { value: number | null; onChange: (value: number) => void };

export function MoodSelector({ value, onChange }: Props) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Como você está hoje?" style={styles.row}>
      {MOODS.map((mood) => {
        const selected = mood.value === value;
        return (
          <Pressable
            key={mood.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={mood.label}
            onPress={() => onChange(mood.value)}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
          >
            <View style={[styles.dot, { opacity: 0.35 + mood.value * 0.13 }]} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{mood.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  option: {
    flex: 1,
    minHeight: minTouch * 2,
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.surface },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.rose },
  label: { fontSize: font.caption, fontWeight: '700', color: colors.text, textAlign: 'center' },
  labelSelected: { color: colors.primary },
});
