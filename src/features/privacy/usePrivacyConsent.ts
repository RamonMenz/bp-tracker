import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { subscribePrivacyConsent } from '@/features/auth/auth.repo';
import { PRIVACY_POLICY_VERSION } from '@/lib/legal';
import { logError } from '@/lib/logger';
import type { AcceptedPrivacyConsent } from '@/types/models';

/**
 * - `loading`: ainda não há resposta confiável do servidor para ESTE usuário.
 * - `accepted`: há aceite gravado no servidor para a versão vigente da política.
 * - `required`: não há aceite, ou ele é de uma versão anterior.
 */
export type PrivacyConsentStatus = 'loading' | 'accepted' | 'required';

export interface UsePrivacyConsentResult {
  status: PrivacyConsentStatus;
  /** Aceite da versão vigente — `null` fora do status `accepted`. */
  consent: AcceptedPrivacyConsent | null;
}

interface ConsentSnapshot {
  uid: string;
  consent: AcceptedPrivacyConsent | null;
}

/**
 * Lê o aceite do usuário logado em tempo real. O estado guarda o `uid` junto da resposta: trocar
 * de conta na mesma sessão do app não pode herdar, nem por um render, o aceite da conta anterior.
 */
export function usePrivacyConsent(user: User | null): UsePrivacyConsentResult {
  const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null);
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (uid === null) {
      return;
    }

    const unsubscribe = subscribePrivacyConsent(
      uid,
      (consent) => setSnapshot({ uid, consent }),
      (error) => {
        // Falha fechada: sem conseguir confirmar o aceite, o app pede o consentimento de novo em
        // vez de liberar o registro de dado de saúde.
        logError('privacy.subscribeConsent', error, { uid });
        setSnapshot({ uid, consent: null });
      },
    );

    return unsubscribe;
  }, [uid]);

  if (uid === null || snapshot === null || snapshot.uid !== uid) {
    return { status: 'loading', consent: null };
  }

  if (snapshot.consent === null || snapshot.consent.version !== PRIVACY_POLICY_VERSION) {
    return { status: 'required', consent: null };
  }

  return { status: 'accepted', consent: snapshot.consent };
}
