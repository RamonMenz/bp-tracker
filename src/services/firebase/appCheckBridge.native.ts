import type {
  AppCheck as NativeAppCheck,
  ReactNativeFirebaseAppCheckProviderAndroidOptions,
} from '@react-native-firebase/app-check';
import type { AppCheckToken } from 'firebase/app-check';

import { getJwtExpiryMillis } from '@/lib/jwt-expiry';
import { logError } from '@/lib/logger';

/**
 * O módulo é carregado por `require` TARDIO, pelo mesmo motivo de `crashReporter.native.ts`: os
 * pacotes `@react-native-firebase/*` lançam JÁ NA IMPORTAÇÃO quando o módulo nativo não está
 * registrado. Esta ponte é alcançada por `services/firebase/index.ts` — o caminho único até
 * `auth`/`firestore` —, então um `import` estático derrubaria o BOOT de qualquer Dev Client
 * compilado antes desta dependência existir. Com o require aqui, isso degrada para "sem App
 * Check" (a falha cai no `catch` de `getNativeAppCheckToken`, que loga) em vez de "app não abre".
 */
type NativeAppCheckModule = typeof import('@react-native-firebase/app-check');

let nativeAppCheck: { api: NativeAppCheckModule; instance: NativeAppCheck } | null = null;

/**
 * Provider nativo do Android: Play Integrity em produção, debug em desenvolvimento.
 *
 * O debug token sai de `process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN` DENTRO de `if (__DEV__)`, e
 * não de `expoConfig.extra`: `extra` é embutido no manifesto de QUALQUER build, inclusive
 * produção. Já `process.env.EXPO_PUBLIC_*` é inlinado pelo Metro como literal, e em build de
 * produção `__DEV__` é `false` constante — o bloco inteiro (e o literal do token dentro dele) some
 * por dead code elimination. O token nunca chega ao bundle de produção. A segunda barreira é
 * operacional: a variável só existe no `.env.local` do dev, nunca nos secrets do EAS/CI — um debug
 * token registrado no Console é credencial, não config.
 *
 * Sem a variável em dev, o debug provider nativo gera um token aleatório e o imprime no logcat
 * ("Enter this debug secret into the allow list...") — basta registrá-lo no Console.
 *
 * Exportada para o teste garantir que produção nunca configura `debug`.
 */
export function getAndroidProviderOptions(): ReactNativeFirebaseAppCheckProviderAndroidOptions {
  if (__DEV__) {
    const debugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

    return {
      provider: 'debug',
      debugToken: debugToken === undefined || debugToken === '' ? undefined : debugToken,
    };
  }

  return { provider: 'playIntegrity' };
}

function getNativeAppCheck(): { api: NativeAppCheckModule; instance: NativeAppCheck } {
  if (nativeAppCheck === null) {
    // O require tardio é o PONTO desta função (ver o bloco de doc acima) — trocar por import
    // estático reintroduz o crash de boot. Por isso a regra é desligada nesta linha, e só nela.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('@react-native-firebase/app-check') as NativeAppCheckModule;
    const provider = new api.ReactNativeFirebaseAppCheckProvider();
    provider.configure({ android: getAndroidProviderOptions() });

    // App padrão do RNFirebase = o app ANDROID do google-services.json (é ele que o Play
    // Integrity atesta). `configureProvider` é despachado ao nativo de forma síncrona aqui dentro,
    // então o `getToken` seguinte já chega à fila nativa depois do provider instalado.
    //
    // Auto-refresh nativo DESLIGADO de propósito: quem decide quando renovar é o App Check do JS
    // SDK, que chama `getNativeAppCheckToken` antes do token vencer. Com os dois ligados, o nativo
    // renovaria em paralelo por conta própria, gastando cota diária da Play Integrity API à toa.
    const instance = api.initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: false });

    nativeAppCheck = { api, instance };
  }

  return nativeAppCheck;
}

/**
 * Fonte do token para o `CustomProvider` do Firebase JS SDK (ver `appCheck.native.ts`).
 *
 * O RNFirebase devolve só `{ token }` (o módulo nativo Android da 26.x não preenche
 * `expireTimeMillis` no `getToken`), então a expiração sai do claim `exp` do próprio JWT.
 *
 * Em falha: loga e RELANÇA. O App Check do JS SDK trata erro do provider com retry e backoff
 * exponencial; inventar um token aqui só trocaria um erro tratável por requisições rejeitadas.
 */
export async function getNativeAppCheckToken(): Promise<AppCheckToken> {
  try {
    const { api, instance } = getNativeAppCheck();
    // forceRefresh = false: o nativo devolve o token em cache enquanto válido e só vai à Play
    // Integrity quando precisa — o JS SDK já pede no momento certo.
    const { token } = await api.getToken(instance, false);
    const expireTimeMillis = getJwtExpiryMillis(token);

    if (expireTimeMillis === null) {
      throw new Error('Token do App Check nativo sem exp legível');
    }

    return { token, expireTimeMillis };
  } catch (error) {
    logError('appCheck.nativeToken', error);
    throw error;
  }
}
