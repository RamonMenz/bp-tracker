import { colorScheme } from 'nativewind';

import type { ColorScheme } from '@/theme/colors';
import { logError } from '@/lib/logger';

/**
 * Único ponto do app que escreve no esquema de cor do NativeWind.
 *
 * `colorScheme.set` LANÇA em dois casos conhecidos, e nenhum deles pode derrubar a tela
 * (CLAUDE.md §4.3):
 *   1. `darkMode` não é `'class'` no tailwind.config.js — "Cannot manually set color scheme, as
 *      dark mode is type 'media'". É erro de configuração do projeto, não do usuário: o teste em
 *      __tests__/theme/ trava essa config justamente para o erro aparecer no CI, não no aparelho.
 *   2. Na web, fora de um contexto de navegador (SSR/pré-render) — não existe `document` para
 *      receber a classe `dark`.
 *
 * Em ambos o app segue rodando com o esquema anterior: tema errado incomoda, tela branca de crash
 * impede de registrar a medição.
 */
export function setColorScheme(scheme: ColorScheme | 'system'): void {
  try {
    colorScheme.set(scheme);
  } catch (error) {
    logError('theme.setColorScheme', error, { scheme });
  }
}
