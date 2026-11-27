import type { Crashlytics } from '@react-native-firebase/crashlytics';

import type { CrashReporter } from '@/lib/logger';
import { toError } from '@/lib/toError';

/**
 * O módulo é carregado por `require` TARDIO, dentro do try/catch de `recordError`, e não por
 * `import` no topo. Não é estilo: `@react-native-firebase/crashlytics` lança JÁ NA IMPORTAÇÃO
 * quando o módulo nativo não está registrado ("Native module NativeRNFBTurboApp is not
 * registered") — verificado neste projeto, não é hipótese. Como este adapter é alcançado a partir
 * de `services/firebase/index.ts`, que é o caminho único por onde o app inteiro chega em
 * `auth`/`firestore`, um `import` estático derrubaria o BOOT do app em qualquer Dev Client
 * compilado antes desta dependência existir — inclusive em desenvolvimento, onde o Crashlytics
 * nem é usado. Com o require aqui dentro, esse cenário degrada para "sem coletor de erro" em vez
 * de "app não abre".
 *
 * `import type` acima é apagado na compilação (não vira require), então não reintroduz o problema.
 */
type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics');

let cached: { api: CrashlyticsModule; instance: Crashlytics } | null = null;

function getCrashlyticsApi(): { api: CrashlyticsModule; instance: Crashlytics } {
  if (cached === null) {
    // O require tardio é o PONTO desta função (ver o bloco de doc acima): um `import` estático
    // quebra o boot do app quando o módulo nativo não está registrado. Trocar por import aqui
    // anularia a correção — por isso a regra é desligada nesta linha, e só nela.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('@react-native-firebase/crashlytics') as CrashlyticsModule;
    cached = { api, instance: api.getCrashlytics() };
  }

  return cached;
}

function serializeContext(context: Record<string, unknown>): string | null {
  if (Object.keys(context).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(context);
  } catch {
    // Estrutura cíclica ou com getter que lança. O relatório do erro em si é mais importante que
    // o contexto — segue sem ele em vez de perder o report inteiro.
    return '[contexto não serializável]';
  }
}

/** Mesmo texto fixo do lado web (`crashReporter.web.ts`), para os dois painéis lerem igual. */
const REDACTED_MESSAGE = '[mensagem removida por privacidade]';

/**
 * Cópia do erro sem a mensagem: o Crashlytics envia `error.message` como está, e a mensagem nunca
 * passou pelo sanitizador de `logError` (pode vir de SDK de terceiro com valor de campo, e-mail ou
 * observação — constitution §2; CLAUDE.md §4.4). Ficam o protótipo e o `name` (o tipo) e a stack
 * com o cabeçalho trocado, que é o que agrupa o relatório. A `cause` e as propriedades próprias
 * extras (ex.: `customData` de um `FirebaseError`) não são copiadas. Ver `docs/sentry-privacidade.md`.
 */
function redactError(original: Error): Error {
  const redacted = new Error(REDACTED_MESSAGE);
  Object.setPrototypeOf(redacted, Object.getPrototypeOf(original) as object | null);
  redacted.name = original.name;

  const { message, stack } = original;

  if (typeof stack === 'string') {
    const header = message === '' ? original.name : `${original.name}: ${message}`;
    redacted.stack = stack.startsWith(header)
      ? `${original.name}: ${REDACTED_MESSAGE}${stack.slice(header.length)}`
      : // Cabeçalho diferente (motor sem esse formato, ou `name` trocado depois de a stack ser
        // capturada, como em subclasse): troca a mensagem onde ela aparecer. Pode
        // estragar um frame que contenha o mesmo texto, mas a mensagem não sai do dispositivo.
        message === ''
        ? stack
        : stack.split(message).join(REDACTED_MESSAGE);
  }

  return redacted;
}

export const crashReporter: CrashReporter = {
  recordError(scope, error, context) {
    try {
      const { api, instance } = getCrashlyticsApi();
      const serialized = serializeContext(context);

      // `log` vira breadcrumb anexado ao próximo relatório — é o canal do Crashlytics para
      // contexto estruturado sem virar atributo indexado. O contexto aqui JÁ vem sanitizado por
      // `logError`, que remove chaves proibidas antes de chamar o reporter.
      if (serialized !== null) {
        api.log(instance, `[${scope}] ${serialized}`);
      }

      // `scope` como `jsErrorName`: é o que agrupa os não-fatais no console do Crashlytics por
      // origem ("readings.add", "appCheck.init") em vez de por mensagem, que varia demais.
      api.recordError(instance, redactError(toError(error)), scope);
    } catch {
      // Engolir aqui é deliberado, e este é o único ponto do app onde isso se justifica apesar do
      // CLAUDE.md §4.5 ("todo catch faz algo"): as duas saídas normais estão fechadas — chamar
      // `logError` recursaria de volta para este mesmo reporter, e `console` é proibido fora de
      // `logger.ts`. Quem chamou `logError` já estava tratando uma falha; falhar ao REPORTAR essa
      // falha não pode derrubar o app do usuário por cima disso.
    }
  },
};
