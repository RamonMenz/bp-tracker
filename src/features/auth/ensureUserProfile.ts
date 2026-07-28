import type { User } from 'firebase/auth';

import { userProfileExists, writeUserProfile } from './auth.repo';

const GENERIC_MESSAGE = 'Não foi possível salvar seu perfil. Tente novamente.';

export async function ensureUserProfile(user: User): Promise<void> {
  try {
    const isFirstLogin = !(await userProfileExists(user.uid));
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await writeUserProfile(
      user.uid,
      {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        timezone,
      },
      isFirstLogin,
    );
  } catch {
    throw new Error(GENERIC_MESSAGE);
  }
}
