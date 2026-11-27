import type { OcrObservation } from '@/domain/assisted-entry';

/** Apenas texto/coordenadas sintéticos rotulados; não são saídas medidas de OCR. */
export const photoLine = (text: string, x = 0.1, y = 0.1, width = 0.6, height = 0.08): OcrObservation['tokens'][number] =>
  ({ text, confidence: null, box: { x, y, width, height } });
export const photoObservation = (tokens: OcrObservation['tokens']): OcrObservation =>
  ({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000, tokens });

export const PHOTO_INTERPRETATION_EXAMPLES = {
  complete: photoObservation([photoLine('SYS 120'), photoLine('DIA 80', 0.1, 0.4), photoLine('PUL 72', 0.1, 0.7)]),
  uncertain: photoObservation([photoLine('SYS 120'), photoLine('SYS 130', 0.1, 0.25), photoLine('DIA 80', 0.1, 0.5)]),
  invalid: photoObservation([photoLine('SYS 400'), photoLine('DIA 80', 0.1, 0.4)]),
  layout: photoObservation([
    photoLine('SYS:', 0.1, 0.15, 0.12), photoLine('120', 0.4, 0.13, 0.25, 0.12),
    photoLine('DIA', 0.1, 0.45, 0.12), photoLine('80', 0.4, 0.43, 0.25, 0.12),
    photoLine('PUL', 0.1, 0.75, 0.12), photoLine('72', 0.4, 0.73, 0.25, 0.12),
  ]),
  accessories: photoObservation([
    photoLine('12:30 27/10/2026 M 99'), photoLine('SYS 120 mmHg', 0.1, 0.3),
    photoLine('DIA 80 mmHg', 0.1, 0.5), photoLine('72 bpm', 0.1, 0.7),
  ]),
  partial: photoObservation([photoLine('SYS'), photoLine('DIA 80', 0.1, 0.5)]),
  unidentified: photoObservation([photoLine('120'), photoLine('80', 0.1, 0.4), photoLine('72', 0.1, 0.7)]),
} as const;
