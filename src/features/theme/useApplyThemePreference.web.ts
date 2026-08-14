import { useEffect } from 'react';
// O hook do react-native é proibido no resto do app (regra no-restricted-imports, desligada só
// para src/features/theme/): aqui o alvo é de propósito a preferência do SISTEMA OPERACIONAL, e
// não o tema já resolvido do app. O rename deixa isso explícito em cada uso abaixo.
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { resolveColorScheme } from '@/theme/colors';

import { setColorScheme } from './setColorScheme';
import type { ThemePreference } from './theme-preference.storage';

/**
 * Na web, `'system'` é resolvido AQUI para 'light'/'dark' — o oposto do que o arquivo `.native.ts`
 * faz, e a diferença é obrigatória.
 *
 * Motivo (lido em node_modules/react-native-css-interop/dist/runtime/web/color-scheme.js): com
 * `darkMode: 'class'` o Tailwind gera `.dark\:bg-dark-bg:is(.dark *)` — a classe `dark` no
 * <html> é o ÚNICO gatilho do tema escuro na web, porque nenhuma media query sobrou no CSS. E o
 * `set('system')` da web REMOVE essa classe. O resultado seria as duas trilhas de tema
 * desincronizadas justamente no modo "Automático": a trilha JS (`colors[scheme]`) enxergaria
 * 'dark' pelo fallback interno do NativeWind, enquanto toda classe `dark:` continuaria clara.
 *
 * Passando o valor já concreto, a classe entra e as duas trilhas contam a mesma história.
 *
 * `useColorScheme()` do react-native é a leitura correta da preferência do SO nesta plataforma: no
 * react-native-web ele vem do `matchMedia('(prefers-color-scheme: dark)')`, que a classe `dark` do
 * NativeWind não afeta. Como ele re-renderiza a cada mudança do SO, o efeito reaplica sozinho
 * quando o usuário troca o tema do sistema com o app aberto em "Automático".
 */
export function useApplyThemePreference(preference: ThemePreference): void {
  const systemScheme = resolveColorScheme(useSystemColorScheme());

  useEffect(() => {
    setColorScheme(preference === 'system' ? systemScheme : preference);
  }, [preference, systemScheme]);
}
