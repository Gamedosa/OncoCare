// Palette defined for ElaConta (contrast checked against WCAG AA).
// rose/petal are decorative only: never use them for text or essential controls.
export const colors = {
  primary: '#A3325A',
  primaryPressed: '#7F2546',
  onPrimary: '#FFFFFF',
  rose: '#F7799F',
  petal: '#F9A8C0',
  surface: '#FBDDE5',
  background: '#FDF4F6',
  card: '#FFFFFF',
  text: '#3A2A30',
  textMuted: '#6B5A60',
  border: '#EBD3DA',
  input: '#E0C4CC',
  disabled: '#F3E7EA',
  success: '#2E7D5B',
  warning: '#8A5A00',
  danger: '#B3261E',
} as const;

export const radius = { md: 12, lg: 16, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const font = {
  body: 16,
  small: 14,
  caption: 12,
  title: 22,
  display: 28,
} as const;

export const minTouch = 48;

export const shadow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
