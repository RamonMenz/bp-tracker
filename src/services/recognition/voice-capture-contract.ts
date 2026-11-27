export const VOICE_MESSAGES = {
  unsupported: 'Voz Android indisponível neste ambiente. Use o registro manual.',
  'local-unavailable': 'Reconhecedor explicitamente local indisponível. Use o registro manual.',
  'language-unverified': 'Não foi possível comprovar pt-BR local instalado neste Android. Use o registro manual.',
  'model-missing': 'Pacote pt-BR local ausente. Prepare o idioma nas configurações do aparelho ou use o registro manual.',
  'permission-denied': 'Permissão de microfone negada. Tente novamente quando desejar ou use o registro manual.',
  'resource-busy': 'Outra tentativa está usando o reconhecedor. Aguarde ou use o registro manual.',
  'no-result': 'Nenhuma fala final identificável. Tente novamente ou use o registro manual.',
  'ambiguous-result': 'O reconhecedor retornou hipóteses diferentes. Diga novamente ou use o registro manual.',
  'engine-failed': 'Não foi possível reconhecer a fala localmente. Tente novamente ou use o registro manual.',
  interrupted: 'Fala interrompida. O reconhecimento não será retomado automaticamente.',
  cancelled: 'Tentativa cancelada. Nenhuma medição foi salva.',
  timeout: 'Tempo de voz excedido. Tente novamente ou use o registro manual.',
  'cleanup-failed': 'Não foi possível confirmar a liberação do reconhecedor. Use o manual; encerre o aplicativo de avaliação antes de tentar voz novamente.',
} as const;
export type VoiceCaptureCode = keyof typeof VOICE_MESSAGES;
export class VoiceCaptureError extends Error {
  constructor(readonly code: VoiceCaptureCode) { super(code); }
}
export function voiceCode(value: unknown): VoiceCaptureCode {
  return typeof value === 'string' && Object.hasOwn(VOICE_MESSAGES, value) ? value as VoiceCaptureCode : 'engine-failed';
}
export interface VoiceCapturePorts {
  availability(): Promise<unknown>;
  requestPermission(): Promise<boolean>;
  prepare(attemptId: number): Promise<unknown>;
  start(attemptId: number): Promise<unknown>;
  finish(attemptId: number): Promise<boolean>;
  close(attemptId: number): Promise<boolean>;
  listen(listener: (event: unknown) => void): () => void;
}

// Nome anterior preservado para bindings e testes Android.
export type AndroidVoicePorts = VoiceCapturePorts;
