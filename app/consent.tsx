import { useState } from 'react';
import { Linking } from 'react-native';

import { useSession } from '@/features/auth/useSession';
import { useAcceptPrivacyConsent } from '@/features/privacy/useAcceptPrivacyConsent';
import { PRIVACY_POLICY_URL } from '@/lib/legal';
import { ConsentScreen } from '@/screens/ConsentScreen';

const PRIVACY_POLICY_FAILED_MESSAGE = 'Não foi possível abrir a política de privacidade. Tente novamente mais tarde.';
const SIGN_OUT_FAILED_MESSAGE = 'Não foi possível sair. Tente novamente.';

/**
 * Rota de composição (CLAUDE.md §3.2): liga `ConsentScreen` aos hooks. Não navega — chegar e sair
 * daqui é trabalho do `useConsentGate` (app/_layout.tsx), inclusive depois do aceite.
 */
export default function ConsentRoute() {
  const { signOut, isLoading: isSigningOut } = useSession();
  const { accept, isSaving, error: acceptError } = useAcceptPrivacyConsent();
  const [actionError, setActionError] = useState<string | null>(null);

  function handleAccept(): void {
    setActionError(null);
    void accept();
  }

  async function handleSignOut(): Promise<void> {
    setActionError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setActionError(signOutError instanceof Error ? signOutError.message : SIGN_OUT_FAILED_MESSAGE);
    }
  }

  async function handleOpenPrivacyPolicy(): Promise<void> {
    setActionError(null);
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      setActionError(PRIVACY_POLICY_FAILED_MESSAGE);
    }
  }

  return (
    <ConsentScreen
      onAccept={handleAccept}
      onSignOut={() => void handleSignOut()}
      onOpenPrivacyPolicy={() => void handleOpenPrivacyPolicy()}
      isSaving={isSaving}
      isSigningOut={isSigningOut}
      error={actionError ?? acceptError}
    />
  );
}
