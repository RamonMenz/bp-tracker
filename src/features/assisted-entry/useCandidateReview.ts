import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { CandidateSet, EntryModality } from '@/domain/assisted-entry';
import { readingInputSchema } from '@/features/readings/reading.schema';

export interface CandidateReviewDraft {
  systolic: string;
  diastolic: string;
  pulse: string;
  note: string;
  measuredAt: Date;
}
export interface CandidateReviewValues {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  note: string | null;
  measuredAt: Date;
}
type Phase = 'idle' | 'waiting' | 'reviewing' | 'confirming' | 'confirmed' | 'cancelled';
interface ReviewState {
  phase: Phase;
  attempt: number;
  candidates: CandidateSet | null;
  draft: CandidateReviewDraft | null;
  confirmed: CandidateReviewValues | null;
}
type Errors = Partial<Record<keyof CandidateReviewDraft, string>>;

function validate(draft: CandidateReviewDraft | null): { errors: Errors; values: CandidateReviewValues | null } {
  if (!draft) return { errors: {}, values: null };
  // Reutiliza o schema legado apenas como validador local. O discriminador manual
  // não sai daqui: a projeção de revisão não é um ReadingInput e não tem writer.
  const parsed = readingInputSchema.safeParse({
    systolic: draft.systolic.trim() === '' ? undefined : Number(draft.systolic),
    diastolic: draft.diastolic.trim() === '' ? undefined : Number(draft.diastolic),
    pulse: draft.pulse.trim() === '' ? null : Number(draft.pulse),
    note: draft.note || null,
    measuredAt: draft.measuredAt,
    source: 'manual',
    sessionReadings: null,
  });
  if (!parsed.success) {
    const errors: Errors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'systolic' || key === 'diastolic' || key === 'pulse' || key === 'note' || key === 'measuredAt') {
        errors[key] ??= issue.message;
      }
    }
    return { errors, values: null };
  }
  const { systolic, diastolic, pulse, note, measuredAt } = parsed.data;
  return { errors: {}, values: { systolic, diastolic, pulse, note, measuredAt: new Date(measuredAt) } };
}

/** Ciclo de revisão compartilhado. Simulação não carrega nem chama porta de escrita. */
export type CandidateReviewOptions =
  | { simulation: true }
  | { simulation: false; previewOnly: true }
  | { simulation: false; onInvalidate: () => void;
      onConfirmDraft: (draft: CandidateReviewDraft, attempt: number) => Promise<boolean> };

export function useCandidateReview(modality: EntryModality, options: CandidateReviewOptions = { simulation: true }) {
  const initial: ReviewState = { phase: 'idle', attempt: 0, candidates: null, draft: null, confirmed: null };
  const [state, setState] = useState(initial);
  const current = useRef(state);
  const mounted = useRef(true);
  // Um modo por montagem: fixtures não podem ser promovidas a fluxo clínico.
  const [config] = useState(() => options);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  function invalidate() {
    if ('onInvalidate' in config) config.onInvalidate();
    setConfirmationError(null);
  }

  function update(next: ReviewState) {
    if (!mounted.current) return;
    current.current = next; // Trava síncrona, antes do próximo render/toque.
    setState(next);
  }
  function cancel() {
    invalidate();
    update({ ...initial, phase: 'cancelled', attempt: current.current.attempt + 1 });
  }
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        if ('onInvalidate' in config) config.onInvalidate();
        setConfirmationError(null);
        const cleared: ReviewState = { phase: 'cancelled', attempt: current.current.attempt + 1,
          candidates: null, draft: null, confirmed: null };
        current.current = cleared;
        setState(cleared);
      }
    });
    return () => {
      mounted.current = false;
      if ('onInvalidate' in config) config.onInvalidate();
      current.current = { phase: 'cancelled', attempt: current.current.attempt + 1,
        candidates: null, draft: null, confirmed: null };
      listener.remove();
    };
  }, [config]);

  function recapture(): number {
    invalidate();
    const attempt = current.current.attempt + 1;
    update({ ...initial, phase: 'waiting', attempt });
    return attempt;
  }
  function isWaitingFor(attempt: number): boolean {
    return mounted.current && current.current.phase === 'waiting' && current.current.attempt === attempt;
  }
  function receive(attempt: number, candidates: CandidateSet): boolean {
    if (!isWaitingFor(attempt)
      || candidates.modality !== modality || !Number.isFinite(candidates.capturedAtMs)
      || !Number.isFinite(new Date(candidates.capturedAtMs).getTime())) return false;
    const field = (key: 'systolic' | 'diastolic' | 'pulse') => {
      const item = candidates.fields[key];
      return item.status === 'candidate' ? String(item.value) : '';
    };
    update({ phase: 'reviewing', attempt,
      candidates: { ...candidates, fields: {
        systolic: { ...candidates.fields.systolic }, diastolic: { ...candidates.fields.diastolic },
        pulse: { ...candidates.fields.pulse },
      } },
      draft: { systolic: field('systolic'), diastolic: field('diastolic'), pulse: field('pulse'),
        note: '', measuredAt: new Date(candidates.capturedAtMs) }, confirmed: null });
    return true;
  }
  function edit<K extends keyof CandidateReviewDraft>(key: K, value: CandidateReviewDraft[K], expectedAttempt?: number) {
    const snapshot = current.current;
    if (snapshot.phase !== 'reviewing' || !snapshot.draft
      || (expectedAttempt !== undefined && snapshot.attempt !== expectedAttempt)) return;
    update({ ...snapshot, draft: { ...snapshot.draft, [key]: value instanceof Date ? new Date(value) : value } });
  }
  async function confirm(): Promise<boolean> {
    const snapshot = current.current;
    if (!mounted.current || snapshot.phase !== 'reviewing') return false;
    const { values } = validate(snapshot.draft); // Revalida inclusive data no clique.
    if (!values) return false;
    const pending: ReviewState = { ...snapshot, phase: 'confirming' };
    setConfirmationError(null);
    update(pending);
    let success = false;
    try {
      const choice = config;
      if (!('onConfirmDraft' in choice)) {
        await Promise.resolve(); // Somente memória, sem callback de escrita.
        success = true;
      } else {
        success = await choice.onConfirmDraft({ ...snapshot.draft!, measuredAt: new Date(snapshot.draft!.measuredAt) }, snapshot.attempt);
      }
    } catch { success = false; } // Nunca expor exceção potencialmente clínica.
    if (!mounted.current || current.current !== pending) return false;
    if (!success) {
      update({ ...snapshot, phase: 'reviewing' });
      setConfirmationError('Não foi possível confirmar. Confira a sessão e tente novamente explicitamente.');
      return false;
    }
    update({ ...initial, phase: 'confirmed', attempt: pending.attempt, confirmed: values });
    return true;
  }
  const validation = validate(state.draft);
  return { state, errors: validation.errors, modality, isSimulation: config.simulation,
    isPreviewOnly: 'previewOnly' in config, confirmationError,
    canConfirm: state.phase === 'reviewing' && validation.values !== null,
    receive, isWaitingFor, recapture, cancel, edit, confirm };
}
export type CandidateReviewController = ReturnType<typeof useCandidateReview>;
export type CandidateReviewView = Omit<CandidateReviewController, 'receive' | 'isWaitingFor'> & { recaptureDisabled?: boolean; previewNotice?: string };
