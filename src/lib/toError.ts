/**
 * Embrulha um valor lançado num `Error`, para os adapters de coletor de erro.
 *
 * Coletor de erro agrupa relatório por `Error` (usa `.stack`) — tanto o Crashlytics no nativo
 * quanto o Sentry na web —, então um valor não-Error precisa ser embrulhado antes de ser
 * reportado. O CONTEÚDO desse valor não é serializado de propósito: diferente do `context`, ele
 * nunca passou pelo sanitizador de `logError`, e um objeto lançado pode carregar PII ou dado de
 * saúde (CLAUDE.md §4.4). Um `Error` de verdade passa direto — é a ressalva já documentada em
 * `logger.ts`: a mensagem do erro não é sanitizada, só o contexto.
 *
 * Mora aqui, e não em cada adapter de plataforma, porque é lógica PURA compartilhada pelos dois
 * (CLAUDE.md §3.2): duplicá-la deixaria a regra de PII com duas cópias para manter em sincronia.
 */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(`valor não-Error reportado (${typeof value})`);
}
