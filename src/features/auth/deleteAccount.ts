import { deleteUser } from 'firebase/auth';

import { logError } from '@/lib/logger';
import { auth } from '@/services/firebase';

import { reauthenticateWithGoogle } from './reauthenticateWithGoogle';

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível excluir sua conta. Tente novamente.';

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Exclui a conta do Auth, o que dispara o trigger `onUserDelete` nas Functions — é ele que apaga
 * `users/{uid}` (com readings e devices) e `schedules/{uid}`.
 *
 * O cliente NÃO apaga os dados do Firestore por conta própria de propósito: uma varredura
 * client-side pode ser interrompida no meio (app fechado, rede caindo) e deixaria dado de saúde
 * órfão, sem ninguém para terminar o serviço. O trigger roda no servidor, com retry.
 *
 * Só deve ser chamada DEPOIS da confirmação explícita do usuário — esta função não pergunta nada.
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;

  if (user === null) {
    throw new Error(NOT_SIGNED_IN_MESSAGE);
  }

  const { uid } = user;

  try {
    await deleteUser(user);
  } catch (error) {
    if (getErrorCode(error) !== 'auth/requires-recent-login') {
      logError('auth.deleteAccount', error, { uid });
      throw new Error(getErrorCode(error) === 'auth/network-request-failed' ? NETWORK_MESSAGE : GENERIC_MESSAGE);
    }

    // O Firebase recusa excluir conta com login antigo. Renova a prova de identidade e tenta de
    // novo — o cancelamento na tela do Google propaga a mensagem própria de "cancelado".
    await reauthenticateWithGoogle(user);

    try {
      await deleteUser(user);
    } catch (retryError) {
      logError('auth.deleteAccount.retry', retryError, { uid });
      throw new Error(
        getErrorCode(retryError) === 'auth/network-request-failed' ? NETWORK_MESSAGE : GENERIC_MESSAGE,
      );
    }
  }
}
