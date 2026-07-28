import Constants from 'expo-constants';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const extra = Constants.expoConfig?.extra as { firebase?: FirebaseOptions } | undefined;
const firebaseConfig = extra?.firebase;

if (firebaseConfig === undefined) {
  throw new Error(
    'Config do Firebase ausente em expoConfig.extra. Verifique o app.config.ts e o .env.local.',
  );
}

// Fast Refresh reavalia o módulo; sem o guard, initializeApp lança "already-initialized".
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Na web o padrão do SDK já é persistência local (IndexedDB), então nada a declarar aqui —
// ao contrário do nativo, que sem persistência explícita perderia a sessão a cada cold start.
export const auth: Auth = getAuth(app);

export const firestore: Firestore = getFirestore(app);
