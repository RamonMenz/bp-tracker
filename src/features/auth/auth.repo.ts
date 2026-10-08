import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type FieldValue,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import { userDocPath } from '@/lib/firestore-paths';
import { logError } from '@/lib/logger';
import { firestore } from '@/services/firebase';
import type { AcceptedPrivacyConsent, UserProfile } from '@/types/models';

import { parsePrivacyConsent } from './user-profile.schema';

export type UserProfileInput = Pick<UserProfile, 'displayName' | 'email' | 'photoURL' | 'timezone'>;

const CONSENT_PERMISSION_MESSAGE = 'Sem permissão para registrar sua autorização. Faça login novamente.';
const CONSENT_NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const CONSENT_GENERIC_MESSAGE = 'Não foi possível registrar sua autorização. Tente novamente.';

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

type UserProfileWritePayload = UserProfileInput & {
  updatedAt: FieldValue;
  notificationsEnabled?: boolean;
  reminderTimes?: string[];
  createdAt?: FieldValue;
};

export async function userProfileExists(uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(firestore, userDocPath(uid)));
  return snapshot.exists();
}

/**
 * Este payload NUNCA leva `privacyConsent`: o merge preserva o aceite já gravado. Incluir o campo
 * aqui (mesmo como `undefined` → removido, ou regravado) apagaria ou reescreveria a prova do
 * consentimento a cada login.
 *
 * `isFirstLogin` decide o que entra no merge: em todo login atualizamos os campos que podem
 * mudar (nome, e-mail, foto, timezone); só no primeiro login gravamos os defaults de
 * notificação e `createdAt` — senão cada login apagaria as preferências já configuradas pelo usuário.
 */
export async function writeUserProfile(
  uid: string,
  input: UserProfileInput,
  isFirstLogin: boolean,
): Promise<void> {
  const timestamp = serverTimestamp();

  const payload: UserProfileWritePayload = {
    ...input,
    updatedAt: timestamp,
  };

  if (isFirstLogin) {
    payload.notificationsEnabled = false;
    payload.reminderTimes = [];
    payload.createdAt = timestamp;
  }

  await setDoc(doc(firestore, userDocPath(uid)), payload, { merge: true });
}

/**
 * Grava a prova do consentimento. `acceptedAt` é `serverTimestamp()` — as rules exigem que seja
 * exatamente `request.time`, então o horário do aparelho nunca entra na prova.
 *
 * O `await` só resolve com a confirmação do servidor, e é isso que o fluxo quer: o gate só libera
 * o app quando o aceite existe no servidor, não só no cache local (ver `subscribePrivacyConsent`).
 */
export async function writePrivacyConsent(uid: string, version: string): Promise<void> {
  try {
    await setDoc(
      doc(firestore, userDocPath(uid)),
      {
        privacyConsent: { version, acceptedAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    logError('auth.writePrivacyConsent', error, { uid });

    const code = getErrorCode(error);

    if (code === 'permission-denied') {
      throw new Error(CONSENT_PERMISSION_MESSAGE);
    }

    if (code === 'unavailable') {
      throw new Error(CONSENT_NETWORK_MESSAGE);
    }

    throw new Error(CONSENT_GENERIC_MESSAGE);
  }
}

/**
 * Escuta o aceite gravado em `users/{uid}`, já validado pelo schema.
 *
 * Dois tipos de snapshot são ignorados de propósito — o gate fica com o último valor conhecido:
 *  - `hasPendingWrites`: o aceite ainda só existe no cache local. A prova que vale é a do
 *    servidor; liberar o app antes disso deixaria o usuário seguir com uma escrita que as rules
 *    ainda podem recusar.
 *  - `fromCache` sem documento: offline e sem cache, "não existe" significa "não sei", não "não
 *    aceitou" — tratar como recusa mandaria quem já aceitou de volta para a tela de consentimento.
 */
export function subscribePrivacyConsent(
  uid: string,
  onNext: (consent: AcceptedPrivacyConsent | null) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, userDocPath(uid)),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      if (snapshot.metadata.fromCache && !snapshot.exists()) {
        return;
      }

      onNext(parsePrivacyConsent(snapshot.data()));
    },
    onError,
  );
}
