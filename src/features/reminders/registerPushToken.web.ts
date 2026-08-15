import Constants from 'expo-constants';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

import { devicesCollectionPath } from '@/lib/firestore-paths';
import { hashToken } from '@/lib/hash-token';
import { firestore } from '@/services/firebase';
// Import explícito do arquivo `.web`, não do barrel `@/services/firebase`: o tsconfig deste
// projeto usa `moduleSuffixes: ['.native', '']` (ver comentário lá) — de propósito, para resolver
// pacotes de terceiros com um único shim `.web`. Efeito colateral: ISSO faz o tsc resolver
// `./firebase`/`@/services/firebase` sempre contra `firebase.native.ts`, mesmo a partir de um
// arquivo `.web.ts` como este. `getMessagingInstance` só existe no lado web (o nativo usa
// `expo-notifications` direto, nunca `firebase/messaging`) — pelo barrel, o typecheck acusaria
// "no exported member". Apontar direto pro arquivo concreto contorna isso e continua resolvendo
// certo em runtime (é exatamente o mesmo arquivo que o Metro escolheria para a plataforma web).
import { getMessagingInstance } from '@/services/firebase/firebase.web';

// Mensagens separadas de propósito (o pedido de revisão do PLAN §2 é explícito nisso): um
// navegador sem suporte e uma VAPID key ausente são bugs completamente diferentes — o primeiro é
// uma limitação do aparelho do usuário, o segundo é erro de configuração do ambiente. Confundir
// as duas mensagens faria quem for depurar perder tempo checando a coisa errada.
const WEB_NOT_SUPPORTED_MESSAGE =
  'Este navegador não tem suporte a notificações push. Use o app no Android ou tente em outro navegador.';
const VAPID_KEY_MISSING_MESSAGE =
  'Notificações push na web não estão configuradas neste ambiente. Avise o suporte.';
const PERMISSION_DENIED_MESSAGE = 'Permita notificações nas configurações do navegador para receber lembretes.';
const GENERIC_MESSAGE = 'Não foi possível ativar as notificações. Tente novamente.';

const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

/** Só os campos que o app.config.ts realmente escreve em extra.firebase (ver ali). */
interface WebFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  vapidKey?: string;
}

/**
 * O service worker (public/firebase-messaging-sw.js) não enxerga `expoConfig.extra` — ele roda
 * fora do bundle, antes de qualquer JS do app carregar. A config chega até ele por query string no
 * `register()`, é o próprio arquivo do SW que documenta esse contrato.
 */
function buildServiceWorkerUrl(config: WebFirebaseConfig): string {
  const params = new URLSearchParams({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
    messagingSenderId: config.messagingSenderId,
  });

  return `${SERVICE_WORKER_PATH}?${params.toString()}`;
}

/** Espelha o check-then-request de registerPushToken.native.ts — evita pedir permissão de novo
 *  quando ela já foi concedida numa visita anterior. */
async function ensureNotificationPermission(): Promise<void> {
  const current = Notification.permission;
  const finalStatus = current === 'granted' ? current : await Notification.requestPermission();

  if (finalStatus !== 'granted') {
    throw new Error(PERMISSION_DENIED_MESSAGE);
  }
}

export async function registerPushToken(uid: string): Promise<void> {
  const messaging = await getMessagingInstance();

  if (messaging === null) {
    throw new Error(WEB_NOT_SUPPORTED_MESSAGE);
  }

  const extra = Constants.expoConfig?.extra as { firebase?: WebFirebaseConfig } | undefined;
  const firebaseConfig = extra?.firebase;
  const vapidKey = firebaseConfig?.vapidKey;

  if (firebaseConfig === undefined || vapidKey === undefined) {
    throw new Error(VAPID_KEY_MISSING_MESSAGE);
  }

  try {
    await ensureNotificationPermission();

    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      buildServiceWorkerUrl(firebaseConfig),
    );

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    const tokenHash = hashToken(token);

    await setDoc(
      doc(firestore, devicesCollectionPath(uid), tokenHash),
      {
        token,
        platform: 'web',
        lastSeenAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    if (error instanceof Error && error.message === PERMISSION_DENIED_MESSAGE) {
      throw error;
    }

    throw new Error(GENERIC_MESSAGE);
  }
}
