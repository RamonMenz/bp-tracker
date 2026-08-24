import type { View } from 'react-native';

/**
 * No-op no nativo.
 *
 * O par web (`focus.web.ts`) existe para um problema que só o DOM tem: o `Modal` do
 * react-native-web devolve o foco, ao fechar, para o elemento que estava focado quando ele abriu —
 * e o navegador rola a lista para revelar esse elemento. No Android não há `document.activeElement`
 * nem rolagem automática por foco, então não há nada a neutralizar aqui.
 */
export function focusWithoutScrolling(_target: View | null): void {
  // Intencionalmente vazio — ver comentário acima.
}
