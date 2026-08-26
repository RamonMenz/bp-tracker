/**
 * Motivo pelo qual o registro de push falhou por uma limitação do AMBIENTE/aparelho, não por um
 * erro transiente (rede, SDK). useReminderSettings usa isso para decidir entre um popup
 * explicativo (com alternativa tipo alarme do celular) e o InlineFeedback vermelho genérico —
 * tentar de novo não resolve nenhum dos dois casos abaixo, então não faz sentido tratá-los como
 * o mesmo "erro" de um `setDoc` que falhou por instabilidade de rede.
 */
export type PushUnavailableReason = 'browser-unsupported' | 'not-configured';

/**
 * Erro "esperado": o navegador não suporta push, ou a VAPID key deste ambiente não está
 * configurada (`EXPO_PUBLIC_FIREBASE_VAPID_KEY` ausente — ver app.config.ts). Extraído para um
 * arquivo à parte (não dentro de registerPushToken.web.ts) porque useReminderSettings.ts, que
 * consome `reason`, é compartilhado entre native e web — importar isto daqui evita puxar código
 * `.web.ts` (APIs de navegador) para o bundle nativo só para checar `instanceof`.
 */
export class PushUnavailableError extends Error {
  constructor(
    public readonly reason: PushUnavailableReason,
    message: string,
  ) {
    super(message);
    this.name = 'PushUnavailableError';
  }
}
