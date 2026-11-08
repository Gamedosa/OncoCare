const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const dateOnly = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo',
});
const dayParts = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo',
});

export function diaryDayKey(date: Date): string {
  const parts = dayParts.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatDiaryDay(day: string): string {
  return dateOnly.format(new Date(`${day}T12:00:00-03:00`));
}

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

function startOfDay(date: Date): number {
  return Date.parse(`${diaryDayKey(date)}T00:00:00Z`);
}

// Relative label for list headers: "Hoje", "Ontem" or the date.
export function relativeDay(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return dateOnly.format(date);
}

export function excerpt(text: string | null, max = 140): string {
  if (!text) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}
