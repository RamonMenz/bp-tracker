import type { CrashReporter } from '@/lib/logger';

/**
 * GAP CONHECIDO E DECLARADO: a versão web do app NÃO tem coletor de erro em produção.
 *
 * Por que não há um aqui:
 *   - `@react-native-firebase/crashlytics` (o coletor escolhido para o nativo, ver
 *     `crashReporter.native.ts`) é módulo NATIVO. Não existe build web dele, e o Firebase JS SDK
 *     que este app usa não expõe Crashlytics — o produto simplesmente não tem SDK web.
 *   - As saídas reais seriam Sentry (`@sentry/react`) ou outro coletor de terceiros. Isso é
 *     dependência nova, com peso de bundle e — mais importante para este app — um processador de
 *     dados a mais recebendo stack traces de um app de saúde (LGPD, CLAUDE.md §4.4). É decisão
 *     própria, com a mesma justificativa por escrito que o §4.1 exigiu para o Crashlytics; não é
 *     algo para embutir de passagem nesta integração.
 *
 * Este no-op é EXPLÍCITO em vez de deixar `crashReporter` como `null` no logger: assim o gap tem
 * um lugar no código, com nome e motivo, em vez de ficar indistinguível de "ninguém configurou
 * ainda" — que era exatamente o estado que esta tarefa veio corrigir. Ele não finge proteção
 * nenhuma: `logError` continua descartando erro de produção na web, e isso está registrado em
 * RELEASE_CHECKLIST.md.
 */
export const IS_WEB_CRASH_REPORTING_GAP = true;

export const crashReporter: CrashReporter = {
  recordError() {
    // Intencionalmente vazio — ver o bloco acima. Não é "esqueceram de implementar": é a ausência
    // de coletor web, documentada e rastreável por `IS_WEB_CRASH_REPORTING_GAP`.
  },
};
