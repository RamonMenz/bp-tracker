import { CustomProvider, initializeAppCheck, type AppCheck, type AppCheckToken } from 'firebase/app-check';

import { logError } from '@/lib/logger';

import { app } from './firebase';

export interface InitAppCheckOptions {
  /**
   * Troca uma atestação do Play Integrity por um App Check token, via backend.
   *
   * POR QUE ISSO É NECESSÁRIO: o Firebase JS SDK (`firebase/app-check`) expõe apenas
   * `ReCaptchaV3Provider`, `ReCaptchaEnterpriseProvider` e `CustomProvider` — NÃO existe provider
   * de Play Integrity. Ele só existe nos SDKs nativos. E inicializar App Check via
   * `@react-native-firebase/app-check` não resolveria: o token é anexado pelo SDK que faz a
   * requisição, então ele iria para as chamadas do RNFirebase, e o Firestore deste app (JS SDK)
   * continuaria saindo sem App Check.
   *
   * O fluxo correto com esta stack:
   *   1. módulo nativo obtém a atestação do Play Integrity;
   *   2. envia para uma Cloud Function;
   *   3. a Function VERIFICA a atestação na Play Integrity API — este passo não é opcional:
   *      `admin.appCheck().createToken()` emite token sem validar nada, então sem a verificação
   *      qualquer um chama o endpoint e ganha um App Check válido, anulando o recurso;
   *   4. a Function emite o token com o Admin SDK e devolve `{ token, expireTimeMillis }`.
   */
  attestationExchange?: () => Promise<AppCheckToken>;
}

/**
 * Injeta o debug token no objeto global ANTES de `initializeAppCheck` — o SDK lê
 * `getGlobal().FIREBASE_APPCHECK_DEBUG_TOKEN` uma única vez, na inicialização. Funciona no React
 * Native porque o `getGlobal()` do @firebase/util cai em `global` quando não há `self`/`window`.
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
function applyDebugTokenInDevelopment(): boolean {
  if (!__DEV__) {
    return false;
  }

  const debugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

  if (debugToken === undefined || debugToken === '') {
    return false;
  }

  const globalScope = globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean };
  globalScope.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;

  return true;
}

/**
 * Inicializa o App Check em modo monitor. Retorna `null` (sem lançar) quando não dá para
 * inicializar: enquanto o enforcement estiver desligado no Console, requisição sem token continua
 * passando — derrubar o app por causa disso seria pior que seguir sem App Check.
 *
 * Precisa rodar ANTES da primeira chamada a Firestore/Auth, senão as primeiras requisições saem
 * sem o header `X-Firebase-AppCheck`.
 */
export function initAppCheck(options: InitAppCheckOptions = {}): AppCheck | null {
  const isDebugMode = applyDebugTokenInDevelopment();
  const { attestationExchange } = options;

  // Em modo debug o SDK troca o debug token direto no endpoint de exchange e NUNCA chama o
  // provider — por isso o provider abaixo pode ser um stub que lança: em dev ele não é exercido.
  if (attestationExchange === undefined && !isDebugMode) {
    logError(
      'appCheck.init',
      new Error('App Check nativo sem attestationExchange e sem debug token — inicialização ignorada'),
    );
    return null;
  }

  const getToken =
    attestationExchange ??
    ((): Promise<AppCheckToken> => {
      throw new Error('attestationExchange não configurado');
    });

  try {
    return initializeAppCheck(app, {
      provider: new CustomProvider({ getToken }),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    logError('appCheck.init', error);
    return null;
  }
}
