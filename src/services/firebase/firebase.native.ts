import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
// getReactNativePersistence só existe na build RN de @firebase/auth (condição "react-native" do
// package.json) — o pacote guarda-chuva 'firebase/auth' não declara essa condição e cairia na
// build genérica sem persistência nativa.
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from '@firebase/auth';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const extra = Constants.expoConfig?.extra as { firebase?: FirebaseOptions } | undefined;
const firebaseConfig = extra?.firebase;

if (firebaseConfig === undefined) {
  throw new Error(
    'Config do Firebase ausente em expoConfig.extra. Verifique o app.config.ts e o .env.local.',
  );
}

// Fast Refresh reavalia o módulo; sem o guard, initializeApp/initializeAuth lançam "already-initialized".
const isFirstInit = getApps().length === 0;

export const app: FirebaseApp = isFirstInit ? initializeApp(firebaseConfig) : getApp();

/**
 * No nativo a persistência PRECISA ser declarada: sem `getReactNativePersistence`, o SDK web
 * cai na persistência em memória (não existe localStorage no RN) e a sessão morre junto com o
 * processo — o usuário volta para a tela de login a cada cold start.
 */
export const auth: Auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const firestore: Firestore = getFirestore(app);
