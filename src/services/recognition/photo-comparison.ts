import type { CandidateSet } from '@/domain/assisted-entry';
import { interpretPhoto, parseOcr } from '@/domain/interpret-photo';

import { describePhotoBridge } from './photo-bridge-diagnostic';
import { describePhotoInterpretation } from './photo-interpretation-diagnostic';
import { PhotoCaptureError } from './photo-capture-contract';

export interface ComparisonPass { candidates: CandidateSet; diagnostic: readonly string[] }
export interface PhotoComparison { original: ComparisonPass; processed: ComparisonPass; transform: readonly string[] }
const MAX_PIXELS = 1920000;
const MAX_OWNED_BYTES = MAX_PIXELS * 3;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PhotoCaptureError('geometry-unavailable');
  return value as Record<string, unknown>;
}
function integer(value: unknown, maximum = 100000): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum;
}
function dimensions(w: unknown, h: unknown): w is number {
  return integer(w) && integer(h) && w > 0 && h > 0 && w % 2 === 0 && h % 2 === 0 && w * h <= MAX_PIXELS;
}

/** Resultado de duas passagens no mesmo quadro. Não escolhe, mescla, corrige ou salva campos. */
export function parsePhotoComparison(value: unknown): PhotoComparison {
  const raw = record(value);
  if (raw.kind !== 'photo-comparison' || raw.revision !== 'roi-1') throw new PhotoCaptureError('unsupported');
  const original = parseOcr(raw.original), processed = parseOcr(raw.processed);
  if (original.capturedAtMs !== processed.capturedAtMs) throw new PhotoCaptureError('geometry-unavailable');
  const t = record(raw.transformDiagnostic);
  const { sourceWidth: sw, sourceHeight: sh, outputWidth: ow, outputHeight: oh,
    rotation, left, top, right, bottom, ownedPixelBytes, maxOwnedPixelBytes } = t;
  if (t.revision !== 'roi-1' || !dimensions(sw, sh) || !integer(sh) || !dimensions(ow, oh) || !integer(oh)
    || typeof rotation !== 'number' || ![0, 90, 180, 270].includes(rotation)
    || !integer(left) || !integer(top) || !integer(right) || !integer(bottom)
    || [left, top, right, bottom].some(n => n % 2 !== 0) || right <= left || bottom <= top
    || ow > 1600 || oh > 1600 || ow > (right - left) * 2 || oh > (bottom - top) * 2
    || maxOwnedPixelBytes !== MAX_OWNED_BYTES || !integer(ownedPixelBytes, MAX_OWNED_BYTES)
    || ownedPixelBytes !== (sw * sh + ow * oh) * 3 / 2) throw new PhotoCaptureError('geometry-unavailable');
  const w = rotation % 180 === 0 ? sw : sh, h = rotation % 180 === 0 ? sh : sw;
  const scale = Math.min(2, 1600 / Math.max(right - left, bottom - top), Math.sqrt(MAX_PIXELS / ((right - left) * (bottom - top))));
  if (ow !== Math.floor((right - left) * scale / 2) * 2 || oh !== Math.floor((bottom - top) * scale / 2) * 2) {
    throw new PhotoCaptureError('geometry-unavailable');
  }
  if (right > w || bottom > h || processed.tokens.some(({ box }) => box.x < left / w - 1e-6
    || box.y < top / h - 1e-6 || box.x + box.width > right / w + 1e-6 || box.y + box.height > bottom / h + 1e-6)) {
    throw new PhotoCaptureError('geometry-unavailable');
  }
  function pass(observation: ReturnType<typeof parseOcr>, source: unknown): ComparisonPass {
    const candidates = interpretPhoto(observation);
    const data = record(source);
    return { candidates, diagnostic: [...describePhotoInterpretation(observation, candidates), ...describePhotoBridge(data.bridgeDiagnostic)] };
  }
  return { original: pass(original, raw.original), processed: pass(processed, raw.processed), transform: [
    'comparacao:roi-1; mesmo-quadro; original-depois-processado; sem-mescla',
    `transformacao:origem=${sw}x${sh}; rot=${rotation}; upright=${w}x${h}`,
    `transformacao:roi=${left},${top},${right},${bottom}; saida=${ow}x${oh}; interpolacao=bilinear`,
    `buffers:limite-proprio=${MAX_OWNED_BYTES}; pixels-deste-par=${ownedPixelBytes}; sdk-nao-medido`,
  ] };
}
