import AsyncStorage from '@react-native-async-storage/async-storage';

import { logError } from '@/lib/logger';

/**
 * Preferência de tema escolhida pelo usuário. `'system'` não é um terceiro tema — é a ausência de
 * escolha manual, ou seja, "siga o aparelho".
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Chave de preferência de UI por APARELHO, no mesmo padrão do DISCLAIMER_DISMISSED_KEY
 * (app/(app)/index.tsx): AsyncStorage direto, sem lib de estado. Tema é preferência local — quem
 * usa o app no celular e no navegador pode querer escuro num e claro no outro —, então não vai
 * para o perfil do usuário no Firestore.
 */
export const THEME_PREFERENCE_KEY = 'bp-tracker:theme-preference';

/** Sem escolha registrada, o app segue o aparelho — o comportamento que ele já tinha antes deste recurso. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

/**
 * O que volta do AsyncStorage é `string | null`, não `ThemePreference` — pode ser lixo de uma
 * versão anterior do app ou de outra origem no mesmo domínio (web). Validar aqui é o equivalente
 * local da regra "dado externo é `unknown` até ser validado" do CLAUDE.md §3.1.
 */
function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Nunca rejeita: falha de leitura devolve o padrão `'system'`, o fallback silencioso que a tarefa
 * pede. Preferência de tema ilegível é um contratempo cosmético — não pode virar erro na tela nem
 * impedir o app de abrir.
 */
export async function readThemePreference(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch (error) {
    logError('theme.readPreference', error);
    return DEFAULT_THEME_PREFERENCE;
  }
}

/**
 * Também nunca rejeita. O tema já foi aplicado na tela quando esta função roda (ver
 * `useThemePreference`) — o que se perde numa falha aqui é só a persistência entre sessões, e
 * avisar o usuário sobre isso custaria mais atenção do que vale.
 */
export async function writeThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch (error) {
    logError('theme.writePreference', error);
  }
}
