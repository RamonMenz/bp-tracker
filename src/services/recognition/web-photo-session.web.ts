import type { CandidateSet } from '@/domain/assisted-entry';
import { interpretPhoto } from '@/domain/interpret-photo';

import type { PhotoPhase } from './android-photo-session';
import { PhotoCaptureError, PHOTO_MESSAGES, type PhotoCaptureCode } from './photo-capture-contract';
import { recognizeCanvas } from './tesseract-worker.web';
import { WebPhotoResources } from './web-photo-resources';

export const WEB_PHOTO_MESSAGES = { ...PHOTO_MESSAGES,
  unsupported: 'Captura Web indisponível. Use HTTPS/localhost e um navegador com câmera, Worker e WebAssembly.',
};
export interface WebPhotoState { phase: PhotoPhase; attemptId: number; issue: PhotoCaptureCode | null; source: 'camera' | 'synthetic-card' }
export interface WebPhotoEnvironment {
  getUserMedia(): Promise<MediaStream>;
  makeWorker(): Worker;
  makeCanvas(): HTMLCanvasElement;
  check(camera: boolean): void;
  origin(): string;
}
const browser: WebPhotoEnvironment = {
  getUserMedia: () => navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }),
  makeWorker: () => new Worker('/ocr/safe-worker.js'), makeCanvas: () => document.createElement('canvas'),
  origin: () => location.origin,
  check: camera => {
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined'
      || (camera && (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia))) throw new PhotoCaptureError('unsupported');
  },
};
let owner: object | null = null;
const busy = new Set<PhotoPhase>(['permission', 'opening', 'ready', 'recognizing', 'closing', 'blocked']);

/** getUserMedia/canvas/worker somente por ação explícita. Sem SDK ou writer clínico. */
export function createWebPhotoSession(video: () => HTMLVideoElement | null, onState: (state: WebPhotoState) => void,
  onCandidates: (candidates: CandidateSet) => void, environment: WebPhotoEnvironment = browser) {
  let state: WebPhotoState = { phase: 'idle', attemptId: 0, issue: null, source: 'camera' };
  let resource: WebPhotoResources | null = null;
  let completion = Promise.resolve();
  let shutter: (() => void) | null = null;
  let disposed = false;
  let cancelledByUser = false;
  function emit(phase: PhotoPhase, issue: PhotoCaptureCode | null = null) {
    state = { ...state, phase, issue };
    if (!disposed) onState(state);
  }
  async function run(scope: WebPhotoResources, source: WebPhotoState['source']) {
    const attempt = scope.attempt;
    let candidates: CandidateSet | null = null;
    let issue: PhotoCaptureCode | null = null;
    try {
      environment.check(source === 'camera');
      let canvas: HTMLCanvasElement;
      if (source === 'camera') {
        const element = video();
        if (!element) throw new PhotoCaptureError('camera-failed');
        emit('permission');
        const opening = environment.getUserMedia().catch((error: unknown) => {
          const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
          throw new PhotoCaptureError(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission-denied' : 'device-unavailable');
        });
        scope.trackOpening(opening);
        let stream: MediaStream;
        try { stream = await attempt.wait(opening, 30000); }
        catch (error) {
          if (error instanceof PhotoCaptureError) throw error;
          const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
          throw new PhotoCaptureError(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission-denied' : 'device-unavailable');
        }
        attempt.check();
        let cameraStopped = false;
        const closeVideo = () => {
          if (cameraStopped) return;
          cameraStopped = true; scope.stopStream(stream); element.pause(); element.srcObject = null;
        };
        scope.own(closeVideo);
        element.srcObject = stream; emit('opening');
        await attempt.wait(element.play(), 10000);
        const capture = new Promise<void>(resolve => { shutter = resolve; });
        emit('ready'); await attempt.wait(capture, 60000); attempt.check();
        const width = element.videoWidth, height = element.videoHeight;
        if (!width || !height) throw new PhotoCaptureError('frame-failed');
        const scale = Math.min(1, 1600 / Math.max(width, height), Math.sqrt(1920000 / (width * height)));
        canvas = environment.makeCanvas();
        scope.own(() => { canvas.width = 0; canvas.height = 0; });
        canvas.width = Math.max(1, Math.floor(width * scale)); canvas.height = Math.max(1, Math.floor(height * scale));
        const context = canvas.getContext('2d'); if (!context) throw new PhotoCaptureError('frame-failed');
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        closeVideo(); // Não manter câmera enquanto WASM/modelo inicializam.
      } else {
        canvas = environment.makeCanvas(); canvas.width = 900; canvas.height = 480;
        scope.own(() => { canvas.width = 0; canvas.height = 0; });
        const context = canvas.getContext('2d'); if (!context) throw new PhotoCaptureError('frame-failed');
        context.fillStyle = 'white'; context.fillRect(0, 0, 900, 480); context.fillStyle = 'black'; context.font = 'bold 72px sans-serif';
        context.fillText('SYS 120', 50, 110); context.fillText('DIA 80', 50, 250); context.fillText('PUL 72', 50, 390);
      }
      emit('recognizing');
      const { observation } = await recognizeCanvas(canvas, scope, environment.makeWorker, environment.origin());
      attempt.check(); candidates = interpretPhoto(observation);
    } catch (error) { issue = error instanceof PhotoCaptureError ? error.code : 'engine-failed'; }
    finally {
      const cancelled = attempt.signal.aborted || disposed;
      shutter = null; emit('closing');
      const released = await scope.close();
      if (!released) emit('blocked', 'cleanup-failed');
      else if (cancelled || cancelledByUser || disposed) emit('cancelled', issue === 'timeout' ? 'timeout' : 'cancelled');
      else if (issue) emit('failed', issue);
      else if (candidates) { emit('reviewing'); if (!disposed) onCandidates(candidates); }
      if (resource === scope) resource = null;
    }
  }
  function start(source: WebPhotoState['source'] = 'camera'): boolean {
    if (disposed || busy.has(state.phase)) return false;
    if (owner) { emit('failed', 'resource-busy'); return false; }
    const ticket = {}; owner = ticket;
    cancelledByUser = false;
    resource = new WebPhotoResources(() => { if (owner === ticket) owner = null; });
    state = { ...state, source, attemptId: resource.attempt.id };
    completion = run(resource, source); return true;
  }
  function capture(): boolean {
    if (disposed || state.phase !== 'ready' || !shutter) return false;
    const resolve = shutter; shutter = null; emit('recognizing'); resolve(); return true;
  }
  function cancel() {
    cancelledByUser = true;
    resource?.attempt.cancel(); shutter = null;
    if (!busy.has(state.phase)) emit('cancelled', 'cancelled');
    return completion;
  }
  function dispose() { disposed = true; void cancel(); }
  return { start, capture, cancel, dispose, settled: () => completion };
}
