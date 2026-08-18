import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/screens/OnboardingScreen';

/**
 * Rota de composição pura (CLAUDE.md §3.2): só monta `OnboardingScreen` e traduz o destino que
 * ela pede em navegação de verdade. `OnboardingScreen` é o componente burro — não sabe o que
 * `router.replace` significa, só que o usuário pediu para sair e, às vezes, para onde.
 *
 * Chegada aqui de dois jeitos, os dois com `replace`, nunca `push`:
 *  - automático, na primeira sessão pós-login (`useOnboardingGate`, em `app/_layout.tsx`);
 *  - manual, pelo atalho "Como usar o app" em Ajustes (`app/(app)/settings.tsx`), que usa `push` —
 *    ali sim "Voltar" deve devolver para Ajustes, é o próprio usuário reabrindo por escolha.
 * Em nenhum dos dois casos o onboarding concluído pode entrar na pilha de volta: apertar "voltar"
 * depois de terminar não pode reabri-lo, nem depois de seguir para Ajustes.
 */
export default function OnboardingRoute() {
  const router = useRouter();

  function handleFinish(destination?: 'settings'): void {
    if (destination === 'settings') {
      router.replace('/(app)/settings');
      return;
    }

    router.replace('/(app)');
  }

  return <OnboardingScreen onFinish={handleFinish} />;
}
