/**
 * Paleta de marca — calma e clínica. Teal é a cor primária, não vermelho:
 * alarme constante em app de pressão gera ansiedade e abandono (PLAN §4.2).
 * Vermelho fica reservado ao badge de classificação, adicionado junto do BpCategoryBadge.
 */
export const colors = {
  light: {
    primary: '#0E7C86',
    primaryFg: '#FFFFFF',
    bg: '#F7F9FA',
    surface: '#FFFFFF',
    border: '#E3E8EC',
    text: '#0F1A1C',
    muted: '#5A6B70',
    // Ação destrutiva genérica (botão, erro de campo) — distinta da paleta AHA do badge de classificação.
    danger: '#B3261E',
  },
  dark: {
    // Teal clareado para manter contraste sobre fundo escuro.
    primary: '#3FB6C0',
    // Texto escuro sobre o teal claro: branco daria ~2.3:1 e reprovaria no WCAG AA.
    primaryFg: '#0D1416',
    bg: '#0D1416',
    surface: '#141F22',
    border: '#26343A',
    text: '#E8F0F2',
    muted: '#9BAAB0',
    danger: '#E5484D',
  },
} as const;

export type ColorScheme = keyof typeof colors;

export type ColorToken = keyof typeof colors.light;
