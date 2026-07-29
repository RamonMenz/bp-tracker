import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/services/firebase';

import { ensureUserProfile } from './ensureUserProfile';
import { signInWithGoogle } from './signInWithGoogle';

export interface UseSessionResult {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const GENERIC_SIGN_IN_MESSAGE = 'Não foi possível entrar. Tente novamente.';
const GENERIC_SIGN_OUT_MESSAGE = 'Não foi possível sair. Tente novamente.';
const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function useSessionState(): UseSessionResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser === null) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Falha ao sincronizar o perfil não deve travar o login — o próximo
      // onAuthStateChanged (próxima abertura do app) tenta de novo.
      ensureUserProfile(nextUser)
        .catch(() => undefined)
        .finally(() => {
          setUser(nextUser);
          setIsLoading(false);
        });
    });

    return unsubscribe;
  }, []);

  async function signIn(): Promise<void> {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      throw error instanceof Error ? error : new Error(GENERIC_SIGN_IN_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      const message =
        getErrorCode(error) === 'auth/network-request-failed' ? NETWORK_MESSAGE : GENERIC_SIGN_OUT_MESSAGE;
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return { user, isLoading, signIn, signOut };
}

const SessionContext = createContext<UseSessionResult | null>(null);

// Provider único no _layout.tsx: garante um só onAuthStateChanged (e um só ensureUserProfile
// por transição de estado) mesmo com várias telas consumindo useSession.
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSessionState();

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): UseSessionResult {
  const context = useContext(SessionContext);

  if (context === null) {
    throw new Error('useSession precisa estar dentro de um SessionProvider.');
  }

  return context;
}
