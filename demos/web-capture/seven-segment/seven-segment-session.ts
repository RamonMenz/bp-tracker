// DEMO EXPERIMENTAL — sessão do leitor de sete segmentos (candidato NÃO habilitado no app).
// Câmera só por ação explícita; quadro recortado pela guia em canvas na memória; câmera encerrada antes
// da leitura; nenhum armazenamento, rede, worker ou writer. Resultado tardio após cancelar é descartado.
import type { CandidateSet } from '@/domain/assisted-entry';
import { decodeSevenSegment, type GrayImage, type SevenSegmentDevice, toCandidateSet } from '@/domain/seven-segment/decode-seven-segment';
import { PhotoCaptureError, type PhotoCaptureCode } from '@/services/recognition/photo-capture-contract';
import { WebPhotoResources } from '@/services/recognition/web-photo-resources';

import { cropToGray, drawSyntheticLcd, guideRect, LCD_ASPECT, LCD_WIDTH } from './guide';

export type SevenSegmentPhase = 'idle' | 'permission' | 'ready' | 'reading' | 'closing' | 'reviewing' | 'cancelled' | 'failed';
export type SevenSegmentSource = 'camera' | 'synthetic';
export interface SevenSegmentState { phase: SevenSegmentPhase; issue: PhotoCaptureCode | null; source: SevenSegmentSource }

export interface SevenSegmentEnvironment {
  getUserMedia(): Promise<MediaStream>;
  makeCanvas(): HTMLCanvasElement;
  cameraAvailable(): boolean;
}
const browser: SevenSegmentEnvironment = {
  getUserMedia: () => navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }),
  makeCanvas: () => document.createElement('canvas'),
  cameraAvailable: () => Boolean(globalThis.isSecureContext && navigator.mediaDevices?.getUserMedia),
};
const BUSY = new Set<SevenSegmentPhase>(['permission', 'ready', 'reading', 'closing']);
const errorName = (error: unknown) => (error && typeof error === 'object' && 'name' in error ? String(error.name) : '');

export function createSevenSegmentSession(video: () => HTMLVideoElement | null, onState: (state: SevenSegmentState) => void,
  onCandidates: (candidates: CandidateSet) => void, environment: SevenSegmentEnvironment = browser) {
  let state: SevenSegmentState = { phase: 'idle', issue: null, source: 'camera' };
  let resource: WebPhotoResources | null = null;
  let shutter: (() => void) | null = null;
  let completion = Promise.resolve();
  let disposed = false;
  function emit(phase: SevenSegmentPhase, issue: PhotoCaptureCode | null = null) {
    state = { ...state, phase, issue };
    if (!disposed) onState(state);
  }
  async function frame(scope: WebPhotoResources, device: SevenSegmentDevice): Promise<GrayImage> {
    const attempt = scope.attempt;
    if (!environment.cameraAvailable()) throw new PhotoCaptureError('unsupported');
    const element = video();
    if (!element) throw new PhotoCaptureError('camera-failed');
    emit('permission');
    const opening = environment.getUserMedia().catch((error: unknown) => {
      throw new PhotoCaptureError(['NotAllowedError', 'SecurityError'].includes(errorName(error)) ? 'permission-denied' : 'device-unavailable');
    });
    scope.trackOpening(opening);
    const stream = await attempt.wait(opening, 30000);
    attempt.check();
    let stopped = false;
    const closeVideo = () => {
      if (stopped) return;
      stopped = true;
      scope.stopStream(stream);
      element.pause();
      element.srcObject = null;
    };
    scope.own(closeVideo);
    element.srcObject = stream;
    await attempt.wait(element.play(), 10000);
    const capture = new Promise<void>(resolve => { shutter = resolve; });
    emit('ready');
    await attempt.wait(capture, 120000);
    attempt.check();
    const { videoWidth, videoHeight } = element;
    if (!videoWidth || !videoHeight) throw new PhotoCaptureError('frame-failed');
    const canvas = environment.makeCanvas();
    scope.own(() => { canvas.width = 0; canvas.height = 0; });
    const gray = cropToGray(element, guideRect(videoWidth, videoHeight, device), canvas);
    closeVideo(); // não manter a câmera aberta durante a leitura
    return gray;
  }
  function synthetic(scope: WebPhotoResources, device: SevenSegmentDevice): GrayImage {
    const height = Math.round(LCD_WIDTH * LCD_ASPECT[device]);
    const canvas = environment.makeCanvas();
    scope.own(() => { canvas.width = 0; canvas.height = 0; });
    canvas.width = LCD_WIDTH;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new PhotoCaptureError('frame-failed');
    const area = { x: 0, y: 0, width: LCD_WIDTH, height };
    drawSyntheticLcd(context, area, device, ['120', '80', '72']); // valores inventados, sem dado clínico
    return cropToGray(canvas, area, environment.makeCanvas());
  }
  async function run(scope: WebPhotoResources, source: SevenSegmentSource, device: SevenSegmentDevice) {
    const attempt = scope.attempt;
    let candidates: CandidateSet | null = null;
    let issue: PhotoCaptureCode | null = null;
    try {
      const gray = source === 'camera' ? await frame(scope, device) : synthetic(scope, device);
      emit('reading');
      await new Promise(resolve => setTimeout(resolve, 0)); // deixa o estado "lendo" aparecer
      attempt.check();
      const fields = decodeSevenSegment(gray, device);
      gray.data.fill(0);
      attempt.check();
      candidates = toCandidateSet(fields, Date.now());
    } catch (error) {
      issue = error instanceof PhotoCaptureError ? error.code : 'engine-failed';
    } finally {
      const cancelled = attempt.signal.aborted || disposed;
      shutter = null;
      emit('closing');
      const released = await scope.close();
      if (!released) emit('failed', 'cleanup-failed');
      else if (cancelled) emit('cancelled', 'cancelled');
      else if (issue) emit('failed', issue);
      else if (candidates) {
        emit('reviewing');
        if (!disposed) onCandidates(candidates);
      }
      if (resource === scope) resource = null;
    }
  }
  function start(source: SevenSegmentSource, device: SevenSegmentDevice): boolean {
    if (disposed || BUSY.has(state.phase)) return false;
    resource = new WebPhotoResources(() => undefined);
    state = { ...state, source };
    completion = run(resource, source, device);
    return true;
  }
  function capture(): boolean {
    if (disposed || state.phase !== 'ready' || !shutter) return false;
    const resolve = shutter;
    shutter = null;
    resolve();
    return true;
  }
  function cancel() {
    resource?.attempt.cancel();
    shutter = null;
    if (!BUSY.has(state.phase)) emit('cancelled', 'cancelled');
    return completion;
  }
  function dispose() {
    disposed = true;
    void cancel();
  }
  return { start, capture, cancel, dispose, settled: () => completion };
}
