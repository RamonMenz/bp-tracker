/**
 * Único ponto autorizado a usar console — em qualquer outro arquivo é proibido (CLAUDE.md §4.5).
 * Contexto nunca inclui valor de medição, e-mail, token FCM ou qualquer PII/dado de saúde;
 * `uid` é aceitável.
 */
export function logError(scope: string, error: unknown, context?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(`[${scope}]`, error, context);
  }
  // TODO: encaminhar para o Crashlytics quando o projeto nativo (EAS) existir.
}
