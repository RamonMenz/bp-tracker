import type { User } from 'firebase/auth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { usePrivacyConsent } from './usePrivacyConsent';

export interface UseConsentGateResult {
  /** `true` só com aceite da versão vigente confirmado no servidor. */
  hasConsent: boolean;
}

/**
 * Gate de navegação do consentimento (LGPD art. 11, I) — mesma assinatura de `useAuthRedirect` e
 * `useOnboardingGate`. Decide só depois de `isLoading` e de o aceite ter sido lido do servidor.
 *
 * Os dois sentidos da navegação moram aqui, e não na tela:
 *  - sem aceite da versão vigente e fora de `/consent` → `replace('/consent')`. Vale também para
 *    deep link (notificação abrindo `/record`): não existe caminho que pule o consentimento;
 *  - aceite confirmado e ainda em `/consent` → `replace('/(app)')`. Sair daqui, e não da tela
 *    depois do `await`, deixa a ordem determinística em relação ao `useOnboardingGate`, que só é
 *    liberado no mesmo render em que `hasConsent` vira `true` (ver app/_layout.tsx).
 *
 * `redirectedRef` impede repetir o mesmo `replace` em renders que acontecem antes de os segmentos
 * refletirem a navegação já pedida; ele é zerado assim que rota e estado voltam a concordar, para
 * que uma saída posterior de `/consent` sem aceite seja barrada de novo.
 *
 * Em `(auth)` não faz nada: o `useAuthRedirect` tira o usuário de lá primeiro, e este efeito roda
 * de novo quando os segmentos mudam.
 */
export function useConsentGate(user: User | null, isLoading: boolean): UseConsentGateResult {
  const { status } = usePrivacyConsent(user);
  const segments = useSegments();
  const router = useRouter();
  const redirectedRef = useRef(false);

  const isOnConsentRoute = segments[0] === 'consent';
  const isInAuthGroup = segments[0] === '(auth)';

  useEffect(() => {
    if (isLoading || user === null || status === 'loading' || isInAuthGroup) {
      return;
    }

    const destination =
      status === 'required' && !isOnConsentRoute
        ? '/consent'
        : status === 'accepted' && isOnConsentRoute
          ? '/(app)'
          : null;

    if (destination === null) {
      redirectedRef.current = false;
      return;
    }

    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    router.replace(destination);
  }, [user, isLoading, status, isOnConsentRoute, isInAuthGroup, router]);

  return { hasConsent: status === 'accepted' };
}
