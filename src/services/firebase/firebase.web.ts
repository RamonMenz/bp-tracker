import Constants from 'expo-constants';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const extra = Constants.expoConfig?.extra as { firebase?: FirebaseOptions } | undefined;
const firebaseConfig = extra?.firebase;

if (firebaseConfig === undefined) {
  throw new Error(
    'Config do Firebase ausente em expoConfig.extra. Verifique o app.config.ts e o .env.local.',
  );
}

// Fast Refresh reavalia o módulo; sem o guard, initializeApp lança "already-initialized" (e,
// abaixo, initializeFirestore lançaria "Firestore has already been started").
const isFirstInit = getApps().length === 0;

export const app: FirebaseApp = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Na web o padrão do SDK já é persistência local (IndexedDB) para o Auth, então nada a declarar
// aqui — ao contrário do nativo, que sem persistência explícita perderia a sessão a cada cold start.
export const auth: Auth = getAuth(app);

/**
 * `getFirestore(app)` sozinho usa só cache em memória — o SDK web só liga o cache em IndexedDB
 * quando pedido explicitamente via `initializeFirestore` + `localCache`. O CLAUDE.md descreve o
 * banco como "offline-first", e o selo "Pendente de sincronização" (`hasPendingWrites` em
 * `ReadingRow`) pressupõe justamente isso: sem cache persistente, uma escrita que ainda não
 * sincronizou se perde num reload da aba.
 *
 * `persistentMultipleTabManager`, não `persistentSingleTabManager`: o app pode ficar aberto em
 * mais de uma aba ao mesmo tempo, e é o multi-tab que sincroniza queries/mutations entre elas.
 *
 * Sem try/catch aqui, de propósito: o cenário real de "IndexedDB indisponível" (navegador sem
 * suporte, modo privado antigo do Safari) não lança de `initializeFirestore` — a checagem é
 * interna ao SDK e só roda mais tarde, de forma assíncrona, na primeira operação real (dentro do
 * client, não neste call site). Um try/catch síncrono aqui não pegaria esse caso; o que ele
 * pegaria é erro de configuração (ex.: chamar isto duas vezes no mesmo app, coberto acima pelo
 * guard `isFirstInit`), e para esse tipo de erro o padrão já estabelecido neste arquivo é deixar
 * propagar — igual ao `firebaseConfig` ausente logo no topo.
 */
export const firestore: Firestore = isFirstInit
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : getFirestore(app);
