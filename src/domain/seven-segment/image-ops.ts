// CANDIDATO, NÃO HABILITADO — aguarda decisão da orientadora (P02/P106/P048). Ver README.md.
// Operações de imagem puras (sem I/O, DOM ou dependências) usadas pelo decodificador de sete segmentos.
// Espelham as chamadas OpenCV da referência Python em tools/lab-fotografia/hseg_v2.py.

/** Imagem em tons de cinza, linha a linha, 1 byte por pixel. */
export interface GrayImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** Caixa [x, y, largura, altura] em pixels. */
export type Box = readonly [number, number, number, number];

/** Máximo (dilatação) ou mínimo (erosão) em janela retangular separável; fora da imagem é ignorado. */
export function rankFilter(src: ArrayLike<number>, width: number, height: number, kx: number, ky: number,
  max: boolean): Float32Array {
  const pick = max ? Math.max : Math.min;
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  const rx = kx >> 1;
  const ry = ky >> 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = src[y * width + x];
      for (let d = Math.max(0, x - rx); d <= Math.min(width - 1, x + rx); d++) v = pick(v, src[y * width + d]);
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = tmp[y * width + x];
      for (let d = Math.max(0, y - ry); d <= Math.min(height - 1, y + ry); d++) v = pick(v, tmp[d * width + x]);
      out[y * width + x] = v;
    }
  }
  return out;
}

/** Desfoque gaussiano separável com o sigma padrão do OpenCV e borda refletida (BORDER_REFLECT_101). */
export function gaussianBlur(src: Float32Array, width: number, height: number, size: number): Float32Array {
  const sigma = 0.3 * ((size - 1) * 0.5 - 1) + 0.8;
  const r = size >> 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    kernel[i] = Math.exp(-((i - r) ** 2) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  const reflect = (i: number, n: number) => {
    let j = i;
    while (j < 0 || j >= n) j = j < 0 ? -j : 2 * n - 2 - j;
    return j;
  };
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = 0; k < size; k++) v += kernel[k] * src[y * width + reflect(x + k - r, width)];
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = 0; k < size; k++) v += kernel[k] * tmp[reflect(y + k - r, height) * width + x];
      out[y * width + x] = v;
    }
  }
  return out;
}

/** Limiar de Otsu (o valor devolvido pertence à classe escura, como no THRESH_BINARY). */
export function otsu(values: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of values) hist[v]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let weightB = 0;
  let best = -1;
  let threshold = 0;
  for (let i = 0; i < 256; i++) {
    weightB += hist[i];
    const weightF = values.length - weightB;
    if (!weightB || !weightF) continue;
    sumB += i * hist[i];
    const between = weightB * weightF * (sumB / weightB - (sum - sumB) / weightF) ** 2;
    if (between > best) {
      best = between;
      threshold = i;
    }
  }
  return threshold;
}

/** Cisalhamento horizontal em torno do centro vertical (vizinho mais próximo); fora da imagem = `fill`. */
export function shear(src: Uint8Array, width: number, height: number, s: number, fill = 0): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.round(x - s * y + (s * height) / 2);
      out[y * width + x] = sx >= 0 && sx < width ? src[y * width + sx] : fill;
    }
  }
  return out;
}

/** Componentes conexos (vizinhança 8) de uma máscara 0/1: caixa e área. */
export function connectedComponents(mask: Uint8Array, width: number, height: number): { box: Box; area: number }[] {
  const label = new Uint8Array(width * height);
  const out: { box: Box; area: number }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;
    let area = 0;
    stack.push(start);
    label[start] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      const px = p % width;
      const py = (p - px) / width;
      area++;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          const q = ny * width + nx;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && mask[q] && !label[q]) {
            label[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    out.push({ box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], area });
  }
  return out;
}
