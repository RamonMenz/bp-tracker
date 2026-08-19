/**
 * Coletor de erro em produção na WEB, via `@sentry/browser`.
 *
 * Por que Sentry e não o mesmo coletor do nativo: `@react-native-firebase/crashlytics` é módulo
 * NATIVO — não existe build web dele, e o Firebase JS SDK que este app usa não expõe Crashlytics.
 * O produto simplesmente não tem SDK web, então a paridade com `crashReporter.native.ts` só é
 * alcançável com um coletor de terceiros.
 *
 * Por que `@sentry/browser` e não `@sentry/react`: não há Error Boundary nem instrumentação de
 * componente sendo pedida — toda captura de erro do app passa por `logError` dentro de `try/catch`
 * explícito (CLAUDE.md §4.3), nunca por um boundary. O SDK vanilla entrega o mesmo resultado sem
 * as integrações React que o app não usa, com menos peso no bundle web. E não é
 * `@sentry/react-native` porque o nativo já tem Crashlytics funcionando — trocar de coletor lá
 * está fora de escopo.
 *
 * LGPD (CLAUDE.md §4.4): Sentry é um processador de dados a mais recebendo stack traces de um app
 * de saúde. As opções de privacidade passadas a `Sentry.init` NÃO são ajuste opcional — são parte
 * do que torna essa integração aceitável. O `context` que chega aqui já vem sanitizado por
 * `logError` (chaves de PII e de dado de medição são removidas lá), e este adapter nunca
 * identifica o usuário: não há `Sentry.setUser` em ponto nenhum, mesma paridade do lado nativo.
 */
import * as Sentry from '@sentry/browser';
import Constants from 'expo-constants';

import { logError, type CrashReporter } from '@/lib/logger';
import { toError } from '@/lib/toError';

const extra = Constants.expoConfig?.extra as { sentry?: { dsn?: string } } | undefined;

/**
 * Nome da integração de rastreio de SESSÃO, ligada por padrão em `Sentry.init` — filtrá-la é o
 * `autoSessionTracking: false` das versões antigas do SDK, opção que deixou de existir a partir do
 * v9. Sessão é telemetria contínua (usuário ativo, "crash free rate"): não é o que esta
 * integração pede, e vale a mesma regra das outras opções — quanto menos sai do dispositivo,
 * melhor.
 */
const SESSION_INTEGRATION_NAME = 'BrowserSession';

/**
 * Memoiza o SDK já inicializado — mesmo desenho de `crashReporter.native.ts`.
 *
 * `initAttempted` é uma bandeira à parte de `cached` porque os dois desfechos precisam ser
 * lembrados: inicializou (devolve o SDK em toda chamada seguinte, sem um segundo `Sentry.init`) e
 * NÃO dá para inicializar (vira no-op silencioso, com o aviso registrado uma vez só, em vez de um
 * `logError` por erro reportado). É o mesmo padrão de `initAppCheck()` quando a site key falta.
 *
 * A inicialização é PREGUIÇOSA de propósito: no topo do módulo, `Sentry.init()` rodaria só por
 * alguém importar este arquivo — inclusive em teste, e inclusive em `__DEV__`, onde `logError` nem
 * chega a consultar o coletor.
 */
let cached: typeof Sentry | null = null;
let initAttempted = false;

function getSentryClient(): typeof Sentry | null {
  if (initAttempted) {
    return cached;
  }

  // Marcado ANTES do `logError` abaixo, e não depois: em produção `logError` entrega justamente a
  // este reporter, que chamaria `getSentryClient()` de novo. Com a bandeira já de pé, essa segunda
  // entrada devolve `null` na primeira linha em vez de recursar.
  initAttempted = true;

  const dsn = extra?.sentry?.dsn;

  if (dsn === undefined || dsn === '') {
    // Sem DSN não há para onde mandar: não inicializa e segue sem coletor, do mesmo jeito que o
    // App Check segue sem atestação quando a site key falta. Derrubar o app por causa disso — ou
    // repetir o aviso a cada erro reportado — seria pior que o ponto cego.
    logError('crashReporter.web.init', new Error('Sentry DSN ausente'));
    return null;
  }

  Sentry.init({
    dsn,
    // Nada de IP, cookie ou header capturado automaticamente pelo SDK.
    sendDefaultPii: false,
    // Sem tracing de performance: não é o que esta integração pede, e é custo e dado a mais saindo
    // do dispositivo do usuário.
    tracesSampleRate: 0,
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== SESSION_INTEGRATION_NAME),
  });

  cached = Sentry;

  return cached;
}

export const crashReporter: CrashReporter = {
  recordError(scope, error, context) {
    try {
      const sentry = getSentryClient();

      if (sentry === null) {
        return;
      }

      // `scope` como TAG: é o que agrupa e filtra os erros no painel por origem ("readings.add",
      // "appCheck.init") em vez de por mensagem, que varia demais — mesmo papel do `jsErrorName`
      // no lado nativo. O `context` vai como `extra` sem passar por sanitização de novo: quem
      // chamou já passou por `logError`, que é o dono dessa regra (CLAUDE.md §4.5).
      sentry.captureException(toError(error), { tags: { scope }, extra: context });
    } catch {
      // Engolir aqui é deliberado, e este é o único ponto do app onde isso se justifica apesar do
      // CLAUDE.md §4.5 ("todo catch faz algo"): as duas saídas normais estão fechadas — chamar
      // `logError` recursaria de volta para este mesmo reporter, e `console` é proibido fora de
      // `logger.ts`. Quem chamou `logError` já estava tratando uma falha; falhar ao REPORTAR essa
      // falha não pode derrubar o app do usuário por cima disso.
    }
  },
};
