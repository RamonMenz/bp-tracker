import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from 'firebase/auth';

import { auth } from '@/services/firebase';

const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
};

const CANCELLED_MESSAGE = 'Login cancelado.';
const GENERIC_MESSAGE = 'Não foi possível entrar. Tente novamente.';

let isGoogleSignInConfigured = false;

function ensureGoogleSignInConfigured(): void {
  if (isGoogleSignInConfigured) {
    return;
  }

  const extra = Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined;
  const webClientId = extra?.googleWebClientId;

  if (webClientId === undefined) {
    throw new Error('Configuração de login com Google ausente. Verifique o app.config.ts e o .env.local.');
  }

  GoogleSignin.configure({ webClientId });
  isGoogleSignInConfigured = true;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    ensureGoogleSignInConfigured();
    await GoogleSignin.hasPlayServices();

    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      throw new Error(CANCELLED_MESSAGE);
    }

    const { idToken } = response.data;

    if (idToken === null) {
      throw new Error(GENERIC_MESSAGE);
    }

    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
  } catch (error) {
    if (error instanceof Error && (error.message === CANCELLED_MESSAGE || error.message === GENERIC_MESSAGE)) {
      throw error;
    }
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
