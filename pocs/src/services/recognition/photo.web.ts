import { PocError, type OcrObservation } from '@/domain/contracts';
import { parseOcr } from '@/domain/interpret-photo';
import type { Attempt } from '@/features/attempt';

const record = (v: unknown): Record<string, unknown> | null => v && typeof v === 'object' ? v as Record<string, unknown> : null;
const unit = (v: number) => Math.max(0, Math.min(1, v));

export async function recognizeCanvas(canvas: HTMLCanvasElement, attempt: Attempt) {
  attempt.check();
  const capturedAtMs = Date.now();
  if (typeof Worker === 'undefined') throw new PocError('unsupported');
  const initializationStart = performance.now();
  // Protocolo do worker Tesseract.js 7.0.0, fixado no lock. O handle existe ANTES
  // de carregar WASM/modelo, permitindo cancelar inclusive a inicialização.
  const worker = new Worker('/ocr/worker.min.js');
  let sequence = 0;
  let pending: { id: string; resolve: (value: unknown) => void; reject: (error: PocError) => void } | null = null;
  attempt.own(() => {
    worker.onmessage = null; worker.onerror = null; worker.terminate();
    pending?.reject(new PocError('cancelled')); pending = null;
  });
  worker.onerror = event => { event.preventDefault(); pending?.reject(new PocError('engine-failed')); pending = null; };
  worker.onmessage = event => {
    const data = record(event.data);
    if (!data || !pending || data.jobId !== pending.id || attempt.signal.aborted) return;
    if (data.status === 'resolve') { const target = pending; pending = null; target.resolve(data.data); }
    else if (data.status === 'reject') { pending.reject(new PocError('engine-failed')); pending = null; }
    // Progressos e erros brutos nunca são impressos ou armazenados.
  };
  function job(action: string, payload: object, transfer: Transferable[] = []) {
    attempt.check();
    if (pending) throw new PocError('engine-failed');
    const id = String(++sequence);
    return attempt.wait(new Promise<unknown>((resolve, reject) => {
      pending = { id, resolve, reject };
      worker.postMessage({ workerId: 'poc-local', jobId: id, action, payload }, transfer);
    }), 45_000);
  }
  const base = `${location.origin}/ocr`;
  await job('load', { options: { corePath: base, lstmOnly: true, logging: false } });
  await job('loadLanguage', { langs: 'eng', options: { langPath: base, gzip: true, cacheMethod: 'none', lstmOnly: true } });
  await job('initialize', { langs: 'eng', oem: 1, config: { tessedit_pageseg_mode: '6' } });
  const initializationMs = performance.now() - initializationStart;
  attempt.check();
  // PNG codificado em RAM: não usa Blob persistido, URL de arquivo, download ou storage.
  const base64 = canvas.toDataURL('image/png').split(',')[1];
  const binary = atob(base64);
  const image = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) image[i] = binary.charCodeAt(i);
  const start = performance.now();
  const result = record(await job('recognize', { image, options: {}, output: { text: false, blocks: true } }, [image.buffer]));
  attempt.check();
  const tokens: OcrObservation['tokens'][number][] = [];
  const blocks = result?.blocks;
  if (!Array.isArray(blocks)) throw new PocError('engine-failed');
  for (const block of blocks) {
    const paragraphs = record(block)?.paragraphs;
    if (!Array.isArray(paragraphs)) continue;
    for (const paragraph of paragraphs) {
      const lines = record(paragraph)?.lines;
      if (!Array.isArray(lines)) continue;
      for (const line of lines) {
        const raw = record(line); const box = record(raw?.bbox);
        if (!raw || !box || typeof raw.text !== 'string' || raw.text.length > 500) continue;
        const { x0, y0, x1, y1 } = box;
        if (typeof x0 !== 'number' || typeof y0 !== 'number' || typeof x1 !== 'number' || typeof y1 !== 'number'
          || ![x0, y0, x1, y1].every(Number.isFinite)) continue;
        tokens.push({ text: raw.text, confidence: null, box: { x: unit(x0 / canvas.width), y: unit(y0 / canvas.height),
          width: unit((x1 - x0) / canvas.width), height: unit((y1 - y0) / canvas.height) } });
        if (tokens.length >= 500) break;
      }
    }
  }
  const observation = parseOcr({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs, tokens });
  return { observation, initializationMs, recognitionMs: performance.now() - start };
}

export async function openCamera(video: HTMLVideoElement, attempt: Attempt): Promise<void> {
  if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new PocError('unsupported');
  const opening = navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }).catch((error: unknown) => {
    const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
    throw new PocError(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission-denied' : 'device-unavailable');
  });
  // Se a permissão terminar depois de cancelar, as tracks também são encerradas.
  void opening.then(stream => { if (attempt.signal.aborted) stream.getTracks().forEach(track => track.stop()); }, () => undefined);
  const stream = await attempt.wait(opening, 30_000);
  attempt.own(() => { stream.getTracks().forEach(track => track.stop()); video.srcObject = null; });
  attempt.check(); video.srcObject = stream;
  await attempt.wait(video.play(), 10_000);
}

export function frameFromVideo(video: HTMLVideoElement): HTMLCanvasElement {
  if (!video.videoWidth || !video.videoHeight) throw new PocError('camera-failed');
  const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new PocError('camera-failed');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function syntheticCard(): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 480;
  const context = canvas.getContext('2d');
  if (!context) throw new PocError('unsupported');
  context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'black'; context.font = 'bold 72px sans-serif';
  context.fillText('SYS 120', 50, 110); context.fillText('DIA 80', 50, 250); context.fillText('PUL 72', 50, 390);
  return canvas;
}
