import type { FinalTranscript } from '@/domain/assisted-entry';
import { decodeFinalTranscript } from '@/domain/final-transcript';

import { VoiceCaptureError, voiceCode, type VoiceCapturePorts, type VoiceCaptureCode } from './voice-capture-contract';

export type VoicePhase = 'idle' | 'checking' | 'permission' | 'preparing' | 'opening' | 'listening' | 'recognizing' | 'closing' | 'reviewing' | 'cancelled' | 'failed' | 'blocked';
export interface VoiceState { phase: VoicePhase; attemptId: number; issue: VoiceCaptureCode | null }
let sequence = 0;
let owner: object | null = null;
const BUSY = new Set<VoicePhase>(['checking','permission','preparing','opening','listening','recognizing','closing','blocked']);

// Deadline/cancelamento da PoC TASK-05, com erros exclusivos de voz (sem erro bruto).
class VoiceAttempt {
  readonly id = ++sequence;
  readonly controller = new AbortController();
  get aborted() { return this.controller.signal.aborted; }
  cancel() { this.controller.abort(); }
  check() { if (this.aborted) throw new VoiceCaptureError('cancelled'); }
  async wait<T>(work: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const signal = this.controller.signal;
      const finish = (callback: () => void) => {
        if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort); callback();
      };
      const abort = () => finish(() => reject(new VoiceCaptureError('cancelled')));
      const timer = setTimeout(() => { finish(() => reject(new VoiceCaptureError('timeout'))); this.cancel(); }, ms);
      signal.addEventListener('abort', abort, { once: true });
      work.then(value => finish(() => this.aborted ? reject(new VoiceCaptureError('cancelled')) : resolve(value)),
        error => finish(() => reject(error instanceof VoiceCaptureError ? error : new VoiceCaptureError('engine-failed'))));
      if (this.aborted) abort();
    });
  }
}
function requireReady(value: unknown) {
  if (!value || typeof value !== 'object' || !('code' in value) || value.code !== 'ready') {
    throw new VoiceCaptureError(voiceCode(value && typeof value === 'object' && 'code' in value ? value.code : undefined));
  }
}
async function within(work: Promise<boolean>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([work, new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), ms); })]); }
  finally { clearTimeout(timer); }
}

/** Só FinalTranscript após fechamento. Sem transcrição/hipóteses em estado React ou escrita. */
export function createVoiceSession(ports: VoiceCapturePorts, onState: (state: VoiceState) => void,
  onFinal: (attemptId: number, final: FinalTranscript) => void) {
  let state: VoiceState = { phase: 'idle', attemptId: 0, issue: null };
  let current: VoiceAttempt | null = null;
  let completion = Promise.resolve();
  let beginClose: (() => Promise<boolean>) | null = null;
  let disposed = false;
  let finishIssue: VoiceCaptureCode | null = null;
  function emit(phase: VoicePhase, issue: VoiceCaptureCode | null = null) {
    state = { ...state, phase, issue }; if (!disposed) onState(state);
  }
  async function run(attempt: VoiceAttempt, ticket: object) {
    let final: FinalTranscript | null = null;
    let issue: VoiceCaptureCode | null = null;
    let permission: Promise<boolean> | null = null;
    let unsubscribe: (() => void) | null = null;
    let closeWork: Promise<boolean> | null = null;
    const close = () => closeWork ??= Promise.resolve().then(() => ports.close(attempt.id)).then(value => value === true, () => false);
    beginClose = close;
    try {
      unsubscribe = ports.listen(event => {
        if (attempt.aborted || disposed || !event || typeof event !== 'object' || !('attemptId' in event) || event.attemptId !== attempt.id
          || !('status' in event)) return;
        if (event.status === 'listening' && state.phase === 'opening') emit('listening');
        if (event.status === 'recognizing' && ['opening','listening'].includes(state.phase)) emit('recognizing');
      });
      emit('checking'); requireReady(await attempt.wait(ports.availability(), 12000)); attempt.check();
      emit('permission'); permission = ports.requestPermission();
      if (!await attempt.wait(permission, 30000)) throw new VoiceCaptureError('permission-denied');
      attempt.check(); emit('preparing');
      requireReady(await attempt.wait(ports.prepare(attempt.id), 12000));
      attempt.check(); emit('opening');
      const raw = await attempt.wait(ports.start(attempt.id), 35000); attempt.check();
      if (raw && typeof raw === 'object' && 'code' in raw) throw new VoiceCaptureError(voiceCode(raw.code));
      final = decodeFinalTranscript(raw);
      if (!final) throw new VoiceCaptureError('engine-failed');
    } catch (error) { issue = error instanceof VoiceCaptureError ? error.code : 'engine-failed'; }
    finally {
      emit('closing');
      let released = await within(close(), 10000);
      try { unsubscribe?.(); } catch { released = false; }
      // Diálogo de permissão não é abortável: não abrir outra solicitação até drenar.
      const drain = permission?.then(() => true, () => true) ?? Promise.resolve(true);
      const drained = await within(drain, 10000);
      const release = () => { if (owner === ticket) owner = null; };
      if (released && drained) release();
      else if (released) void drain.then(release);
      if (!released || !drained) emit('blocked', 'cleanup-failed');
      else if (finishIssue) emit('failed', finishIssue);
      else if (attempt.aborted || disposed) emit('cancelled', issue === 'timeout' ? 'timeout' : 'cancelled');
      else if (issue) emit(issue === 'cancelled' ? 'cancelled' : 'failed', issue);
      else if (final) {
        emit('reviewing');
        if (!disposed) { try { onFinal(attempt.id, final); } catch { emit('failed', 'engine-failed'); } }
      }
      attempt.cancel();
      if (current === attempt) { current = null; beginClose = null; }
    }
  }
  function start(): boolean {
    if (disposed || BUSY.has(state.phase)) return false;
    if (owner) { emit('failed', 'resource-busy'); return false; }
    const ticket = {}; owner = ticket; finishIssue = null;
    current = new VoiceAttempt(); state = { ...state, attemptId: current.id };
    completion = run(current, ticket); return true;
  }
  function finish(): boolean {
    if (disposed || !current || state.phase !== 'listening') return false;
    const attempt = current; emit('recognizing');
    void Promise.resolve().then(() => ports.finish(attempt.id)).then(ok => {
      if (ok !== true && current === attempt && state.phase === 'recognizing') { finishIssue = 'engine-failed'; attempt.cancel(); void beginClose?.(); }
    }, () => { if (current === attempt && state.phase === 'recognizing') { finishIssue = 'engine-failed'; attempt.cancel(); void beginClose?.(); } });
    return true;
  }
  function cancel() {
    current?.cancel(); void beginClose?.();
    if (!BUSY.has(state.phase)) emit('cancelled', 'cancelled');
    return completion;
  }
  function dispose() { disposed = true; void cancel(); }
  return { start, finish, cancel, dispose, settled: () => completion,
    isReleased: () => current === null && state.phase !== 'blocked' };
}
