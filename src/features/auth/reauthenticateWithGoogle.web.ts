import { GoogleAuthProvider, reauthenticateWithPopup, type User } from 'firebase/auth';

const CANCELLED_MESSAGE = 'Confirmação cancelada.';
const GENERIC_MESSAGE = 'Não foi possível confirmar sua identidade. Tente novamente.';

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * O Firebase exige login recente para operações sensíveis (excluir conta). Reautenticar é
 * diferente de logar de novo: mantém o mesmo usuário e só renova a prova de identidade.
 */
export async function reauthenticateWithGoogle(user: User): Promise<void> {
  try {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  } catch (error) {
    const code = getErrorCode(error);

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error(CANCELLED_MESSAGE);
    }

    throw new Error(GENERIC_MESSAGE);
  }
}
