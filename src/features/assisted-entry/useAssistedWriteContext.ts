import Constants from 'expo-constants';
import { useContext } from 'react';

import { useSession } from '@/features/auth/useSession';
import { ConsentGateContext } from '@/features/privacy/useConsentGate';
import type { AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';

const NO_SESSION = {};

export function isWebVoiceEnabled(): boolean {
  return Constants.expoConfig?.extra?.webVoiceEnabled === true;
}

export function useAssistedWriteContext() {
  const { user, sessionEpoch, getSessionEpoch, isLoading } = useSession();
  const { hasConsent, getHasConsent } = useContext(ConsentGateContext);
  const uid = user?.uid ?? null;

  function getCurrentContext(): AssistedWriteContext {
    const isCurrent = sessionEpoch !== null && getSessionEpoch() === sessionEpoch;
    return {
      uid: isCurrent ? uid : null,
      epoch: isCurrent ? sessionEpoch : NO_SESSION,
      hasConsent: isCurrent && !isLoading && getHasConsent(),
      persistenceEnabled: isWebVoiceEnabled(),
    };
  }

  return {
    sessionEpoch,
    canUseVoice: sessionEpoch !== null && uid !== null && !isLoading && hasConsent && isWebVoiceEnabled(),
    getCurrentContext,
  };
}
