// LABORATÓRIO — porte em TypeScript puro da etapa de decodificação do H-seg (tools/lab-fotografia/hseg.py).
// Candidata comparativa: NÃO é importada pelo produto e não habilita nada. Sem I/O, sem DOM, sem
// dependências. Entrada: LCD já retificado (o recorte viria do guia de enquadramento), em tons de cinza.

export type DeviceTemplate = 'gtech' | 'generic';
export type Field = 'systolic' | 'diastolic' | 'pulse';
export type FieldResult = { status: 'candidate'; value: number } | { status: 'uncertain'; reason: string };
export interface GrayImage { width: number; height: number; data: Uint8Array }
type Box = readonly [x: number, y: number, w: number, h: number];

const FIELDS: readonly Field[] = ['systolic', 'diastolic', 'pulse'];
/** [início e fim do centro vertical, altura mínima do dígito, x mínimo], em frações do LCD retificado. */
const TEMPLATES: Record<DeviceTemplate, Record<Field, readonly [number, number, number, number]>> = {
  gtech: { systolic: [0, 0.39, 0.2, 0.25], diastolic: [0.39, 0.755, 0.2, 0.25], pulse: [0.755, 1, 0.13, 0.55] },
  generic: { systolic: [0.11, 0.43, 0.18, 0.3], diastolic: [0.43, 0.755, 0.18, 0.3], pulse: [0.755, 1, 0.12, 0.5] },
};
const PATTERNS: Readonly<Record<string, number>> = {
  abcdef: 0, bc: 1, abdeg: 2, abcdg: 3, bcfg: 4, acdfg: 5, acdefg: 6, cdefg: 6,
  abc: 7, abcf: 7, abcdefg: 8, abcdfg: 9, abcfg: 9,
};

/** Máximo (dilatação) ou mínimo (erosão) em janela retangular separável; fora da imagem é ignorado. */
function rankFilter(src: Float32Array | Uint8Array, width: number, height: number, kx: number, ky: number, max: boolean) {
  const pick = max ? Math.max : Math.min;
  const tmp = new Float32Array(width * height), out = new Float32Array(width * height);
  const rx = kx >> 1, ry = ky >> 1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let v = src[y * width + x];
    for (let d = Math.max(0, x - rx); d <= Math.min(width - 1, x + rx); d++) v = pick(v, src[y * width + d]);
    tmp[y * width + x] = v;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let v = tmp[y * width + x];
    for (let d = Math.max(0, y - ry); d <= Math.min(height - 1, y + ry); d++) v = pick(v, tmp[d * width + x]);
    out[y * width + x] = v;
  }
  return out;
}

function gaussianBlur(src: Float32Array, width: number, height: number, size: number) {
  const sigma = 0.3 * ((size - 1) * 0.5 - 1) + 0.8; // mesma regra do OpenCV para sigma = 0
  const r = size >> 1, kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) { kernel[i] = Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)); sum += kernel[i]; }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  const reflect = (i: number, n: number) => { while (i < 0 || i >= n) i = i < 0 ? -i : 2 * n - 2 - i; return i; };
  const tmp = new Float32Array(width * height), out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let v = 0;
    for (let k = 0; k < size; k++) v += kernel[k] * src[y * width + reflect(x + k - r, width)];
    tmp[y * width + x] = v;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let v = 0;
    for (let k = 0; k < size; k++) v += kernel[k] * tmp[reflect(y + k - r, height) * width + x];
    out[y * width + x] = v;
  }
  return out;
}

function otsu(values: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of values) hist[v]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, weightB = 0, best = -1, threshold = 0;
  for (let i = 0; i < 256; i++) {
    weightB += hist[i];
    const weightF = values.length - weightB;
    if (!weightB || !weightF) continue;
    sumB += i * hist[i];
    const between = weightB * weightF * (sumB / weightB - (sum - sumB) / weightF) ** 2;
    if (between > best) { best = between; threshold = i; }
  }
  return threshold;
}

/** Normaliza a iluminação, binariza (1 = segmento escuro), limpa bordas e endireita a inclinação. */
export function binarize(image: GrayImage): Uint8Array {
  const { width, height, data } = image;
  const background = gaussianBlur(rankFilter(rankFilter(data, width, height, 41, 41, true), width, height, 41, 41, false),
    width, height, 31);
  const normalized = new Uint8Array(width * height);
  for (let i = 0; i < normalized.length; i++) {
    normalized[i] = Math.floor(Math.min(1, Math.max(0, data[i] / Math.max(background[i], 1))) * 255);
  }
  const threshold = otsu(normalized);
  const fg = new Uint8Array(width * height);
  const margin = Math.floor(0.02 * width);
  for (let y = margin; y < height - margin; y++) for (let x = margin; x < width - margin; x++) {
    fg[y * width + x] = normalized[y * width + x] <= threshold ? 1 : 0; // só > limiar é claro (Otsu)
  }
  const opened = rankFilter(rankFilter(fg, width, height, 3, 3, false), width, height, 3, 3, true);
  return deskew(Uint8Array.from(opened), width, height);
}

function shear(fg: Uint8Array, width: number, height: number, s: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.round(x - s * y + (s * height) / 2);
    if (sx >= 0 && sx < width) out[y * width + x] = fg[y * width + sx];
  }
  return out;
}

