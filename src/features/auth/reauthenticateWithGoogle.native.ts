import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { GoogleAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';

const CANCELLED_MESSAGE = 'Confirmação cancelada.';
const GENERIC_MESSAGE = 'Não foi possível confirmar sua identidade. Tente novamente.';

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

/**
 * O Firebase exige login recente para operações sensíveis (excluir conta). Reautenticar é
 * diferente de logar de novo: mantém o mesmo usuário e só renova a prova de identidade.
 */
export async function reauthenticateWithGoogle(user: User): Promise<void> {
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

    await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
  } catch (error) {
    if (error instanceof Error && error.message === CANCELLED_MESSAGE) {
      throw error;
    }

    throw new Error(GENERIC_MESSAGE);
  }
}
