import type { ColorSchemeName } from 'react-native';

/**
 * Paleta de marca "Medical Clean" — calma e clínica. Azul é a cor primária, não vermelho:
 * alarme constante em app de pressão gera ansiedade e abandono (PLAN §4.2). Vermelho fica
 * reservado ao badge de classificação (ver `categoryColors`) e à ação destrutiva.
 *
 * Os neutros são a rampa slate: fundo slate-50, superfície branca, texto slate-800.
 *
 * `primary` é o blue-600 (#2563EB), não o blue-500: o 500 com texto branco por cima dá 3.1:1 e
 * reprova no mínimo AA de 4.5:1 exigido pelo CLAUDE.md §4.7. O 600 dá 5.17:1 no mesmo tom de azul.
 */
export const colors = {
  light: {
    primary: '#2563EB',
    primaryFg: '#FFFFFF',
    /** Tom de apoio do azul — fundo de ícone/realce informativo sobre superfície branca. */
    primaryTint: '#EFF6FF',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#1E293B',
    // slate-500: 4.58:1 sobre o fundo slate-50 — passa em AA, mas é o piso da rampa.
    // Não escureça o fundo nem clareie este token sem refazer a conta.
    muted: '#64748B',
    // Ação destrutiva genérica (botão, erro de campo). rose-700, não rose-500: precisa carregar
    // texto branco por cima (6.28:1). Distinta da paleta de classificação abaixo.
    danger: '#BE123C',
    // Feedback de sucesso genérico (fora da classificação de pressão — ver categoryColors). Mesmo
    // tom de categoryColors.normal.fg, que já passa em AA sobre superfície branca: reaproveita a
    // conta de contraste em vez de introduzir um verde novo.
    success: '#047857',
    // Botão desabilitado. Par próprio em vez de baixar a opacidade do botão habilitado: a
    // primária a 45% deixa o texto branco em 1.96:1 — ilegível justamente no estado em que a
    // tela abre. Este par dá 6.15:1 e continua lendo como "indisponível".
    disabledBg: '#E2E8F0',
    disabledFg: '#475569',
  },
  dark: {
    // Blue-400: o 600 sobre fundo escuro cai para ~2.9:1.
    primary: '#60A5FA',
    // Texto escuro sobre o azul claro: branco daria ~2.2:1 e reprovaria no WCAG AA.
    primaryFg: '#0B1220',
    primaryTint: '#152238',
    bg: '#0B1220',
    surface: '#172033',
    border: '#2A3852',
    text: '#E2E8F0',
    muted: '#94A3B8',
    danger: '#FB7185',
    // Mesmo tom de categoryColors.normal.fg no escuro — mesma razão do par claro acima.
    success: '#34D399',
    // 4.59:1 — mesmo critério do par claro.
    disabledBg: '#2A3852',
    disabledFg: '#94A3B8',
  },
} as const;

export type ColorScheme = keyof typeof colors;

export type ColorToken = keyof typeof colors.light;

/**
 * Cores da classificação de pressão, uma entrada por categoria do domínio.
 *
 * `fg` é texto/ícone e passa em AA sobre `surface`; `tint` é fundo do badge; `border` fecha a
 * forma. Cor NUNCA é o único portador do significado (CLAUDE.md §4.7) — o label textual da
 * categoria acompanha sempre.
 *
 * As três famílias (emerald / amber / rose) são as pedidas no redesign; os três níveis de
 * hipertensão se separam por profundidade dentro do rose, não por matizes diferentes, para
 * manterem a leitura de "mesma família, gravidade crescente".
 */
export const categoryColors = {
  light: {
    normal: { fg: '#047857', tint: '#ECFDF5', border: '#A7F3D0' },
    elevated: { fg: '#B45309', tint: '#FFFBEB', border: '#FDE68A' },
    stage1: { fg: '#BE123C', tint: '#FFF1F2', border: '#FECDD3' },
    stage2: { fg: '#9F1239', tint: '#FFE4E6', border: '#FDA4AF' },
    crisis: { fg: '#881337', tint: '#FECDD3', border: '#FB7185' },
  },
  dark: {
    normal: { fg: '#34D399', tint: '#0C2B22', border: '#115E4A' },
    elevated: { fg: '#FBBF24', tint: '#2E2310', border: '#78500B' },
    stage1: { fg: '#FB7185', tint: '#33141C', border: '#7F1D33' },
    stage2: { fg: '#FDA4AF', tint: '#3B1620', border: '#9F1239' },
    crisis: { fg: '#FECDD3', tint: '#45182A', border: '#BE123C' },
  },
} as const;

export interface CategoryPalette {
  fg: string;
  tint: string;
  border: string;
}

/**
 * `useColorScheme()` do react-native@0.86+ pode retornar `'unspecified'` (além de `'light' |
 * 'dark' | null`), valor que `?? 'light'` não cobre porque não é `null`/`undefined`. Qualquer
 * coisa que não seja explicitamente `'dark'` cai em `'light'`, a paleta calma padrão do app.
 */
export function resolveColorScheme(scheme: ColorSchemeName): ColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}
