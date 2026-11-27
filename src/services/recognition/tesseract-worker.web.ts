import type { OcrObservation } from '@/domain/assisted-entry';
import { PhotoCaptureError as PocError } from './photo-capture-contract';
import { parseOcr } from '@/domain/interpret-photo';
import type { Attempt } from './capture-attempt';

export interface WorkerLifetime {
  attempt: Attempt;
  own: (cleanup: () => void) => void;
}

const record = (v: unknown): Record<string, unknown> | null => v && typeof v === 'object' ? v as Record<string, unknown> : null;
const unit = (v: number) => Math.max(0, Math.min(1, v));

export async function recognizeCanvas(canvas: HTMLCanvasElement, lifetime: WorkerLifetime,
  makeWorker: () => Worker = () => new Worker('/ocr/safe-worker.js'), origin: string = location.origin) {
  const attempt = lifetime.attempt;
  const width = canvas.width, height = canvas.height;
  if (!width || !height || width * height > 1920000) throw new PocError('frame-failed');
  lifetime.own(() => { canvas.width = 0; canvas.height = 0; });
  attempt.check();
  const capturedAtMs = Date.now();

  const initializationStart = performance.now();
  // Protocolo do worker Tesseract.js 7.0.0, fixado no lock. O handle existe ANTES
  // de carregar WASM/modelo, permitindo cancelar inclusive a inicialização.
  const worker = makeWorker();
  let sequence = 0;
  let pending: { id: string; resolve: (value: unknown) => void; reject: (error: PocError) => void } | null = null;
  lifetime.own(() => {
    worker.onmessage = null; worker.onerror = null; worker.terminate();
    pending?.reject(new PocError('cancelled')); pending = null;
  });
  worker.onerror = event => { event.preventDefault(); pending?.reject(new PocError('engine-failed')); pending = null; };
  worker.onmessage = event => {
    const data = record(event.data);
    if (data?.kind === 'engine-failed') { pending?.reject(new PocError('engine-failed')); pending = null; return; }
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
  // Codificar antes da inicialização; liberar o canvas, sem reter base64 no await.
  const image = encodeCanvas(canvas);
  canvas.width = 0; canvas.height = 0;
  const base = `${origin}/ocr`;
  await job('load', { options: { corePath: base, lstmOnly: true, logging: false } });
  await job('loadLanguage', { langs: 'eng', options: { langPath: base, gzip: true, cacheMethod: 'none', lstmOnly: true } });
  await job('initialize', { langs: 'eng', oem: 1, config: { tessedit_pageseg_mode: '6' } });
  const initializationMs = performance.now() - initializationStart;
  attempt.check();
  // PNG codificado em RAM: não usa Blob persistido, URL de arquivo, download ou storage.
  const start = performance.now();
  const result = record(await job('recognize', { image, options: {}, output: { text: false, blocks: true } }, [image.buffer]));
  attempt.check();
  const tokens: OcrObservation['tokens'][number][] = [];
  const blocks = result?.blocks === null ? [] : result?.blocks;
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
          || ![x0, y0, x1, y1].every(Number.isFinite) || x1 < x0 || y1 < y0) continue;
        tokens.push({ text: raw.text, confidence: null, box: { x: unit(x0 / width), y: unit(y0 / height),
          width: Math.max(0, unit(x1 / width) - unit(x0 / width)), height: Math.max(0, unit(y1 / height) - unit(y0 / height)) } });
        if (tokens.length >= 500) break;
      }
    }
  }
  const observation = parseOcr({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs, tokens });
  return { observation, initializationMs, recognitionMs: performance.now() - start };
}


function encodeCanvas(canvas: HTMLCanvasElement): Uint8Array {
  const binary = atob(canvas.toDataURL('image/png').split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
