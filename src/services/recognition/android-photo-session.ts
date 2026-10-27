import type { CandidateSet } from '@/domain/assisted-entry';
import { interpretPhoto, parseOcr } from '@/domain/interpret-photo';

import { Attempt } from './capture-attempt';
import { PhotoCaptureError, type AndroidPhotoPorts, type PhotoCaptureCode } from './photo-capture-contract';

export type PhotoPhase = 'idle' | 'permission' | 'opening' | 'ready' | 'recognizing' | 'closing' | 'reviewing' | 'cancelled' | 'failed' | 'blocked';
export interface PhotoCaptureState { phase: PhotoPhase; attemptId: number; issue: PhotoCaptureCode | null }
const BUSY = new Set<PhotoPhase>(['permission', 'opening', 'ready', 'recognizing', 'closing', 'blocked']);

/** Coordinator da PoC adaptado: nenhuma mídia/observação bruta em estado React. */
export function createAndroidPhotoSession(ports: AndroidPhotoPorts, onState: (state: PhotoCaptureState) => void,
  onCandidates: (attemptId: number, candidates: CandidateSet) => void) {
  let state: PhotoCaptureState = { phase: 'idle', attemptId: 0, issue: null };
  let current: Attempt | null = null;
  let completion: Promise<void> = Promise.resolve();
  let ready: ((code: string) => void) | null = null;
  let shutter: (() => void) | null = null;
  let disposed = false;
  function emit(phase: PhotoPhase, issue: PhotoCaptureCode | null = null) {
    state = { phase, issue, attemptId: current?.id ?? state.attemptId };
    if (!disposed) onState(state);
  }
  async function close(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const released = await Promise.race([ports.close(), new Promise<boolean>(resolve => {
        timer = setTimeout(() => resolve(false), 10000);
      })]);
      return released === true;
    } catch { return false; }
    finally { clearTimeout(timer); }
  }
  async function run(attempt: Attempt) {
    let candidates: CandidateSet | null = null;
    let issue: PhotoCaptureCode | null = null;
    try {
      emit('permission');
      if (!await attempt.wait(ports.requestPermission(), 30000)) throw new PhotoCaptureError('permission-denied');
      attempt.check();
      const opened = new Promise<void>((resolve, reject) => {
        ready = code => code === 'ready' ? resolve() : reject(new PhotoCaptureError(
          code === 'resource-busy' ? 'resource-busy' : code === 'permission-denied' ? 'permission-denied' : 'camera-failed'));
      });
      emit('opening');
      ports.open(attempt.id);
      await attempt.wait(opened, 20000);
      ready = null;
      const captured = new Promise<void>(resolve => { shutter = resolve; });
      emit('ready');
      await attempt.wait(captured, 60000);
      attempt.check();
      const raw = await attempt.wait(ports.recognize(), 30000);
      attempt.check();
      if (raw && typeof raw === 'object' && 'code' in raw) {
        const code = raw.code;
        throw new PhotoCaptureError(code === 'cancelled' || code === 'timeout' || code === 'resource-busy' || code === 'frame-failed'
          ? code : 'engine-failed');
      }
      candidates = interpretPhoto(parseOcr(raw));
    } catch (error) {
      issue = error instanceof PhotoCaptureError ? error.code : 'engine-failed';
    } finally {
      ready = null; shutter = null;
      emit('closing');
      const released = await close();
      if (!released) { attempt.cancel(); emit('blocked', 'cleanup-failed'); }
      else if (attempt.signal.aborted || disposed) emit('cancelled', issue === 'timeout' ? 'timeout' : 'cancelled');
      else if (issue) emit('failed', issue);
      else if (candidates) {
        emit('reviewing');
        onCandidates(attempt.id, candidates);
      }
      attempt.cancel();
      if (current === attempt) current = null;
    }
  }
  function start(): boolean {
    if (disposed || BUSY.has(state.phase)) return false;
    current = new Attempt();
    completion = run(current);
    return true;
  }
  function capture(): boolean {
    if (state.phase !== 'ready' || !shutter || disposed) return false;
    const resolve = shutter; shutter = null;
    emit('recognizing'); resolve(); return true;
  }
  function status(attemptId: number, code: string) {
    if (current?.id === attemptId && !current.signal.aborted && state.phase === 'opening') ready?.(code);
  }
  function cancel(): Promise<void> {
    current?.cancel(); ready = null; shutter = null;
    if (BUSY.has(state.phase) && state.phase !== 'blocked') emit('closing');
    else if (state.phase !== 'blocked') emit('cancelled', 'cancelled');
    return completion;
  }
  function dispose() { disposed = true; void cancel(); }
  return { start, capture, status, cancel, dispose, settled: () => completion };
}
