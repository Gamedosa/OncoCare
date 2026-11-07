// Provisional scale taken from the prototype. The final mood format and range
// are still "a definir" (Docs/telas.md), so the database has no constraint and
// this is the only place the app defines it.
export const MOODS = [
  { value: 1, label: 'Muito difícil' },
  { value: 2, label: 'Difícil' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Bem' },
  { value: 5, label: 'Muito bem' },
] as const;

export type MoodValue = (typeof MOODS)[number]['value'];

export const MOOD_MIN = MOODS[0].value;
export const MOOD_MAX = MOODS[MOODS.length - 1].value;

export function moodLabel(value: number | null): string | null {
  return MOODS.find((mood) => mood.value === value)?.label ?? null;
}
