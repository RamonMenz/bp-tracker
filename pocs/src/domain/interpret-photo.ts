import type { CandidateSet, Candidate, OcrObservation } from '@/domain/contracts';

// Spike conservadora: só pares rótulo/número na mesma linha. Sem layout implícito,
// conversão de escala ou preenchimento a partir de histórico. TASK-09 fará o parser completo.
export function interpretPhoto(observation: OcrObservation): CandidateSet {
  function field(label: RegExp): Candidate {
    const values: number[] = [];
    let unreadable = false;
    for (const token of observation.tokens) {
      const text = token.text.trim().toUpperCase();
      if (!label.test(text)) continue;
      const numbers = text.match(/\b\d{2,3}\b/g);
      if (numbers?.length === 1) values.push(Number(numbers[0]));
      else unreadable = true;
    }
    if (unreadable) return { status: 'uncertain', reason: 'unreadable' };
    if (!values.length) return { status: 'missing' };
    if (values.length !== 1) return { status: 'uncertain', reason: 'ambiguous-label' };
    return { status: 'candidate', value: values[0], basis: 'label' };
  }
  return { modality: 'photo', capturedAtMs: observation.capturedAtMs, fields: {
    systolic: field(/\bSYS\b/), diastolic: field(/\bDIA\b/), pulse: field(/\bPUL(?:SE)?\b/),
  } };
}

export function parseOcr(value: unknown): OcrObservation {
  if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'ocr'
    || !('coordinateSpace' in value) || value.coordinateSpace !== 'upright-frame'
    || !('capturedAtMs' in value) || typeof value.capturedAtMs !== 'number'
    || !Number.isFinite(value.capturedAtMs) || value.capturedAtMs < 0
    || !('tokens' in value) || !Array.isArray(value.tokens)
    || value.tokens.length > 500) throw new Error('malformed-output');
  const tokens: OcrObservation['tokens'][number][] = [];
  for (const item of value.tokens) {
    if (!item || typeof item !== 'object' || typeof item.text !== 'string' || item.text.length > 500
      || !item.box || typeof item.box !== 'object') throw new Error('malformed-output');
    const { x, y, width, height } = item.box;
    if (item.confidence !== null && (typeof item.confidence !== 'number'
      || !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1)) throw new Error('malformed-output');
    if (![x, y, width, height].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)) {
      throw new Error('malformed-output');
    }
    tokens.push({ text: item.text, confidence: item.confidence, box: { x, y, width, height } });
  }
  return { kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: value.capturedAtMs, tokens };
}
