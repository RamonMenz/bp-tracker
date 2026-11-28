// CANDIDATO, NÃO HABILITADO — aguarda decisão da orientadora (P02/P106/P048). Ver README.md.
// Porte em TypeScript puro do H-seg v2 (referência: tools/lab-fotografia/hseg_v2.py; saída idêntica
// verificada nas 20 fotos de ajuste). Lê os três campos de um LCD de sete segmentos JÁ RETIFICADO
// (o recorte viria do guia de enquadramento) por lógica pura: sem I/O, sem rede, sem dependências.
// Na dúvida, o campo fica incerto: nunca completa, troca ou escolhe valores.
import type { CandidateSet, ClinicalField } from '@/domain/assisted-entry';

import { type Box, connectedComponents, gaussianBlur, type GrayImage, otsu, rankFilter, shear } from './image-ops';

export type { GrayImage } from './image-ops';
export type SevenSegmentDevice = 'gtech' | 'generic';
export type SevenSegmentField =
  | { readonly status: 'candidate'; readonly value: number }
  | { readonly status: 'uncertain'; readonly reason: string };

const FIELDS: readonly ClinicalField[] = ['systolic', 'diastolic', 'pulse'];

interface FieldTemplate {
  /** Início e fim do centro vertical dos componentes do campo (fração da altura do LCD). */
  readonly band: readonly [number, number];
  /** Altura mínima de um dígito e x mínimo (frações da altura e da largura). */
  readonly minHeight: number;
  readonly minX: number;
  /** Altura esperada do dígito, medida nas fotos de ajuste; limita o vão vertical do campo. */
  readonly digitHeight: number;
}

/** Gabarito EXPLÍCITO por modelo. Um aparelho novo exige gabarito novo; desconhecido não é lido. */
export const SEVEN_SEGMENT_TEMPLATES: Readonly<Record<SevenSegmentDevice, Readonly<Record<ClinicalField, FieldTemplate>>>> = {
  // G-Tech BSPII: rótulos SIS/DIA/PULSO na carcaça à direita; relógio e data embaixo à esquerda.
  gtech: {
    systolic: { band: [0, 0.39], minHeight: 0.2, minX: 0.25, digitHeight: 0.31 },
    diastolic: { band: [0.39, 0.755], minHeight: 0.2, minX: 0.25, digitHeight: 0.31 },
    pulse: { band: [0.755, 1], minHeight: 0.13, minX: 0.55, digitHeight: 0.21 },
  },
  // Aparelho genérico de braço das fotos de laboratório: relógio no topo; SYS/DIA/PUL à direita.
  generic: {
    systolic: { band: [0.11, 0.43], minHeight: 0.18, minX: 0.3, digitHeight: 0.26 },
    diastolic: { band: [0.43, 0.755], minHeight: 0.18, minX: 0.3, digitHeight: 0.26 },
    pulse: { band: [0.755, 1], minHeight: 0.12, minX: 0.5, digitHeight: 0.2 },
  },
};

const PATTERNS: Readonly<Record<string, number>> = {
  abcdef: 0, bc: 1, abdeg: 2, abcdg: 3, bcfg: 4, acdfg: 5, acdefg: 6, cdefg: 6,
  abc: 7, abcf: 7, abcdefg: 8, abcdfg: 9, abcfg: 9,
};

function bestShear(fg: Uint8Array, width: number, height: number): number {
  let bestScore = -1;
  let best = 0;
  for (let i = 0; i <= 30; i++) {
    const s = -0.3 + 0.02 * i;
    const sheared = shear(fg, width, height, s);
    const columns = new Float64Array(width);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) columns[x] += sheared[y * width + x];
    let score = 0;
    for (const c of columns) score += c * c;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

/** Normaliza a iluminação, binariza (1 = segmento escuro), limpa bordas e endireita a inclinação. */
export function binarizeLcd(image: GrayImage): { mask: Uint8Array; shear: number } {
  const { width, height, data } = image;
  const closed = rankFilter(rankFilter(data, width, height, 41, 41, true), width, height, 41, 41, false);
  const background = gaussianBlur(closed, width, height, 31);
  const normalized = new Uint8Array(width * height);
  for (let i = 0; i < normalized.length; i++) {
    normalized[i] = Math.floor(Math.min(1, Math.max(0, data[i] / Math.max(background[i], 1))) * 255);
  }
  const threshold = otsu(normalized);
  const fg = new Uint8Array(width * height);
  const margin = Math.floor(0.02 * width);
  for (let y = margin; y < height - margin; y++) {
    for (let x = margin; x < width - margin; x++) fg[y * width + x] = normalized[y * width + x] <= threshold ? 1 : 0;
  }
  const opened = Uint8Array.from(rankFilter(rankFilter(fg, width, height, 3, 3, false), width, height, 3, 3, true));
  const s = bestShear(opened, width, height);
  return { mask: shear(opened, width, height, s), shear: s };
}

function components(fg: Uint8Array, width: number, height: number): Box[] {
  return connectedComponents(fg, width, height).flatMap(({ box: [x, y, w, h], area }) => {
    if (area < 0.0004 * width * height) return []; // ruído
    if ((w > 0.5 * width && h < 0.06 * height) || (h > 0.5 * height && w < 0.06 * width)) return []; // moldura
    if (w < 0.04 * width && (x <= 0.03 * width || x + w >= 0.97 * width)) return []; // traço na borda
    return [[x, y, w, h] as Box];
  });
}

/** Une pedaços que se sobrepõem em x (o "1" e o "7" do BSPII chegam partidos). */
function group(parts: Box[]): Box[] {
  const groups: Box[] = [];
  for (const c of [...parts].sort((a, b) => a[0] - b[0])) {
    const index = groups.findIndex(g => Math.min(g[0] + g[2], c[0] + c[2]) - Math.max(g[0], c[0]) >= 0.3 * Math.min(g[2], c[2]));
    if (index < 0) {
      groups.push(c);
      continue;
    }
    const g = groups[index];
    const x0 = Math.min(g[0], c[0]);
    const y0 = Math.min(g[1], c[1]);
    groups[index] = [x0, y0, Math.max(g[0] + g[2], c[0] + c[2]) - x0, Math.max(g[1] + g[3], c[1] + c[3]) - y0];
  }
  return groups.sort((a, b) => a[0] - b[0]);
}

function runs(line: ArrayLike<number>): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= line.length; i++) {
    const on = i < line.length && line[i] > 0;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      if (i - start >= 2) out.push([start, i]);
      start = -1;
    }
  }
  return out;
}

