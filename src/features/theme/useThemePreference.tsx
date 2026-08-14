import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useApplyThemePreference } from './useApplyThemePreference';
import {
  DEFAULT_THEME_PREFERENCE,
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from './theme-preference.storage';

interface ThemePreferenceValue {
  /** A ESCOLHA do usuário — inclui `'system'`. Para pintar algo, use `useColorScheme()` de `@/theme`. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

/**
 * Contexto, e não um hook solto, porque há dois consumidores da MESMA preferência (a raiz do app,
 * que a aplica na primeira carga, e a tela de Ajustes, que mostra qual opção está marcada). Dois
 * `useState` independentes divergiriam: o seletor continuaria marcando a opção antiga depois de
 * uma troca. Mesmo padrão do SessionProvider.
 *
 * O tema APLICADO não mora aqui — mora no observable do NativeWind, que este provider só alimenta.
 * É o que mantém uma fonte única para as duas trilhas de tema (classes `dark:` e `colors[scheme]`).
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // Começa em 'system' (o comportamento anterior do app) e é corrigido assim que o AsyncStorage
  // responde. Só a preferência GRAVADA vale como escolha do usuário — não há como saber qual é
  // antes da leitura assíncrona terminar.
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);

  // Aplica a preferência atual no NativeWind — na primeira carga junto, não só quando o usuário
  // toca em algo. Sem isto o app abriria no tema errado até a primeira interação.
  useApplyThemePreference(preference);

  useEffect(() => {
    let isActive = true;

    // readThemePreference trata os próprios erros e resolve com 'system' no pior caso, então não
    // existe rejeição a tratar aqui (CLAUDE.md §4.3: nunca uma tela travada por causa disto).
    void readThemePreference().then((stored) => {
      if (isActive) {
        setPreferenceState(stored);
      }
    });

    return () => {
      // A tela pode desmontar antes da leitura terminar — sem esta guarda, o setState cairia num
      // componente já desmontado.
      isActive = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    // O estado muda primeiro: o tema vira na hora e a gravação acontece por baixo. Se o
    // AsyncStorage falhar, o usuário ainda vê o tema que pediu nesta sessão — só não o reencontra
    // na próxima. writeThemePreference nunca rejeita (loga e engole), daí o `void`.
    setPreferenceState(next);
    void writeThemePreference(next);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceValue {
  const context = useContext(ThemePreferenceContext);

  if (context === null) {
    throw new Error('useThemePreference precisa estar dentro de <ThemePreferenceProvider>.');
  }

  return context;
}
