import { colors } from '@/theme/colors';

/** Escala tipográfica do PLAN §4.3. Corpo nunca abaixo de 16 — o público inclui idosos. */
const fontSize = {
  display: 56,
  title: 28,
  section: 20,
  body: 16,
  caption: 13,
} as const;

const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

/** Mínimo de alvo de toque em dp — critério de aceite, não polimento (CLAUDE.md §4.7). */
const MIN_TOUCH_TARGET = 48;

export const tokens = {
  colors,
  fontSize,
  fontWeight,
  spacing,
  radius,
  minTouchTarget: MIN_TOUCH_TARGET,
} as const;

export type Tokens = typeof tokens;
