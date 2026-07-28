import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { auth } from '@/services/firebase';

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

export function useSession(): UseSessionResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
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
      const message = getErrorCode(error) === 'auth/network-request-failed' ? NETWORK_MESSAGE : GENERIC_SIGN_OUT_MESSAGE;
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return { user, isLoading, signIn, signOut };
}
