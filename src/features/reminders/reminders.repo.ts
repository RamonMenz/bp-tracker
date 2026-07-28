import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import { userDocPath } from '@/lib/firestore-paths';
import { firestore } from '@/services/firebase';

export interface ReminderSettings {
  reminderTimes: string[];
  notificationsEnabled: boolean;
}

const PERMISSION_MESSAGE = 'Sem permissão para salvar. Faça login novamente.';
const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível salvar suas preferências. Tente novamente.';

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * `users/{uid}` ainda não tem schema Zod (só `Reading` tem, via reading.schema.ts) — mesma
 * validação defensiva por campo já usada nos triggers das Functions para o mesmo documento.
 */
function toReminderSettings(data: Record<string, unknown> | undefined): ReminderSettings {
  const reminderTimes = Array.isArray(data?.reminderTimes)
    ? data.reminderTimes.filter((time): time is string => typeof time === 'string')
    : [];

  return {
    reminderTimes,
    notificationsEnabled: data?.notificationsEnabled === true,
  };
}

export function subscribeReminderSettings(
  uid: string,
  onNext: (settings: ReminderSettings) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, userDocPath(uid)),
    (snapshot) => onNext(toReminderSettings(snapshot.data())),
    onError,
  );
}

export async function writeReminderSettings(uid: string, settings: ReminderSettings): Promise<void> {
  try {
    await setDoc(
      doc(firestore, userDocPath(uid)),
      { ...settings, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    const code = getErrorCode(error);

    if (code === 'permission-denied') {
      throw new Error(PERMISSION_MESSAGE);
    }

    if (code === 'unavailable') {
      throw new Error(NETWORK_MESSAGE);
    }

    throw new Error(GENERIC_MESSAGE);
  }
}

export function mapReminderSubscribeError(error: FirestoreError): string {
  if (error.code === 'permission-denied') {
    return PERMISSION_MESSAGE;
  }

  if (error.code === 'unavailable') {
    return NETWORK_MESSAGE;
  }

  return 'Não foi possível carregar suas preferências. Tente novamente.';
}
