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
  xl: 20,
  full: 9999,
} as const;

/**
 * Sombra dos cards. As props `shadow*` cobrem iOS e, via react-native-web, viram `box-shadow` no
 * navegador; `elevation` é o canal separado do Android, que ignora as demais. Por isso os dois
 * convivem no mesmo objeto — não é redundância.
 *
 * No tema escuro a sombra praticamente some (preto sobre quase-preto); lá quem separa o card do
 * fundo é a borda, que o Card sempre desenha.
 */
const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

/** Mínimo de alvo de toque em dp — critério de aceite, não polimento (CLAUDE.md §4.7). */
const MIN_TOUCH_TARGET = 48;

export const tokens = {
  colors,
  fontSize,
  fontWeight,
  spacing,
  radius,
  shadow,
  minTouchTarget: MIN_TOUCH_TARGET,
} as const;

export type Tokens = typeof tokens;
