import { onIdTokenChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { auth } from '@/services/firebase';

import { ensureUserProfile } from './ensureUserProfile';
import { signInWithGoogle } from './signInWithGoogle';

interface SessionEpoch {
  readonly id: number;
}

export interface UseSessionResult {
  user: User | null;
  sessionEpoch: SessionEpoch | null;
  getSessionEpoch: () => SessionEpoch | null;
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
  const [identity, setIdentity] = useState<{ user: User; epoch: SessionEpoch } | null>(null);
  const currentIdentity = useRef(identity);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let observedUser: User | null | undefined;
    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      // Um novo login pode substituir o objeto User sem mudar o UID. Refresh do
      // token do mesmo objeto conserva o epoch e a revisão em andamento.
      if (!active || observedUser === nextUser) return;
      observedUser = nextUser;
      const currentGeneration = ++generation;
      // Retirar a identidade anterior antes de aguardar qualquer sincronização.
      currentIdentity.current = null;
      setIdentity(null);
      if (nextUser === null) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // Falha ao sincronizar o perfil não deve travar o login — o próximo
      // login (ou a próxima abertura do app) tenta de novo.
      ensureUserProfile(nextUser)
        .catch(() => undefined)
        .finally(() => {
          if (!active || currentGeneration !== generation) return;
          const nextIdentity = { user: nextUser, epoch: { id: currentGeneration } };
          currentIdentity.current = nextIdentity;
          setIdentity(nextIdentity);
          setIsLoading(false);
        });
    });

    return () => { active = false; currentIdentity.current = null; unsubscribe(); };
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

  function getSessionEpoch(): SessionEpoch | null {
    const active = currentIdentity.current;
    return active && active.user === auth.currentUser ? active.epoch : null;
  }

  return {
    user: identity?.user ?? null,
    sessionEpoch: identity?.epoch ?? null,
    getSessionEpoch,
    isLoading,
    signIn,
    signOut,
  };
}

const SessionContext = createContext<UseSessionResult | null>(null);

// Provider único no _layout.tsx: garante um só observador do Firebase Auth (e um só ensureUserProfile
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
