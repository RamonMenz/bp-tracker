import { useState } from 'react';

import { writePrivacyConsent } from '@/features/auth/auth.repo';
import { useSession } from '@/features/auth/useSession';
import { PRIVACY_POLICY_VERSION } from '@/lib/legal';

export interface UseAcceptPrivacyConsentResult {
  accept: () => Promise<boolean>;
  isSaving: boolean;
  error: string | null;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const GENERIC_MESSAGE = 'Não foi possível registrar sua autorização. Tente novamente.';

/**
 * Registra o aceite da versão vigente. Não navega: quem tira o usuário de `/consent` é o
 * `useConsentGate`, quando o aceite aparece confirmado no servidor.
 */
export function useAcceptPrivacyConsent(): UseAcceptPrivacyConsentResult {
  const { user } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(): Promise<boolean> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return false;
    }

    setError(null);
    setIsSaving(true);

    try {
      await writePrivacyConsent(user.uid, PRIVACY_POLICY_VERSION);
      return true;
    } catch (writeError) {
      setError(writeError instanceof Error ? writeError.message : GENERIC_MESSAGE);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { accept, isSaving, error };
}
