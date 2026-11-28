// Harness de LABORATÓRIO: empacotado por run-ocr.mjs, nunca importado pelo produto.
// Usa o adaptador Web do projeto sem alterações (worker, contrato e interpretPhoto).
import { interpretPhoto } from '@/domain/interpret-photo';
import { Attempt } from '@/services/recognition/capture-attempt';
import { PhotoCaptureError } from '@/services/recognition/photo-capture-contract';
import { recognizeCanvas } from '@/services/recognition/tesseract-worker.web';

/** Retângulo normalizado (0–1) do quadro original; null = foto inteira. */
interface Roi { x: number; y: number; width: number; height: number }
export interface LabJob { url: string; roi: Roi | null; preprocess: 'none' | 'otsu' | 'otsu-inv' }

// Teto do worker: width * height > 1 920 000 é recusado como frame-failed.
const MAX_PIXELS = 1_900_000;

function otsu(gray: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of gray) hist[v]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, weightB = 0, best = 0, threshold = 127;
  for (let i = 0; i < 256; i++) {
    weightB += hist[i];
    if (!weightB) continue;
    const weightF = total - weightB;
    if (!weightF) break;
    sumB += i * hist[i];
    const between = weightB * weightF * (sumB / weightB - (sum - sumB) / weightF) ** 2;
    if (between > best) { best = between; threshold = i; }
  }
  return threshold;
}

async function runJob(job: LabJob) {
  const blob = await (await fetch(job.url)).blob();
  const bitmap = await createImageBitmap(blob);
  const roi = job.roi ?? { x: 0, y: 0, width: 1, height: 1 };
  const sx = Math.round(roi.x * bitmap.width), sy = Math.round(roi.y * bitmap.height);
  const sw = Math.max(1, Math.round(roi.width * bitmap.width)), sh = Math.max(1, Math.round(roi.height * bitmap.height));
  // Cru: só reduz quando necessário para caber no teto do worker. Pré-processado: até 2×.
  const fit = Math.sqrt(MAX_PIXELS / (sw * sh));
  const scale = job.preprocess === 'none' ? Math.min(1, fit) : Math.min(2, fit);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(sw * scale));
  canvas.height = Math.max(1, Math.floor(sh * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { error: 'no-context' };
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  if (job.preprocess !== 'none') {
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    const gray = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = Math.round(0.299 * data.data[4 * i] + 0.587 * data.data[4 * i + 1] + 0.114 * data.data[4 * i + 2]);
    }
    const t = otsu(gray);
    const invert = job.preprocess === 'otsu-inv';
    for (let i = 0; i < gray.length; i++) {
      const v = (gray[i] > t) !== invert ? 255 : 0;
      data.data[4 * i] = v; data.data[4 * i + 1] = v; data.data[4 * i + 2] = v; data.data[4 * i + 3] = 255;
    }
    context.putImageData(data, 0, 0);
  }
  const size = { width: canvas.width, height: canvas.height };
  const attempt = new Attempt();
  try {
    const result = await recognizeCanvas(canvas, { attempt, own: cleanup => attempt.own(cleanup) });
    return {
      size,
      tokens: result.observation.tokens.map(token => token.text),
      fields: interpretPhoto(result.observation).fields,
      initializationMs: result.initializationMs,
      recognitionMs: result.recognitionMs,
    };
  } catch (error) {
    return { size, error: error instanceof PhotoCaptureError ? error.code : 'unknown' };
  } finally {
    attempt.cancel();
  }
}

(globalThis as unknown as { runLabJob: typeof runJob }).runLabJob = runJob;