/** Segmentos acesos por varredura de linhas; null se as três linhas de algum teste discordarem. */
function segments(cell: Uint8Array, w: number, h: number): string | null {
  const column = (x: number) => Array.from({ length: h }, (_, y) => cell[y * w + x]);
  const row = (y: number) => cell.subarray(y * w, y * w + w);
  const vertical: string[] = [];
  for (const fx of [0.46, 0.5, 0.54]) {
    const lit = new Set<string>();
    for (const [a, b] of runs(column(Math.floor(fx * w)))) {
      const center = (a + b) / 2 / h;
      if (b - a > 0.3 * h) return null;
      if (center < 0.22) lit.add('a');
      else if (center > 0.36 && center < 0.64) lit.add('g');
      else if (center > 0.78) lit.add('d');
      else return null;
    }
    vertical.push([...lit].sort().join(''));
  }
  if (new Set(vertical).size !== 1) return null;
  const all = new Set(vertical[0]);
  const tests: [readonly number[], string, string][] = [[[0.2, 0.27, 0.34], 'f', 'b'], [[0.66, 0.73, 0.8], 'e', 'c']];
  for (const [rows, left, right] of tests) {
    const found: string[] = [];
    for (const fy of rows) {
      const lit = new Set<string>();
      for (const [a, b] of runs(row(Math.floor(fy * h)))) {
        if (b - a > 0.45 * w) return null;
        const center = (a + b) / 2 / w;
        if (center < 0.4) lit.add(left);
        else if (center > 0.6) lit.add(right);
        else return null;
      }
      found.push([...lit].sort().join(''));
    }
    if (new Set(found).size !== 1) return null;
    for (const s of found[0]) all.add(s);
  }
  return [...all].sort().join('');
}

function crop(image: Uint8Array, width: number, [x, y, w, h]: Box): Uint8Array {
  const cell = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) cell.set(image.subarray((y + r) * width + x, (y + r) * width + x + w), r * w);
  return cell;
}

function digit(fg: Uint8Array, width: number, box: Box, fieldHeight: number): number | string {
  const [, , w, h] = box;
  const cell = crop(fg, width, box);
  if (h < 0.85 * fieldHeight) return 'baixo';
  if (w / h < 0.35) {
    const covered = (from: number, to: number) => {
      const start = Math.floor(from * h);
      const end = Math.floor(to * h);
      let n = 0;
      for (let r = start; r < end; r++) if (cell.subarray(r * w, r * w + w).some(v => v > 0)) n++;
      return n / (end - start);
    };
    return covered(0.1, 0.4) > 0.9 && covered(0.6, 0.9) > 0.9 ? 1 : 'estreito';
  }
  if (w / h > 0.8) return 'largo';
  const lit = segments(cell, w, h);
  if (lit === null) return 'varredura';
  return lit in PATTERNS ? PATTERNS[lit] : 'padrao';
}

/** Posição da centena (um passo à esquerda) saturada (≥ 250) ou escura (≤ 15) em mais de 25%. */
function hundredsOccluded(gray: Uint8Array, width: number, first: Box, second: Box): boolean {
  const step = second[0] + second[2] - (first[0] + first[2]);
  const x1 = first[0] + first[2] - step;
  const x0 = Math.max(0, x1 - first[2]);
  if (x1 <= x0) return false;
  let hidden = 0;
  for (let y = first[1]; y < first[1] + first[3]; y++) {
    for (let x = x0; x < x1; x++) {
      const v = gray[y * width + x];
      if (v >= 250 || v <= 15) hidden++;
    }
  }
  return hidden / ((x1 - x0) * first[3]) > 0.25;
}

