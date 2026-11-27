// Contratos da TASK-03, docs/arquitetura-ia.md (feature/pocs-fotografia-voz,
// 7fbe137), materializados sem portas de I/O ou persistência.
export type EntryModality = 'photo' | 'voice';
export type ClinicalField = 'systolic' | 'diastolic' | 'pulse';

export interface FinalTranscript {
  readonly kind: 'transcript';
  readonly locale: 'pt-BR';
  readonly final: true;
  readonly capturedAtMs: number;
  readonly text: string;
}

export type CandidateField =
  | { readonly status: 'candidate'; readonly value: number;
      readonly basis: 'label' | 'layout' | 'explicit-phrase' | 'colloquial-pair' }
  | { readonly status: 'missing' }
  | { readonly status: 'uncertain';
      readonly reason: 'ambiguous-label' | 'mixed-scale' | 'multiple-pairs'
        | 'unidentified-number' | 'unreadable' };

export interface CandidateSet {
  readonly modality: EntryModality;
  readonly capturedAtMs: number;
  readonly fields: Readonly<Record<ClinicalField, CandidateField>>;
}

/** Frame orientado e texto transitório da TASK-03; não é payload de persistência. */
export interface OcrObservation {
  readonly kind: 'ocr';
  readonly capturedAtMs: number;
  readonly coordinateSpace: 'upright-frame';
  readonly tokens: readonly {
    readonly text: string;
    readonly confidence: number | null;
    readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  }[];
}
