import AsyncStorage from '@react-native-async-storage/async-storage';

import { logError } from '@/lib/logger';

/**
 * Chave de preferência de UI por APARELHO, no mesmo padrão do THEME_PREFERENCE_KEY
 * (src/features/theme/theme-preference.storage.ts): AsyncStorage direto, sem lib de estado. Já
 * viu o onboarding é local ao aparelho — reinstalar ou trocar de celular mostra de novo, o que é
 * aceitável — então não vai para o perfil do usuário no Firestore.
 */
export const ONBOARDING_SEEN_KEY = 'bp-tracker:onboarding-seen';

/**
 * Nunca rejeita: falha de leitura devolve `false` (comportamento "ainda não viu"), o fallback
 * silencioso que o CLAUDE.md §4.3 pede. Só devolve `true` para o valor exato gravado por
 * `markOnboardingSeen` — qualquer outra coisa (`null`, lixo de outra origem no mesmo domínio web,
 * erro de leitura) é tratada como "nunca viu", nunca como erro visível.
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
    return stored === 'true';
  } catch (error) {
    logError('onboarding.read', error);
    return false;
  }
}

/**
 * Também nunca rejeita. Se a escrita falhar, o pior cenário é o onboarding reaparecer na próxima
 * abertura do app — contratempo cosmético, não erro que justifique interromper a navegação que já
 * está em andamento (ver `useOnboardingGate`).
 */
export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  } catch (error) {
    logError('onboarding.write', error);
  }
}
