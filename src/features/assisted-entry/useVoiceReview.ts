import { useRef, useState } from 'react';

import { decodeFinalTranscript } from '@/domain/final-transcript';
import { interpretVoice } from '@/domain/interpret-voice-pt-br';
import type { createAssistedConfirmation } from '@/features/readings/confirmed-assisted-reading';

import { useCandidateReview } from './useCandidateReview';

type Confirmation = ReturnType<typeof createAssistedConfirmation>;
export type VoiceReviewOptions =
  | { mode: 'simulation' }
  | { mode: 'preview' }
  | { mode: 'recognition'; confirmation: Confirmation };

/** Recebe contrato final; não abre microfone ou importa writer. Preview não pode persistir. */
export function useVoiceReview(options: VoiceReviewOptions = { mode: 'simulation' }) {
  // Mudar de modo/porta exige desmontar a revisão anterior.
  const [settings] = useState(() => options);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const clinical = useRef<{ reviewAttempt: number; persistAttempt: number | null } | null>(null);
  const [inputIssue, setInputIssue] = useState<string | null>(null);
  const core = useCandidateReview('voice', settings.mode === 'simulation' ? { simulation: true }
    : settings.mode === 'preview' ? { simulation: false, previewOnly: true } : {
    simulation: false,
    onInvalidate: () => { clinical.current = null; settings.confirmation.cancel(); },
    onConfirmDraft: async (draft, reviewAttempt) => {
      const attempt = clinical.current;
      if (!attempt || attempt.reviewAttempt !== reviewAttempt || attempt.persistAttempt === null) return false;
      const ticket = settings.confirmation.revise(attempt.persistAttempt, draft);
      if (!ticket) return false;
      const result = await settings.confirmation.confirmAndSave(ticket);
      return result.kind === 'acknowledged';
    },
  });
  function newAttempt() {
    setInputIssue(null);
    const id = core.recapture();
    if (settings.mode === 'recognition') {
      const persistAttempt = settings.confirmation.begin('voice', 'recognition');
      clinical.current = { reviewAttempt: id, persistAttempt };
      setPersistenceReady(persistAttempt !== null);
    }
    return id;
  }
  function cancel() { setInputIssue(null); core.cancel(); }
  function receiveFinal(attempt: number, value: unknown, provenance: 'recognition' | 'synthetic'): boolean {
    if (!core.isWaitingFor(attempt)) return false; // Tardio/duplicado não chega ao parser.
    if ((settings.mode === 'simulation' && provenance !== 'synthetic')
      || (settings.mode !== 'simulation' && provenance !== 'recognition')) {
      setInputIssue('Resultado incompatível com este modo. Inicie uma nova tentativa.');
      return false;
    }
    const final = decodeFinalTranscript(value);
    if (!final) {
      setInputIssue('Somente uma transcrição final válida em pt-BR pode ser revisada. Tente novamente.');
      return false;
    }
    // A transcrição não entra em estado React, nota ou payload de confirmação.
    const candidates = interpretVoice(final);
    setInputIssue(null);
    return core.receive(attempt, candidates);
  }
  const { receive: _receive, isWaitingFor: _isWaitingFor, ...view } = core;
  return { ...view, newAttempt, recapture: newAttempt, cancel, receiveFinal,
    inputIssue: core.state.phase === 'cancelled' ? null : inputIssue,
    canConfirm: core.canConfirm && (settings.mode !== 'recognition' || persistenceReady) };
}
export type VoiceReviewController = ReturnType<typeof useVoiceReview>;
