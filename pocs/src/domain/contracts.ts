export type Mode = 'photo' | 'voice';
export type FieldName = 'systolic' | 'diastolic' | 'pulse';
export type Candidate =
  | { readonly status: 'candidate'; readonly value: number; readonly basis: 'label' }
  | { readonly status: 'missing' }
  | { readonly status: 'uncertain'; readonly reason: 'ambiguous-label' | 'unreadable' };
export type Candidates = Record<FieldName, Candidate>;
export interface CandidateSet {
  readonly modality: Mode;
  readonly capturedAtMs: number;
  readonly fields: Readonly<Candidates>;
}
export interface OcrObservation {
  readonly kind: 'ocr';
  readonly capturedAtMs: number;
  readonly coordinateSpace: 'upright-frame';
  readonly tokens: readonly { readonly text: string; readonly confidence: number | null;
    readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } }[];
}
export interface FinalTranscript {
  readonly kind: 'transcript';
  readonly locale: 'pt-BR';
  readonly final: true;
  readonly capturedAtMs: number;
  readonly text: string;
}
export interface PocResult {
  candidates?: CandidateSet;
  finalTranscript?: FinalTranscript;
  initializationMs?: number;
  recognitionMs: number;
}
export type SafeCode = 'unsupported' | 'permission-denied' | 'device-unavailable'
  | 'local-unavailable' | 'language-unverified' | 'model-missing'
  | 'timeout' | 'cancelled' | 'engine-failed' | 'camera-failed' | 'no-result';
export class PocError extends Error {
  constructor(readonly code: SafeCode) { super(code); this.name = 'PocError'; }
}
// Nunca inclui a exceção recebida como message/cause/stack do erro de UI.
export function safeCode(error: unknown): SafeCode {
  return error instanceof PocError ? error.code : 'engine-failed';
}
export const messages: Record<SafeCode, string> = {
  unsupported: 'Este ambiente não oferece a capacidade necessária. Volte ao manual.',
  'permission-denied': 'Permissão negada. Você pode voltar ao manual ou ajustar a permissão do aparelho.',
  'device-unavailable': 'Câmera ou microfone indisponível neste ambiente.',
  'local-unavailable': 'Reconhecimento local em pt-BR indisponível. Nenhum serviço remoto será utilizado.',
  'language-unverified': 'Não foi possível verificar pt-BR instalado no reconhecedor local. Use o manual.',
  'model-missing': 'Modelo local não instalado. Prepare o modelo antes de tentar novamente.',
  timeout: 'O limite experimental foi atingido. A tentativa foi encerrada.',
  cancelled: 'Tentativa cancelada; resultado descartado.',
  'engine-failed': 'Não foi possível reconhecer. Tente novamente ou volte ao manual.',
  'camera-failed': 'Não foi possível abrir ou processar a câmera.',
  'no-result': 'Nenhum resultado final reconhecido. Tente novamente ou use o manual.',
};