/** Cisalhamento que maximiza a nitidez da projeção das colunas (dígitos itálicos ficam verticais). */
export function deskew(fg: Uint8Array, width: number, height: number): Uint8Array {
  let bestScore = -1, bestShear = 0;
  for (let i = 0; i <= 30; i++) {
    const s = -0.3 + 0.02 * i, sheared = shear(fg, width, height, s), columns = new Float64Array(width);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) columns[x] += sheared[y * width + x];
    let score = 0;
    for (const c of columns) score += c * c;
    if (score > bestScore) { bestScore = score; bestShear = s; }
  }
  return shear(fg, width, height, bestShear);
}

function components(fg: Uint8Array, width: number, height: number): Box[] {
  const label = new Int32Array(width * height), boxes: Box[] = [];
  const stack: number[] = [];
  let next = 0;
  for (let start = 0; start < fg.length; start++) {
    if (!fg[start] || label[start]) continue;
    next++;
    let x0 = width, y0 = height, x1 = -1, y1 = -1, area = 0;
    stack.push(start); label[start] = next;
    while (stack.length) {
      const p = stack.pop() as number, px = p % width, py = (p - px) / width;
      area++; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy, q = ny * width + nx;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && fg[q] && !label[q]) { label[q] = next; stack.push(q); }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (area < 0.0004 * width * height) continue; // ruído
    if ((w > 0.5 * width && h < 0.06 * height) || (h > 0.5 * height && w < 0.06 * width)) continue; // moldura
    if (w < 0.04 * width && (x0 <= 0.03 * width || x0 + w >= 0.97 * width)) continue; // traço na borda
    boxes.push([x0, y0, w, h]);
  }
  return boxes;
}

/** Une pedaços que se sobrepõem em x (o "1" e o "7" do BSPII chegam partidos). */
function group(parts: Box[]): Box[] {
  const groups: Box[] = [];
  for (const c of [...parts].sort((a, b) => a[0] - b[0])) {
    const index = groups.findIndex(g => Math.min(g[0] + g[2], c[0] + c[2]) - Math.max(g[0], c[0]) >= 0.3 * Math.min(g[2], c[2]));
    if (index < 0) { groups.push(c); continue; }
    const g = groups[index];
    const x0 = Math.min(g[0], c[0]), y0 = Math.min(g[1], c[1]);
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
    if (!on && start >= 0) { if (i - start >= 2) out.push([start, i]); start = -1; }
  }
  return out;
}

/** Segmentos acesos por varredura; null se as três linhas de algum teste discordarem. */
export function segments(cell: Uint8Array, w: number, h: number): string | null {
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
  for (const [rows, left, right] of [[[0.2, 0.27, 0.34], 'f', 'b'], [[0.66, 0.73, 0.8], 'e', 'c']] as const) {
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

function digit(fg: Uint8Array, width: number, box: Box, fieldHeight: number): number | string {
  const [x, y, w, h] = box;
  const cell = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) cell.set(fg.subarray((y + r) * width + x, (y + r) * width + x + w), r * w);
  if (h < 0.85 * fieldHeight) return 'baixo';
  if (w / h < 0.35) {
    const covered = (from: number, to: number) => {
      let n = 0;
      for (let r = Math.floor(from * h); r < Math.floor(to * h); r++) if (cell.subarray(r * w, r * w + w).some(v => v > 0)) n++;
      return n / (Math.floor(to * h) - Math.floor(from * h));
    };
    return covered(0.1, 0.4) > 0.9 && covered(0.6, 0.9) > 0.9 ? 1 : 'estreito';
  }
  if (w / h > 0.8) return 'largo';
  const lit = segments(cell, w, h);
  if (lit === null) return 'varredura';
  return lit in PATTERNS ? PATTERNS[lit] : 'padrao';
}

/** Lê os três campos de um LCD retificado. Campos duvidosos ficam incertos, nunca completados. */
export function decodeLcd(image: GrayImage, device: DeviceTemplate): Record<Field, FieldResult> {
  const { width, height } = image;
  const fg = binarize(image);
  const parts = components(fg, width, height);
  const result = {} as Record<Field, FieldResult>;
  for (const field of FIELDS) {
    const [y0, y1, minHeight, minX] = TEMPLATES[device][field];
    let band = parts.filter(c => y0 <= (c[1] + c[3] / 2) / height && (c[1] + c[3] / 2) / height < y1 && c[0] >= minX * width);
    const tall = band.filter(c => c[3] >= 0.08 * height);
    if (tall.length) {
      const top = Math.min(...tall.map(c => c[1])), bottom = Math.max(...tall.map(c => c[1] + c[3])), m = 0.02 * height;
      band = band.filter(c => top - m <= c[1] + c[3] / 2 && c[1] + c[3] / 2 <= bottom + m);
    }
    const groups = group(band);
    const digits = groups.filter(g => g[3] >= minHeight * height);
    if (groups.some(g => !digits.includes(g) && (g[3] >= 0.08 * height || g[2] >= 0.06 * width))) {
      result[field] = { status: 'uncertain', reason: 'tinta-nao-explicada' }; continue;
    }
    if (digits.length < 2 || digits.length > 3) {
      result[field] = { status: 'uncertain', reason: `${digits.length}-digitos` }; continue;
    }
    const fieldHeight = Math.max(...digits.map(g => g[3]));
    const values: number[] = [];
    let failure = '';
    for (const box of digits) {
      const value = digit(fg, width, box, fieldHeight);
      if (typeof value === 'string') { failure = value; break; }
      values.push(value);
    }
    if (failure || values[0] === 0) { result[field] = { status: 'uncertain', reason: failure || 'zero-a-esquerda' }; continue; }
    result[field] = { status: 'candidate', value: Number(values.join('')) };
  }
  return result;
}
