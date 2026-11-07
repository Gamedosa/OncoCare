const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateOnly = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
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
