import type { EntryModality } from '@/domain/assisted-entry';
import type { ReadingInput } from '@/types/models';

import { parseReadingInput } from './reading.schema';

export interface AssistedWriteContext {
  uid: string | null;
  /** Identidade da sessão/consentimento, renovada inclusive em novo login do mesmo UID. */
  epoch: object;
  hasConsent: boolean;
  persistenceEnabled: boolean;
}
export interface AssistedReviewValues {
  systolic: string;
  diastolic: string;
  pulse: string;
  note: string;
  measuredAt: Date;
}
export interface ReviewTicket {
  readonly attemptId: number;
  readonly revision: number;
}
export type AssistedWriteResult =
  | { kind: 'acknowledged'; readingId: string }
  | { kind: 'blocked' | 'invalid' | 'stale' | 'rejected' };
type Writer = (uid: string, input: ReadingInput) => Promise<string>;
interface Ports {
  currentContext: () => AssistedWriteContext;
  loadWriter: () => Promise<Writer>;
}

/** Porta da TASK-03. Só confirmAndSave pode carregar/chamar o writer.
 * Não usa resultados de reconhecimento, React effects ou valores de confiança.
 * Ainda não ligada às telas/PoCs. Tickets não são prova criptográfica de gesto.
 */
export function createAssistedConfirmation(ports: Ports) {
  let attemptId = 0;
  let attempt: { source: EntryModality; context: AssistedWriteContext; revision: number;
    ticket: ReviewTicket | null; input: ReadingInput | null; phase: 'review' | 'pending' | 'done' } | null = null;

  function validContext(expected: AssistedWriteContext): boolean {
    const current = ports.currentContext();
    return current.uid !== null && current.uid === expected.uid && current.epoch === expected.epoch
      && current.hasConsent && current.persistenceEnabled;
  }
  function cancel() { attempt = null; attemptId++; }
  function begin(source: EntryModality, provenance: 'recognition' | 'synthetic'): number | null {
    cancel();
    const context = { ...ports.currentContext() };
    if (provenance !== 'recognition' || !validContext(context) || (source !== 'photo' && source !== 'voice')) return null;
    attempt = { source, context, revision: 0, ticket: null, input: null, phase: 'review' };
    return attemptId;
  }
  function revise(id: number, draft: AssistedReviewValues): ReviewTicket | null {
    const current = attempt;
    if (!current || current.phase !== 'review' || id !== attemptId || !validContext(current.context)) return null;
    // Qualquer edição invalida a autorização anterior, mesmo quando inválida.
    current.revision++;
    current.ticket = null;
    current.input = null;
    try {
      const numeric = (value: string) => value.trim() === '' ? undefined : Number(value);
      current.input = parseReadingInput({
        systolic: numeric(draft.systolic), diastolic: numeric(draft.diastolic),
        pulse: draft.pulse.trim() === '' ? null : Number(draft.pulse),
        note: draft.note || null, measuredAt: new Date(draft.measuredAt),
        source: current.source, sessionReadings: null,
      });
      // Seleção explícita acima: nenhum spread de candidato/SDK/transcrição.
      current.ticket = Object.freeze({ attemptId, revision: current.revision });
      return current.ticket;
    } catch { return null; }
  }
  async function confirmAndSave(ticket: ReviewTicket): Promise<AssistedWriteResult> {
    const current = attempt;
    if (!current || current.phase !== 'review' || current.ticket !== ticket || !current.input) return { kind: 'blocked' };
    if (!validContext(current.context)) { cancel(); return { kind: 'stale' }; }
    // Trava antes do primeiro await: não repetir addDoc enquanto sem ACK/offline.
    current.phase = 'pending';
    try {
      const writer = await ports.loadWriter();
      if (attempt !== current || !validContext(current.context)) return { kind: 'stale' };
      // Revalidar data e payload após a carga. Sem await entre identidade e chamada.
      const input = parseReadingInput(current.input);
      if (!validContext(current.context)) return { kind: 'stale' };
      const readingId = await writer(current.context.uid!, input);
      if (attempt !== current || !validContext(current.context)) return { kind: 'stale' };
      current.phase = 'done';
      current.input = null;
      current.ticket = null;
      return { kind: 'acknowledged', readingId };
    } catch {
      if (attempt !== current || !validContext(current.context)) return { kind: 'stale' };
      // Não reaproveitar ticket nem retry automático; nova revisão/confirmação necessária.
      current.phase = 'review';
      current.input = null;
      current.ticket = null;
      return { kind: 'rejected' };
    }
  }
  return { begin, revise, cancel, confirmAndSave };
}
