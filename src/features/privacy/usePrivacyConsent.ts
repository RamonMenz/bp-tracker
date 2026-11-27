import type { User } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';

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
  getHasConsent: () => boolean;
}

interface ConsentSnapshot {
  uid: string;
  sessionEpoch: object | null;
  consent: AcceptedPrivacyConsent | null;
}

/**
 * Lê o aceite do usuário logado em tempo real. O estado guarda o `uid` junto da resposta: trocar
 * de conta na mesma sessão do app não pode herdar, nem por um render, o aceite da conta anterior.
 */
export function usePrivacyConsent(user: User | null, sessionEpoch: object | null = user): UsePrivacyConsentResult {
  const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null);
  const currentSnapshot = useRef(snapshot);
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (uid === null) {
      return;
    }

    let active = true;
    const update = (consent: AcceptedPrivacyConsent | null) => {
      if (!active) return;
      const next = { uid, sessionEpoch, consent };
      currentSnapshot.current = next;
      setSnapshot(next);
    };
    const unsubscribe = subscribePrivacyConsent(
      uid,
      update,
      (error) => {
        if (!active) return;
        // Falha fechada: sem conseguir confirmar o aceite, o app pede o consentimento de novo em
        // vez de liberar o registro de dado de saúde.
        logError('privacy.subscribeConsent', error, { uid });
        update(null);
      },
    );

    return () => {
      active = false;
      currentSnapshot.current = null;
      unsubscribe();
    };
  }, [uid, sessionEpoch]);

  const getHasConsent = () => {
    const current = currentSnapshot.current;
    return current !== null && current.uid === uid && current.sessionEpoch === sessionEpoch
      && current.consent?.version === PRIVACY_POLICY_VERSION;
  };

  if (!snapshot || snapshot.uid !== uid || snapshot.sessionEpoch !== sessionEpoch) {
    return { status: 'loading', consent: null, getHasConsent };
  }

  return snapshot.consent?.version === PRIVACY_POLICY_VERSION
    ? { status: 'accepted', consent: snapshot.consent, getHasConsent }
    : { status: 'required', consent: null, getHasConsent };
}
