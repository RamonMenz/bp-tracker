import { useEffect } from 'react';

import { setColorScheme } from './setColorScheme';
import type { ThemePreference } from './theme-preference.storage';

/**
 * No nativo, `'system'` vai DIRETO para o NativeWind — não é resolvido aqui.
 *
 * Motivo (lido em node_modules/react-native-css-interop/dist/runtime/native/appearance-observables.js):
 * o `set` nativo delega para `Appearance.setColorScheme`, e `'system'` vira
 * `Appearance.setColorScheme('unspecified')` — que DEVOLVE o controle ao SO. Resolver `'system'`
 * para 'light'/'dark' aqui gravaria uma sobrescrita permanente no Appearance e o app pararia de
 * acompanhar o SO justamente no modo "Automático". Pior: como o `Appearance` sobrescrito é também
 * a fonte que leríamos para descobrir a preferência do SO, o valor original ficaria inacessível.
 *
 * É por isso que este arquivo não observa `useColorScheme()` do react-native: no nativo, a
 * mudança de tema do SO já chega ao NativeWind pelo listener do próprio Appearance. Observá-la
 * aqui só criaria um ciclo (nossa escrita → evento do Appearance → nossa escrita de novo).
 */
export function useApplyThemePreference(preference: ThemePreference): void {
  useEffect(() => {
    setColorScheme(preference);
  }, [preference]);
}
