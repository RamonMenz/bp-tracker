import type { User } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { logError } from '@/lib/logger';

import { hasSeenOnboarding, markOnboardingSeen } from './onboarding-seen.storage';

/**
 * Decide se o onboarding deve aparecer sozinho logo após o login — e só nessa primeira vez.
 * Assinatura igual a `useAuthRedirect` (mesmos `user`/`isLoading`) de propósito: o Prompt 3 chama
 * os dois hooks lado a lado no mesmo `_layout`.
 *
 * `decidedRef` (não `useState`) guarda "já decidiu nesta sessão do app", pelo mesmo motivo do
 * `useNotificationRedirect`/`useAuthRedirect`: um `useState` disparabria o efeito de novo a cada
 * render que ele mesmo causa (`setState` → re-render → efeito de novo), e aqui a decisão é
 * tomada uma única vez por sessão do app, nunca de novo enquanto o hook segue montado — mesmo que
 * `user`/`isLoading` mudem depois (ex.: logout e login de outra conta na mesma sessão do app).
 */
export function useOnboardingGate(user: User | null, isLoading: boolean): void {
  const router = useRouter();
  const decidedRef = useRef(false);

  useEffect(() => {
    if (isLoading || decidedRef.current || user === null) {
      return;
    }

    decidedRef.current = true;

    hasSeenOnboarding()
      .then((seen) => {
        if (seen) {
          return;
        }

        // Marca visto ANTES de navegar, não depois dos 3 passos: se o usuário sair no meio, ele
        // não deve ser interrompido de novo no próximo login. Reabrir fica a cargo do atalho
        // manual em Ajustes (Prompt 3).
        markOnboardingSeen();
        router.push('/onboarding');
      })
      // hasSeenOnboarding() nunca rejeita pelo próprio contrato dela (ver
      // onboarding-seen.storage.ts) — este catch não é uma segunda camada de defesa contra o
      // mesmo caso, é só para não deixar uma promise rejeitada sem tratamento se o contrato for
      // violado por engano no futuro.
      .catch((error: unknown) => {
        logError('onboarding.gate', error);
      });
  }, [user, isLoading, router]);
}
