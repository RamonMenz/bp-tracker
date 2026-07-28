import { doc, getDoc, serverTimestamp, setDoc, type FieldValue } from 'firebase/firestore';

import { userDocPath } from '@/lib/firestore-paths';
import { firestore } from '@/services/firebase';
import type { UserProfile } from '@/types/models';

export type UserProfileInput = Pick<UserProfile, 'displayName' | 'email' | 'photoURL' | 'timezone'>;

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
