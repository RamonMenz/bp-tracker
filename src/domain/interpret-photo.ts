import type { CandidateSet, CandidateField as Candidate, ClinicalField, OcrObservation } from '@/domain/assisted-entry';

type Box = OcrObservation['tokens'][number]['box'];
type Issue = Extract<Candidate, { status: 'uncertain' }>['reason'];
interface Anchor { field: ClinicalField; box: Box; inline: Candidate | null; token: number }
interface Fragment { box: Box; value: Candidate; token: number }
const FIELDS = ['systolic', 'diastolic', 'pulse'] as const;
const LABELS: Readonly<Record<string, ClinicalField>> = {
  SYS: 'systolic', SIS: 'systolic', SISTOLICA: 'systolic', SYSTOLIC: 'systolic',
  DIA: 'diastolic', DIASTOLICA: 'diastolic', DIASTOLIC: 'diastolic',
  PUL: 'pulse', PULSE: 'pulse', PULSO: 'pulse', PR: 'pulse', BPM: 'pulse',
};
const uncertain = (reason: Issue): Candidate => ({ status: 'uncertain', reason });
const missing = (): Candidate => ({ status: 'missing' });
const candidate = (value: number, basis: 'label' | 'layout'): Candidate => ({ status: 'candidate', value, basis });
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/** Remove somente acessórios identificados; não transforma dígitos, escalas ou valores. */
function withoutAccessories(text: string): string {
  return text
    .replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, ' ')
    .replace(/\b(?:MEMORY|MEMORIA|MEM|M|USER|USUARIO|USR|AVG|AVERAGE|MEDIA|DATA|DATE|TIME|HORA)\s*[.:#-]?\s*\d+\b/g, ' ')
    .replace(/\b(?:MMHG|MIN|KPA|DATA|DATE|TIME|HORA|AM|PM)\b/g, ' ');
}
function lex(text: string): string[] {
  // Preserva sinais, decimais e separadores internos: "12O", "12.0" e "-80"
  // não viram 12, 120 ou 80 por remoção de caracteres.
  return text.match(/[A-Z]+|[+-]?\d+(?:[.,:/-]\d+)*|[^\s]/g) ?? [];
}
function valueOf(parts: string[], basis: 'label' | 'layout'): Candidate {
  const meaningful = parts.filter(part => ![':', '=', '/', '(', ')'].includes(part));
  if (meaningful.length > 1 && meaningful.every(part => /^\d+$/.test(part))) return uncertain('ambiguous-label');
  if (meaningful.length !== 1 || !/^\d+$/.test(meaningful[0])) return uncertain('unreadable');
  const value = Number(meaningful[0]);
  return Number.isSafeInteger(value) ? candidate(value, basis) : uncertain('unreadable');
}
const centerX = (box: Box) => box.x + box.width / 2;
const centerY = (box: Box) => box.y + box.height / 2;
const usable = (box: Box) => box.width > 0 && box.height > 0;
function sameRow(label: Box, number: Box): boolean {
  if (!usable(label) || !usable(number)) return false;
  const overlap = Math.min(label.y + label.height, number.y + number.height) - Math.max(label.y, number.y);
  const gap = Math.max(number.x - label.x - label.width, label.x - number.x - number.width);
  const separate = number.x >= label.x + label.width - 0.01 || label.x >= number.x + number.width - 0.01;
  return separate && gap <= 0.300001 && overlap >= Math.min(label.height, number.height) * 0.5 - 0.000001
    && Math.abs(centerY(label) - centerY(number)) <= Math.max(label.height, number.height) * 0.5;
}
function directlyBelow(label: Box, number: Box): boolean {
  if (!usable(label) || !usable(number)) return false;
  const gap = number.y - label.y - label.height;
  return gap >= -0.010001 && gap <= 0.120001 && Math.abs(centerX(label) - centerX(number)) <= 0.080001;
}

/** Interpretação pura de linhas orientadas dos adaptadores ML Kit/Tesseract.
 * Rótulos explícitos ou layout ancorado em rótulo; nunca ordena valores por faixa.
 * Limites geométricos conservadores são regras locais, não cobertura comprovada de aparelhos.
 */
export function interpretPhoto(observation: OcrObservation): CandidateSet {
  const anchors: Anchor[] = [];
  const accessoryLabels: Box[] = [];
  const fragments: Fragment[] = [];
  let hasKpa = false;
  observation.tokens.forEach((token, index) => {
    const normalized = normalize(token.text);
    hasKpa ||= lex(normalized).includes('KPA');
    if (/^\s*(?:MEMORY|MEMORIA|MEM|M|USER|USUARIO|USR|AVG|AVERAGE|MEDIA|DATA|DATE|TIME|HORA)\s*[:#.]?\s*$/.test(normalized)) {
      accessoryLabels.push(token.box); return;
    }
    const parts = lex(withoutAccessories(normalized)).filter(part =>
      !['MMHG', 'MIN', 'KPA', ':', '=', '/', '(', ')'].includes(part));
    // BPM complementa um rótulo de pulso; sozinho também identifica pulso.
    const hasPulseLabel = parts.some(part => LABELS[part] === 'pulse' && part !== 'BPM');
    const pieces = hasPulseLabel ? parts.filter(part => part !== 'BPM') : parts;
    const labels = pieces.flatMap((part, position) => LABELS[part] ? [{ field: LABELS[part], position }] : []);
    if (!labels.length) {
      if (pieces.some(part => /\d/.test(part))) fragments.push({ box: token.box, token: index, value: valueOf(pieces, 'layout') });
      return;
    }
    if (labels.length === 1) {
      const remainder = pieces.filter((_, position) => position !== labels[0].position);
      anchors.push({ field: labels[0].field, box: token.box, token: index,
        inline: remainder.length ? valueOf(remainder, 'label') : null });
      return;
    }
    // Linhas contendo vários campos: aceita gramática uniforme rótulo/valor
    // ou valor/rótulo. Não estima caixas de palavras a partir da caixa da linha.
    const postfix = labels[0].position > 0;
    labels.forEach((label, i) => {
      const from = postfix ? (i ? labels[i - 1].position + 1 : 0) : label.position + 1;
      const to = postfix ? label.position : (labels[i + 1]?.position ?? pieces.length);
      const extras = (postfix && i === labels.length - 1 ? pieces.slice(label.position + 1) : []);
      anchors.push({ field: label.field, box: token.box, token: index,
        inline: valueOf([...pieces.slice(from, to), ...extras], 'label') });
    });
  });
  const bare = anchors.filter(anchor => anchor.inline === null);
  const boxes = [...bare.map(anchor => anchor.box), ...accessoryLabels];
  const assignedRows = new Set(fragments.filter(fragment => boxes.some(box => sameRow(box, fragment.box))));
  function nearby(box: Box): Fragment[] {
    const row = fragments.filter(fragment => sameRow(box, fragment.box));
    // Uma linha numérica alinhada a outro rótulo não é emprestada à linha de cima.
    const below = fragments.filter(fragment => directlyBelow(box, fragment.box) && !assignedRows.has(fragment));
    return [...new Set([...row, ...below])];
  }
  const options = new Map(bare.map(anchor => [anchor, nearby(anchor.box)]));
  const allOptions = [...options.values(), ...accessoryLabels.map(nearby)];
  const used = new Set<Fragment>();
  for (const fragments of allOptions) for (const fragment of fragments) used.add(fragment);
  const orphan = fragments.some(fragment => !used.has(fragment));
  function field(key: ClinicalField): Candidate {
    const matches = anchors.filter(anchor => anchor.field === key);
    if (matches.length > 1) return uncertain('ambiguous-label');
    if (!matches.length) return orphan ? uncertain('unidentified-number') : missing();
    const anchor = matches[0];
    if (anchor.inline) return anchor.inline;
    const nearby = options.get(anchor) ?? [];
    if (!nearby.length) return uncertain('unreadable');
    if (nearby.length > 1 || allOptions.filter(items => items.includes(nearby[0])).length > 1) {
      return uncertain('ambiguous-label');
    }
    return nearby[0].value;
  }
  const fields = Object.fromEntries(FIELDS.map(key => [key, field(key)])) as Record<ClinicalField, Candidate>;
  if (hasKpa) for (const key of ['systolic', 'diastolic'] as const) {
    if (anchors.some(anchor => anchor.field === key)) fields[key] = uncertain('mixed-scale');
  }
  return { modality: 'photo', capturedAtMs: observation.capturedAtMs, fields };
}

export function parseOcr(value: unknown): OcrObservation {
  if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'ocr'
    || !('coordinateSpace' in value) || value.coordinateSpace !== 'upright-frame'
    || !('capturedAtMs' in value) || typeof value.capturedAtMs !== 'number'
    || !Number.isFinite(value.capturedAtMs) || value.capturedAtMs < 0
    || !Number.isFinite(new Date(value.capturedAtMs).getTime())
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
    if (x + width > 1.000001 || y + height > 1.000001) throw new Error('malformed-output');
    tokens.push({ text: item.text, confidence: item.confidence, box: { x, y, width, height } });
  }
  return { kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: value.capturedAtMs, tokens };
}
