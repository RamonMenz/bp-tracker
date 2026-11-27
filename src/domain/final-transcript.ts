import type { FinalTranscript } from './assisted-entry';

/** Fronteira do STT: nunca fazer cast de saída desconhecida/parcial para resultado final. */
export function decodeFinalTranscript(value: unknown): FinalTranscript | null {
  if (!value || typeof value !== 'object'
    || !('kind' in value) || value.kind !== 'transcript'
    || !('final' in value) || value.final !== true
    || !('locale' in value) || value.locale !== 'pt-BR'
    || !('text' in value) || typeof value.text !== 'string' || value.text.length > 2000
    || !('capturedAtMs' in value) || typeof value.capturedAtMs !== 'number'
    || !Number.isFinite(value.capturedAtMs) || value.capturedAtMs < 0
    || !Number.isFinite(new Date(value.capturedAtMs).getTime())) return null;
  // Não reter metadados, hipóteses, confiança, áudio ou objeto do motor.
  return { kind: 'transcript', final: true, locale: 'pt-BR', text: value.text, capturedAtMs: value.capturedAtMs };
}
