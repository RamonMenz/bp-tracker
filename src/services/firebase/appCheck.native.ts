import { CustomProvider, initializeAppCheck, type AppCheck, type AppCheckToken } from 'firebase/app-check';

import { logError } from '@/lib/logger';

import { getNativeAppCheckToken } from './appCheckBridge.native';
import { app } from './firebase';

export interface InitAppCheckOptions {
  /**
   * Substitui a fonte padrão do token (a ponte com o RNFirebase). Existe para o Caminho B do
   * plano (docs/plans/plano_lacunas_criticas.md, Item 5): se o Firestore recusar o token emitido
   * para o app Android, a troca passa a ser feita por uma Cloud Function própria — que, nesse
   * caso, PRECISA verificar a atestação na Play Integrity API antes de emitir o token com
   * `admin.appCheck().createToken()`, que não valida nada sozinho.
   */
  attestationExchange?: () => Promise<AppCheckToken>;
}

/**
 * Inicializa o App Check do Firebase JS SDK no nativo, com o token vindo do SDK NATIVO de App Check.
 *
 * POR QUE A PONTE: o `firebase/app-check` só tem `ReCaptchaV3Provider`,
 * `ReCaptchaEnterpriseProvider` e `CustomProvider` — não existe provider de Play Integrity no JS
 * SDK; ele só existe nos SDKs nativos. Por isso `@react-native-firebase/app-check` entra aqui como
 * FONTE do token, e não como o App Check do app. A diferença importa:
 *   - INICIALIZAR o App Check pelo RNFirebase e parar aí não protegeria nada deste app: o header
 *     `X-Firebase-AppCheck` é anexado pelo SDK que faz a requisição, e todo o Firestore/Auth daqui
 *     sai pelo JS SDK — o token ficaria preso às chamadas do RNFirebase, que não existem.
 *   - USAR o RNFirebase só para obter o token (provider nativo de Play Integrity, atestação
 *     validada pelo próprio Firebase) e entregá-lo ao JS SDK por este `CustomProvider` faz o token
 *     sair nas requisições certas. Ver `appCheckBridge.native.ts`.
 *
 * Debug: um único caminho, o debug provider NATIVO, configurado na ponte. A injeção de
 * `FIREBASE_APPCHECK_DEBUG_TOKEN` no global do JS SDK que existia aqui foi removida por ficar
 * redundante — e pior: em modo debug o JS SDK nunca chama o provider, então o dev build não
 * exercitaria a ponte que vai para produção. Com o debug provider nativo, o dev build passa pelo
 * mesmo `CustomProvider` → ponte → RNFirebase que o build de produção.
 *
 * Roda em modo monitor até o enforcement ser ligado no Console. Retorna `null` (sem lançar) quando
 * não dá para inicializar — derrubar o app por isso seria pior que seguir sem App Check. Falha ao
 * OBTER o token não passa por aqui: acontece depois, dentro do provider, que loga
 * (`appCheck.nativeToken`) e deixa o JS SDK tentar de novo com backoff.
 *
 * Precisa rodar ANTES da primeira chamada a Firestore/Auth, senão as primeiras requisições saem
 * sem o header `X-Firebase-AppCheck`.
 */
export function initAppCheck(options: InitAppCheckOptions = {}): AppCheck | null {
  const getToken = options.attestationExchange ?? getNativeAppCheckToken;

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
