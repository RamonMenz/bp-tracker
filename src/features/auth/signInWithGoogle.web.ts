import { GoogleAuthProvider, signInWithPopup, type UserCredential } from 'firebase/auth';

import { auth } from '@/services/firebase';

const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
  'auth/popup-closed-by-user': 'Login cancelado.',
};

const GENERIC_MESSAGE = 'Não foi possível entrar. Tente novamente.';

export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    throw new Error(mapFirebaseErrorCode(error));
  }
}

function mapFirebaseErrorCode(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string' && code in FRIENDLY_MESSAGES) {
      return FRIENDLY_MESSAGES[code];
    }
  }
  return GENERIC_MESSAGE;
}
