import Constants from 'expo-constants';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';

import { logError } from '@/lib/logger';

import { app } from './firebase';

export interface InitAppCheckOptions {
  /**
   * Ignorado na web — existe só para a assinatura bater com `appCheck.native.ts`, onde a
   * atestação do Play Integrity precisa ser trocada por um token via backend.
   */
  attestationExchange?: () => Promise<{ readonly token: string; readonly expireTimeMillis: number }>;
}

const extra = Constants.expoConfig?.extra as { appCheck?: { recaptchaSiteKey?: string } } | undefined;

/**
 * Injeta o debug token no objeto global ANTES de `initializeAppCheck` — o SDK lê
 * `getGlobal().FIREBASE_APPCHECK_DEBUG_TOKEN` uma única vez, na inicialização.
 *
 * Por que ler de `process.env` e NÃO de `expoConfig.extra`: o que vai para `extra` é embutido no
 * manifesto do app e viaja em QUALQUER build, inclusive produção. Já `process.env.EXPO_PUBLIC_*`
 * é inlinado pelo Metro como literal, e este bloco inteiro está dentro de `if (__DEV__)` — que em
 * build de produção é `false` constante, então o bloco (e o literal do token dentro dele) é
 * removido por dead code elimination. O token nunca chega ao bundle de produção.
 *
 * A segunda barreira é operacional e igualmente importante: `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` só
 * pode existir no `.env.local` (gitignored) da máquina do dev — nunca nos secrets do EAS/CI.
 * Um debug token registrado no Console dá acesso irrestrito à sua API: é credencial, não config.
 */
function applyDebugTokenInDevelopment(): void {
  if (!__DEV__) {
    return;
  }

  const debugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

  if (debugToken === undefined || debugToken === '') {
    return;
  }

  const globalScope = globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean };
  globalScope.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}

/**
 * Inicializa o App Check em modo monitor. Retorna `null` (sem lançar) quando não dá para
 * inicializar: enquanto o enforcement estiver desligado no Console, requisição sem token continua
 * passando — derrubar o app por causa disso seria pior que seguir sem App Check.
 *
 * Precisa rodar ANTES da primeira chamada a Firestore/Auth, senão as primeiras requisições saem
 * sem o header `X-Firebase-AppCheck`.
 */
export function initAppCheck(_options: InitAppCheckOptions = {}): AppCheck | null {
  applyDebugTokenInDevelopment();

  const siteKey = extra?.appCheck?.recaptchaSiteKey;

  if (siteKey === undefined || siteKey === '') {
    logError('appCheck.init', new Error('reCAPTCHA Enterprise site key ausente'));
    return null;
  }

  try {
    return initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    logError('appCheck.init', error);
    return null;
  }
}
