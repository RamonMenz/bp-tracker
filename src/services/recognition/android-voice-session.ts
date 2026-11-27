import type { CandidateField, CandidateSet } from '@/domain/assisted-entry';
import { decodeFinalTranscript } from '@/domain/final-transcript';
import { interpretVoice } from '@/domain/interpret-voice-pt-br';

import type { AndroidVoicePorts } from './voice-capture-contract';
import { createVoiceSessionWithResult, type VoiceState } from './voice-session';

export type { VoicePhase, VoiceState } from './voice-session';

export type AndroidVoiceDiagnostic = { count: 1 | 2 | '3+'; agreed: boolean };
type AndroidVoiceResult = { candidates: CandidateSet | null; diagnostic: AndroidVoiceDiagnostic };

function sameField(left: CandidateField, right: CandidateField): boolean {
  if (left.status === 'candidate') return right.status === 'candidate' && left.value === right.value && left.basis === right.basis;
  if (left.status === 'uncertain') return right.status === 'uncertain' && left.reason === right.reason;
  return right.status === 'missing';
}

function sameCandidates(left: CandidateSet, right: CandidateSet): boolean {
  return left.modality === right.modality && left.capturedAtMs === right.capturedAtMs
    && sameField(left.fields.systolic, right.fields.systolic)
    && sameField(left.fields.diastolic, right.fields.diastolic)
    && sameField(left.fields.pulse, right.fields.pulse);
}

function interpretFinalHypotheses(raw: unknown): { value: AndroidVoiceResult; issue?: 'ambiguous-result' } | null {
  if (!raw || typeof raw !== 'object' || !('kind' in raw) || raw.kind !== 'transcript-hypotheses'
    || !('hypotheses' in raw) || !Array.isArray(raw.hypotheses)
    || !('final' in raw) || !('locale' in raw) || !('capturedAtMs' in raw)) return null;

  const hypotheses: readonly unknown[] = raw.hypotheses;
  if (hypotheses.length < 1 || hypotheses.length > 5 || new Set(hypotheses).size !== hypotheses.length) return null;

  const interpretations: CandidateSet[] = [];
  for (const text of hypotheses) {
    const final = decodeFinalTranscript({ kind: 'transcript', final: raw.final, locale: raw.locale,
      capturedAtMs: raw.capturedAtMs, text });
    if (!final || !final.text.trim()) return null;
    interpretations.push(interpretVoice(final));
  }
  const [reference, ...others] = interpretations;
  const agreed = others.every(candidates => sameCandidates(reference, candidates));
  const count = hypotheses.length === 1 ? 1 : hypotheses.length === 2 ? 2 : '3+';
  const diagnostic: AndroidVoiceDiagnostic = { count, agreed };
  return agreed ? { value: { candidates: reference, diagnostic } }
    : { value: { candidates: null, diagnostic }, issue: 'ambiguous-result' };
}

export function createAndroidVoiceSession(ports: AndroidVoicePorts, onState: (state: VoiceState) => void,
  onFinal: (attemptId: number, final: AndroidVoiceResult) => void) {
  return createVoiceSessionWithResult(ports, onState, interpretFinalHypotheses, onFinal);
}