/**
 * Um "1" com uma barra horizontal fora dos dígitos aceitos, terminando na sua borda direita e logo acima
 * do topo, pode ser um "7" cuja barra "a" (componente separado no BSPII) ficou de fora: perder só essa
 * barra é a única perda de um segmento que troca o valor (7 → 1). Achado com o modelo trocado.
 */
function sevenBarNearby(parts: Box[], digits: Box[], box: Box, fieldHeight: number): boolean {
  const right = box[0] + box[2];
  const top = box[1];
  const inside = (c: Box) => digits.some(g => c[0] >= g[0] && c[1] >= g[1] && c[0] + c[2] <= g[0] + g[2] && c[1] + c[3] <= g[1] + g[3]);
  return parts.some(c => !inside(c) && c[2] >= 0.25 * fieldHeight && c[2] >= 2 * c[3]
    && Math.abs(c[0] + c[2] - right) <= 0.2 * fieldHeight
    && top - 0.15 * fieldHeight <= c[1] + c[3] && c[1] + c[3] <= top + 0.12 * fieldHeight);
}

/** Lê os três campos de um LCD retificado do modelo indicado. */
export function decodeSevenSegment(image: GrayImage, device: SevenSegmentDevice): Record<ClinicalField, SevenSegmentField> {
  const { width, height } = image;
  const { mask: fg, shear: s } = binarizeLcd(image);
  const grayUpright = shear(image.data, width, height, s, 128);
  const parts = components(fg, width, height);
  const result = {} as Record<ClinicalField, SevenSegmentField>;
  const uncertain = (reason: string): SevenSegmentField => ({ status: 'uncertain', reason });
  let anyDigit = false;
  for (const field of FIELDS) {
    const { band: [y0, y1], minHeight, minX, digitHeight } = SEVEN_SEGMENT_TEMPLATES[device][field];
    const center = (c: Box) => (c[1] + c[3] / 2) / height;
    let band = parts.filter(c => y0 <= center(c) && center(c) < y1 && c[0] >= minX * width);
    const tall = band.filter(c => c[3] >= 0.08 * height);
    if (tall.length) {
      const top = Math.min(...tall.map(c => c[1]));
      const bottom = Math.max(...tall.map(c => c[1] + c[3]));
      const margin = 0.02 * height;
      const expected = digitHeight * height;
      let low = top;
      let high = bottom;
      if (bottom - top < 0.8 * expected) { // dígito fragmentado: estende até a altura esperada
        low = Math.min(top, bottom - expected);
        high = Math.max(bottom, top + expected);
      }
      band = band.filter(c => low - margin <= c[1] + c[3] / 2 && c[1] + c[3] / 2 <= high + margin);
    }
    const groups = group(band);
    const digits = groups.filter(g => g[3] >= minHeight * height);
    anyDigit ||= digits.length > 0;
    if (groups.some(g => !digits.includes(g) && (g[3] >= 0.08 * height || g[2] >= 0.06 * width))) {
      result[field] = uncertain('tinta-nao-explicada');
      continue;
    }
    if (digits.length < 2 || digits.length > 3) {
      result[field] = uncertain(`${digits.length}-digitos`);
      continue;
    }
    if (!digits.every((g, i) => i === 0 || g[0] >= digits[i - 1][0] + digits[i - 1][2])) {
      result[field] = uncertain('incoerente');
      continue;
    }
    if (digits.length === 2 && hundredsOccluded(grayUpright, width, digits[0], digits[1])) {
      result[field] = uncertain('centena-encoberta');
      continue;
    }
    const fieldHeight = Math.max(...digits.map(g => g[3]));
    const values: number[] = [];
    let failure = '';
    for (const box of digits) {
      const value = digit(fg, width, box, fieldHeight);
      if (typeof value === 'string') {
        failure = value;
        break;
      }
      values.push(value);
    }
    if (failure || values[0] === 0) {
      result[field] = uncertain(failure || 'zero-a-esquerda');
      continue;
    }
    if (digits.some((box, i) => values[i] === 1 && sevenBarNearby(parts, digits, box, fieldHeight))) {
      result[field] = uncertain('um-ou-sete');
      continue;
    }
    result[field] = { status: 'candidate', value: Number(values.join('')) };
  }
  if (!anyDigit) for (const field of FIELDS) result[field] = uncertain('visor-sem-digitos');
  return result;
}

/**
 * Converte para o contrato de candidatos da revisão: valor → candidato por layout; dúvida → ilegível
 * (campo vazio para o usuário preencher). Não confirma nem persiste nada.
 */
export function toCandidateSet(fields: Record<ClinicalField, SevenSegmentField>, capturedAtMs: number): CandidateSet {
  const convert = (field: SevenSegmentField) => field.status === 'candidate'
    ? { status: 'candidate' as const, value: field.value, basis: 'layout' as const }
    : { status: 'uncertain' as const, reason: 'unreadable' as const };
  return {
    modality: 'photo',
    capturedAtMs,
    fields: { systolic: convert(fields.systolic), diastolic: convert(fields.diastolic), pulse: convert(fields.pulse) },
  };
}
