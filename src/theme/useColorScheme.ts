import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

import type { ColorScheme } from './colors';

/**
 * PONTO ÚNICO de leitura do esquema de cor no app. Todo componente que escolhe cor em JS
 * (`colors[scheme]`, `categoryColors[scheme]`) lê daqui — nunca do `useColorScheme()` do
 * react-native, que enxerga só o SO e ignoraria a preferência manual do usuário. Há uma regra de
 * ESLint (`no-restricted-imports`) que barra o hook do react-native fora de src/features/theme/
 * justamente para as duas trilhas não voltarem a divergir.
 *
 * Mora em `src/theme/` e não em `src/features/theme/` de propósito: quem consome isto são os
 * primitivos de `src/components/ui/`, que por definição não têm domínio (CLAUDE.md §3.2) e não
 * deveriam depender de uma feature. A feature `theme` ESCREVE a preferência; aqui só se LÊ o
 * resultado, do mesmo lugar de onde já vêm os tokens de cor.
 *
 * A fonte por baixo é o observable do NativeWind — o mesmo que resolve as classes `dark:`. É isso
 * que garante que a trilha JS e a trilha NativeWind não possam discordar.
 */
export function useColorScheme(): ColorScheme {
  const { colorScheme } = useNativeWindColorScheme();

  // Na web o hook do NativeWind pode devolver `undefined` (antes de a primeira resolução
  // acontecer); no nativo, só 'light' | 'dark'. Qualquer coisa que não seja explicitamente 'dark'
  // cai em 'light', a paleta calma padrão do app — mesma regra que `resolveColorScheme` já usava.
  return colorScheme === 'dark' ? 'dark' : 'light';
}
